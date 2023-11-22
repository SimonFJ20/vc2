async function main() {
    const options = parseArgOptions(Deno.args);
    if (options.printHelp) {
        console.log(helpMessage);
        return;
    }
    if (options.printVersion) {
        console.log(versionMessage);
        return;
    }
    const text = await Deno.readTextFile(options.inputFile);
    const parser = new Parser(text);
    const lines = [...iterate(parser)];
    if (options.printAst) {
        console.log(lines);
    }
    const assembler = new Assembler();
    assembler.assemble(lines);
    const result = assembler.finish();
    if (options.printResult) {
        for (let i = 0; i < result.length; ++i) {
            console.log(
                `${leftPad(i.toString(16), 2, "0")} ${
                    leftPad(i.toString(10), 3, " ")
                }      ${leftPad(result[i].toString(16), 2, "0")} ${
                    leftPad(result[i].toString(10), 3, " ")
                } ${leftPad(result[i].toString(2), 8, "0")}`,
            );
        }
    }
    if (options.outputFile.ok) {
        await Deno.writeFile(options.outputFile.value, result);
    }
}

type ArgOptions = {
    printHelp: boolean;
    printVersion: boolean;
    inputFile: string;
    outputFile: Option<string>;
    printAst: boolean;
    printResult: boolean;
};

const helpMessage = `
asmblr [options] <filename>
options:
    -h,--help       print help
    -v,--version    print version
    -o <filename>   specify output file
    --print-ast     print result of parsing
    --print-result  print result of assembling
`.trim();

const versionMessage = `
asmbler WIP
assembler for vc2
`.trim();

function parseArgOptions(args: string[]): ArgOptions {
    let printHelp = false;
    let printVersion = false;
    let inputFile = None<string>();
    let outputFile = None<string>();
    let printAst = false;
    let printResult = false;

    let i = 0;
    while (i < args.length) {
        if (!args[i].startsWith("-")) {
            if (inputFile.ok) {
                console.error("error: multiple input files");
                Deno.exit(1);
            }
            inputFile = Some(args[i]);
        } else if (args[i] == "-o") {
            i += 1;
            if (i >= args.length || args[i].startsWith("-")) {
                console.error(`error: expected output file after "-o"`);
                Deno.exit(1);
            }
            outputFile = Some(args[i]);
        } else if (contains(args[i], ["-h", "--help"])) {
            printHelp = true;
        } else if (contains(args[i], ["-v", "--version"])) {
            printVersion = true;
        } else if (args[i] == "--print-ast") {
            printAst = true;
        } else if (args[i] == "--print-result") {
            printResult = true;
        } else {
            console.error(`error: unrecognized argument "${args[i]}"`);
            Deno.exit(1);
        }
        i += 1;
    }

    if (!inputFile.ok) {
        console.error("error: no input file");
        Deno.exit(1);
    }

    return {
        printHelp,
        printVersion,
        inputFile: inputFile.value,
        outputFile,
        printAst,
        printResult,
    };
}

function leftPad(value: string, minLength: number, replacer = " "): string {
    while (value.length < minLength) {
        value = replacer + value;
    }
    return value;
}

type Operand = {
    type: "reg";
    register: "r0" | "r1" | "fl" | "pc";
} | {
    type: "imm";
    value: number;
} | {
    type: "address";
    value: Operand;
} | {
    type: "unresolved";
    symbol: string;
};

type UnresolvedSymbol = {
    symbol: string;
    superLabel: Option<string>;
    expr: ParsedExpr;
    instructionAddress: number;
    operandAddress: number;
    lineNumber: number;
};

type DataSelector =
    & {
        selector: number;
        registerSelector: number;
    }
    & (
        | { type: "reg" }
        | (
            & { type: "imm"; value: number }
            & ({ unresolved: false } | { unresolved: true; symbol: string })
        )
    );

class Assembler {
    private result: number[] = [];
    private address = 0;
    private symbols = new Map<string, number>();
    private superLabel = None<string>();
    private currentLineNumber = 0;
    private unresolvedSymbols: UnresolvedSymbol[] = [];

    public assemble(lines: ParsedLine[]) {
        for (const line of lines) {
            this.currentLineNumber = line.lineNumber;
            if (line.label) {
                const result = this.assembleLabel(line.label);
                if (!result.ok) {
                    throw new Error(
                        `panic on line ${line.lineNumber}: ${result.error}`,
                    );
                }
            }
            if (line.instruction) {
                const result = this.assembleInstruction(line.instruction);
                if (!result.ok) {
                    throw new Error(
                        `panic on line ${line.lineNumber}: ${result.error}`,
                    );
                }
            }
        }
    }

    public finish(): Uint8Array {
        this.resolveUnresolved();
        const result = new Uint8Array(this.result.length);
        result.set(this.result);
        return result;
    }

    private resolveUnresolved() {
        for (const symbol of this.unresolvedSymbols) {
            this.superLabel = symbol.superLabel;
            const result = this.evaluateOperand(symbol.expr);
            if (!result.ok) {
                throw new Error(
                    `panic on line ${symbol.lineNumber}: ${result.error}`,
                );
            }
            if (result.value.type === "unresolved") {
                throw new Error(
                    `panic on line ${symbol.lineNumber}: unresolved symbol "${symbol.symbol}"`,
                );
            }
            if (result.value.type !== "imm") {
                throw new Error("unreachable " + result.value.type);
            }
            this.insert32(symbol.operandAddress);
        }
    }

    private assembleLabel(label: string): Result<void, string> {
        const fullLabel = ((): Result<string, string> => {
            if (label.startsWith(".")) {
                if (!this.superLabel.ok) {
                    return Err(
                        `use of sub-label before super-label, "${label}"`,
                    );
                }
                return Ok(`${this.superLabel.value}${label}`);
            } else {
                this.superLabel = Some(label);
                return Ok(label);
            }
        })();
        if (!fullLabel.ok) {
            return Err(fullLabel.error);
        }
        if (this.symbols.has(fullLabel.value)) {
            return Err(`redefinition of label "${label}"`);
        }
        this.symbols.set(fullLabel.value, this.address);
        return Ok(undefined);
    }

    private assembleInstruction(
        instruction: ParsedInstruction,
    ): Result<void, string> {
        const instructionAddress = this.address;
        const opcodeResult = this.operatorOpcode(instruction.operator);
        if (opcodeResult.ok) {
            this.emit8(opcodeResult.value);
            if (contains(instruction.operator, ["nop", "hlt"])) {
                if (instruction.operands.length === 0) {
                    return Ok(undefined);
                }
            }
            if (
                instruction.operator === "mov" ||
                contains(instruction.operator, Assembler.arithmeticOperators)
            ) {
                if (instruction.operands.length !== 2) {
                    return Err(
                        `malformed '${instruction.operator}' instruction`,
                    );
                }
                const destOperand = this.evaluateOperand(
                    instruction.operands[0],
                );
                if (!destOperand.ok) {
                    return Err(destOperand.error);
                }
                const sourceOperand = this.evaluateOperand(
                    instruction.operands[1],
                );
                if (!sourceOperand.ok) {
                    return Err(sourceOperand.error);
                }
                if (
                    destOperand.value.type === "imm" ||
                    (destOperand.value.type === "address" &&
                        sourceOperand.value.type === "address")
                ) {
                    return Err(
                        `malformed '${instruction.operator}' instruction`,
                    );
                }
                const destSelector = this.dataSelector(
                    destOperand.value,
                );
                const sourceSelector = this.dataSelector(
                    sourceOperand.value,
                );
                this.emit8(
                    destSelector.selector << 6 |
                        sourceSelector.selector << 4 |
                        destSelector.registerSelector << 2 |
                        sourceSelector.registerSelector,
                );
                this.emitSelector(
                    destSelector,
                    instruction.operands[0],
                    instructionAddress,
                );
                this.emitSelector(
                    sourceSelector,
                    instruction.operands[1],
                    instructionAddress,
                );
                return Ok(undefined);
            }
            if (instruction.operator === "not") {
                if (instruction.operands.length !== 1) {
                    return Err(
                        `malformed '${instruction.operator}' instruction`,
                    );
                }
                const destOperand = this.evaluateOperand(
                    instruction.operands[0],
                );
                if (!destOperand.ok) {
                    return Err(destOperand.error);
                }
                if (destOperand.value.type === "imm") {
                    return Err(
                        `malformed '${instruction.operator}' instruction`,
                    );
                }
                const selector = this.dataSelector(destOperand.value);
                this.emit8(
                    selector.selector << 6 |
                        selector.registerSelector << 2,
                );
                this.emitSelector(
                    selector,
                    instruction.operands[0],
                    instructionAddress,
                );
                return Ok(undefined);
            }
            if (contains(instruction.operator, ["jmp"])) {
                if (instruction.operands.length !== 1) {
                    return Err(
                        `malformed '${instruction.operator}' instruction`,
                    );
                }
                const targetOperand = this.evaluateOperand(
                    instruction.operands[0],
                );
                if (!targetOperand.ok) {
                    return Err(targetOperand.error);
                }
                const targetSelector = this.dataSelector(
                    targetOperand.value,
                );
                this.emit8(
                    targetSelector.selector << 6 |
                        targetSelector.registerSelector << 2 |,
                );
                this.emitSelector(
                    targetSelector,
                    instruction.operands[0],
                    instructionAddress,
                );
                return Ok(undefined);
            }
            if (contains(instruction.operator, ["jz", "jnz"])) {
                if (instruction.operands.length !== 2) {
                    return Err(
                        `malformed '${instruction.operator}' instruction`,
                    );
                }
                const targetOperand = this.evaluateOperand(
                    instruction.operands[0],
                );
                if (!targetOperand.ok) {
                    return Err(targetOperand.error);
                }
                const sourceOperand = this.evaluateOperand(
                    instruction.operands[1],
                );
                if (!sourceOperand.ok) {
                    return Err(sourceOperand.error);
                }
                if (
                    (targetOperand.value.type === "address" &&
                        sourceOperand.value.type === "address")
                ) {
                    return Err(
                        `malformed '${instruction.operator}' instruction`,
                    );
                }
                const targetSelector = this.dataSelector(
                    targetOperand.value,
                );
                const sourceSelector = this.dataSelector(
                    sourceOperand.value,
                );
                this.emit8(
                    targetSelector.selector << 6 |
                        sourceSelector.selector << 4 |
                        targetSelector.registerSelector << 2 |
                        sourceSelector.registerSelector,
                );
                this.emitSelector(
                    targetSelector,
                    instruction.operands[0],
                    instructionAddress,
                );
                this.emitSelector(
                    sourceSelector,
                    instruction.operands[1],
                    instructionAddress,
                );
                return Ok(undefined);
            }
            return Err(`malformed '${instruction.operator}' instruction`);
        }
        if (instruction.operator == "db") {
            for (const operandExpr of instruction.operands) {
                const operand = this.evaluateOperand(operandExpr);
                if (!operand.ok) {
                    return Err(operand.error);
                }
                if (operand.value.type !== "imm") {
                    return Err("malformed 'dw' instruction");
                }
                const selector = this.dataSelector(operand.value);
                this.emitSelector(selector, operandExpr, instructionAddress);
            }
            return Ok(undefined);
        }
        if (instruction.operator == "dw") {
            for (const operandExpr of instruction.operands) {
                const operand = this.evaluateOperand(operandExpr);
                if (!operand.ok) {
                    return Err(operand.error);
                }
                if (operand.value.type !== "imm") {
                    return Err("malformed 'dw' instruction");
                }
                const selector = this.dataSelector(operand.value);
                this.emitSelector(selector, operandExpr, instructionAddress);
            }
            return Ok(undefined);
        }
        return Err(
            `unsupported instruction/directive "${instruction.operator}"`,
        );
    }

    private emitSelector(
        selector: DataSelector,
        operandExpr: ParsedExpr,
        instructionAddress: number,
    ) {
        if (selector.type !== "imm") {
            return;
        }
        if (selector.unresolved) {
            this.unresolvedSymbols.push({
                symbol: selector.symbol,
                superLabel: this.superLabel,
                instructionAddress,
                operandAddress: this.address,
                expr: operandExpr,
                lineNumber: this.currentLineNumber,
            });
        }
        this.emit32(selector.value);
    }

    private operatorOpcode(operator: string): Option<number> {
        return operator in Assembler.opcodeMap
            ? Some(
                Assembler
                    .opcodeMap[operator as keyof typeof Assembler.opcodeMap],
            )
            : None();
    }

    private dataSelector(operand: Operand): DataSelector {
        if (operand.type === "address") {
            const inner = this.dataSelector(operand.value);
            return { ...inner, selector: inner.selector | 0b10 };
        }
        if (operand.type === "reg") {
            return {
                selector: 0b0,
                type: "reg",
                registerSelector: Assembler.registerMap[operand.register],
            };
        }
        if (operand.type === "imm") {
            return {
                selector: 0b1,
                type: "imm",
                value: operand.value,
                unresolved: false,
                registerSelector: 0,
            };
        }
        if (operand.type === "unresolved") {
            return {
                selector: 0b1,
                type: "imm",
                value: 0xffffffff,
                unresolved: true,
                symbol: operand.symbol,
                registerSelector: 0,
            };
        }
        throw new Error("unreachable");
    }

    private evaluateOperand(expr: ParsedExpr): Result<Operand, string> {
        switch (expr.type) {
            case "id": {
                if (contains(expr.value, ["r0", "r1", "fl", "pc"])) {
                    return Ok({
                        type: "reg",
                        register: expr
                            .value as (Operand & { type: "register" })[
                                "register"
                            ],
                    });
                }
                const fullSymbolResult = ((): Result<string, string> => {
                    if (expr.value.startsWith(".")) {
                        if (!this.superLabel.ok) {
                            return Err(
                                `use of sub-label before super-label, "${expr.value}"`,
                            );
                        }
                        return Ok(`${this.superLabel.value}${expr.value}`);
                    }
                    return Ok(expr.value);
                })();
                if (!fullSymbolResult.ok) {
                    return Err(fullSymbolResult.error);
                }
                const symbol = fullSymbolResult.value;
                if (!this.symbols.has(symbol)) {
                    return Ok({ type: "unresolved", symbol });
                }
                return Ok({
                    type: "imm",
                    value: this.symbols.get(symbol)!,
                });
            }
            case "int":
                return Ok({ type: "imm", value: expr.value });
            case "address":
                return mapResult(this.evaluateOperand(expr.value), (value) => {
                    return Ok({ type: "address", value });
                });
            case "neg":
            case "not":
                return mapResult(this.evaluateOperand(expr.value), (value) => {
                    if (value.type === "unresolved") {
                        return Ok(value);
                    }
                    if (value.type !== "imm") {
                        return Err(
                            `invalid operand in '${expr.type}' operation, expected immediate`,
                        );
                    }
                    return Ok({
                        type: "imm",
                        value: (() => {
                            switch (expr.type) {
                                case "not":
                                    return ~value.value;
                                case "neg":
                                    return -value.value;
                            }
                        })(),
                    });
                });
            case "or":
            case "xor":
            case "and":
            case "shl":
            case "shr":
            case "add":
            case "sub":
            case "mul":
            case "div":
            case "rem":
                return mapResult(
                    this.evaluateOperand(expr.left),
                    (left) =>
                        mapResult(
                            this.evaluateOperand(expr.right),
                            (right) => {
                                if (left.type === "unresolved") {
                                    return Ok(left);
                                }
                                if (left.type !== "imm") {
                                    return Err(
                                        `invalid left operand in '${expr.type}' operation, expected immediate`,
                                    );
                                }
                                if (right.type === "unresolved") {
                                    return Ok(right);
                                }
                                if (right.type !== "imm") {
                                    return Err(
                                        `invalid right operand in '${expr.type}' operation, expected immediate`,
                                    );
                                }
                                return Ok({
                                    type: "imm",
                                    value: ((left, right) => {
                                        switch (expr.type) {
                                            case "or":
                                                return left | right;
                                            case "xor":
                                                return left ^ right;
                                            case "and":
                                                return left & right;
                                            case "shl":
                                                return left << right;
                                            case "shr":
                                                return left >> right;
                                            case "add":
                                                return left + right;
                                            case "sub":
                                                return left - right;
                                            case "mul":
                                                return left * right;
                                            case "div":
                                                return left / right;
                                            case "rem":
                                                return left % right;
                                        }
                                    })(left.value, right.value),
                                });
                            },
                        ),
                );
        }
    }

    private insert32(address: number, value: number) {
        this.result[address] = value >> 24 & 0xff;
        this.result[address + 1] = value >> 16 & 0xff;
        this.result[address + 2] = value >> 8 & 0xff;
        this.result[address + 3] = value & 0xff;
    }

    private emit32(value: number) {
        this.emit8(value >> 24 & 0xff);
        this.emit8(value >> 16 & 0xff);
        this.emit8(value >> 8 & 0xff);
        this.emit8(value & 0xff);
    }

    private emit8(value: number) {
        this.result.push(value);
        this.address += 1;
    }

    private static readonly registerMap = {
        "r0": 0b00,
        "r1": 0b01,
        "fl": 0b10,
        "pc": 0b11,
    } as const;
    private static readonly opcodeMap = {
        "nop": 0x00,
        "hlt": 0x01,
        "mov": 0x02,
        "or": 0x03,
        "and": 0x04,
        "xor": 0x05,
        "not": 0x06,
        "shl": 0x07,
        "shr": 0x08,
        "add": 0x09,
        "sub": 0x0a,
        "mul": 0x0b,
        "imul": 0x0c,
        "div": 0x0d,
        "idiv": 0x0e,
        "rem": 0x0f,
        "cmp": 0x10,
        "jmp": 0x11,
        "jz": 0x12,
        "jnz": 0x13,
    } as const;
    private static readonly arithmeticOperators = [
        "or",
        "and",
        "xor",
        "shl",
        "shr",
        "add",
        "sub",
        "mul",
        "imul",
        "div",
        "idiv",
        "rem",
        "cmp",
    ] as const;
}

type ParsedLine = {
    label?: string;
    instruction?: ParsedInstruction;
    lineNumber: number;
};

type ParsedInstruction = {
    operator: string;
    operands: ParsedExpr[];
};

type ParsedExpr = {
    type: "id";
    value: string;
} | {
    type: "int";
    value: number;
} | {
    type: "address";
    value: ParsedExpr;
} | {
    type: "neg" | "not";
    value: ParsedExpr;
} | {
    type: ParsedExprBinaryType;
    left: ParsedExpr;
    right: ParsedExpr;
};
type ParsedExprBinaryType =
    | "or"
    | "xor"
    | "and"
    | "shl"
    | "shr"
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "rem";

class Parser implements Iter<ParsedLine> {
    private index = 0;
    private line = 1;

    public constructor(private text: string) {}

    public next(): Option<ParsedLine> {
        this.skipNewlinesAndWhitespace();
        if (this.done()) {
            return None();
        }
        return Some(this.parseLine());
    }

    private parseLine(): ParsedLine {
        if (this.currentMatches(/[\.a-zA-Z_]/)) {
            let value = this.current();
            this.step();
            while (this.currentMatches(/[\.a-zA-Z0-9_]/)) {
                value += this.current();
                this.step();
            }
            if (this.currentIs(":")) {
                this.step();
                this.skipWhitespace();
                if (this.currentIn("\r\n")) {
                    return { label: value, lineNumber: this.line };
                }
                return {
                    label: value,
                    instruction: this.parseInstruction(),
                    lineNumber: this.line,
                };
            }
            return {
                instruction: this.parseInstruction(value),
                lineNumber: this.line,
            };
        } else {
            this.panic("expected label or instruction");
        }
    }

    private parseInstruction(operator = ""): ParsedInstruction {
        if (operator === "") {
            if (!this.currentMatches(/[a-zA-Z_]/)) {
                this.panic("expected instruction operator");
            }
            while (this.currentMatches(/[a-zA-Z_0-9]/)) {
                operator += this.current();
                this.step();
            }
        }
        const operands: ParsedExpr[] = [];
        if (!this.done() && !this.currentIn(";\r\n")) {
            this.skipWhitespace();
            operands.push(this.parseOperand());
            this.skipWhitespace();
            while (this.currentIs(",")) {
                this.step();
                this.skipWhitespace();
                operands.push(this.parseOperand());
            }
        }
        return { operator, operands };
    }

    private parseOperand(): ParsedExpr {
        if (this.currentIs("[")) {
            this.step();
            this.skipWhitespace();
            const value = this.parseExpr();
            if (!this.currentIs("]")) {
                this.panic("expected ']'");
            }
            this.step();
            return { type: "address", value };
        }
        return this.parseExpr();
    }

    private parseExpr(): ParsedExpr {
        return this.parseOr();
    }

    private parseOr(): ParsedExpr {
        return this.parseLeftistBinaryExpr(() => this.parseXor(), {
            "|": "or",
        });
    }

    private parseXor(): ParsedExpr {
        return this.parseLeftistBinaryExpr(() => this.parseAnd(), {
            "^": "xor",
        });
    }

    private parseAnd(): ParsedExpr {
        return this.parseLeftistBinaryExpr(() => this.parseShift(), {
            "&": "and",
        });
    }

    private parseShift(): ParsedExpr {
        return this.parseLeftistBinaryExpr(() => this.parseTerm(), {
            "<<": "shl",
            ">>": "shr",
        });
    }

    private parseTerm(): ParsedExpr {
        return this.parseLeftistBinaryExpr(() => this.parseFactor(), {
            "+": "add",
            "-": "sub",
        });
    }

    private parseFactor(): ParsedExpr {
        return this.parseLeftistBinaryExpr(() => this.parseUnary(), {
            "*": "mul",
            "/": "div",
            "%": "rem",
        });
    }

    private parseLeftistBinaryExpr(
        parseNext: () => ParsedExpr,
        rules: { [key: string]: ParsedExprBinaryType },
    ): ParsedExpr {
        let left = parseNext();
        while (!this.done() && !this.currentIn("\r\n;")) {
            this.skipWhitespace();
            for (const rule in rules) {
                if (this.text.slice(this.index).startsWith(rule)) {
                    this.step();
                    this.skipWhitespace();
                    const right = parseNext();
                    left = {
                        type: rules[rule],
                        left,
                        right,
                    };
                    continue;
                }
            }
            break;
        }
        return left;
    }

    private parseUnary(): ParsedExpr {
        if (this.currentIs("-")) {
            this.step();
            this.skipWhitespace();
            const value = this.parseUnary();
            return { type: "neg", value };
        }
        if (this.currentIs("~")) {
            this.step();
            this.skipWhitespace();
            const value = this.parseUnary();
            return { type: "not", value };
        }
        return this.parseValue();
    }

    private parseValue(): ParsedExpr {
        if (this.currentMatches(/[a-zA-Z_\.]/)) {
            let value = "";
            while (this.currentMatches(/[a-zA-Z0-9_\.]/)) {
                value += this.current();
                this.step();
            }
            return { type: "id", value };
        }
        if (this.currentMatches(/[1-9]/)) {
            let value = "";
            while (this.currentMatches(/[0-9_]/)) {
                value += this.current();
                this.step();
            }
            value = value.replaceAll("_", "");
            if (value === "") {
                this.panic("malformed literal");
            }
            return { type: "int", value: parseInt(value, 10) };
        }
        if (this.currentIs("0")) {
            this.step();
            if (this.currentIs("b")) {
                this.step();
                let value = "";
                while (this.currentIn("01_")) {
                    value += this.current();
                    this.step();
                }
                value = value.replaceAll("_", "");
                if (value === "") {
                    this.panic("malformed literal");
                }
                return { type: "int", value: parseInt(value, 2) };
            }
            if (this.currentIs("x")) {
                this.step();
                let value = "";
                while (this.currentMatches(/[0-9a-zA-Z_]/)) {
                    value += this.current();
                    this.step();
                }
                value = value.replaceAll("_", "");
                if (value === "") {
                    this.panic("malformed literal");
                }
                return { type: "int", value: parseInt(value, 16) };
            }
            return { type: "int", value: 0 };
        }
        if (this.currentIs("(")) {
            this.step();
            this.skipWhitespace();
            const value = this.parseExpr();
            if (!this.currentIs(")")) {
                this.panic("expected ')'");
            }
            this.step();
            return value;
        }
        this.panic(`expected value, got '${this.current()}'`);
    }

    private skipWhitespace() {
        while (this.currentMatches(/[ \t]/)) {
            this.step();
        }
    }

    private skipNewlinesAndWhitespace() {
        while (this.currentMatches(/[ \t\r\n;]/)) {
            if (this.currentIs(";")) {
                this.step();
                while (!this.done() && this.current() != "\n") {
                    this.step();
                }
            }
            this.step();
        }
    }

    private step() {
        if (this.currentIs("\n")) {
            this.line += 1;
        }
        this.index += 1;
    }

    private currentMatches(pattern: RegExp): boolean {
        return !this.done() && pattern.test(this.current());
    }

    private currentIn(value: string): boolean {
        for (const char of value) {
            if (this.currentIs(char)) {
                return true;
            }
        }
        return false;
    }

    private currentIs(value: string): boolean {
        return !this.done() && this.current() == value;
    }

    private current(): string {
        return this.text[this.index];
    }

    private done(): boolean {
        return this.index >= this.text.length;
    }

    private panic(message = "smthng wrng"): never {
        throw new Error(
            `panic on line ${this.line}: ${message}`,
        );
    }
}

type Option<T> = { ok: true; value: T } | { ok: false };
const Some = <T>(value: T): Option<T> => ({ ok: true, value });
const None = <T>(): Option<T> => ({ ok: false });
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
const Ok = <T, E>(value: T): Result<T, E> => ({ ok: true, value });
const Err = <T, E>(error: E): Result<T, E> => ({ ok: false, error });

const mapResult = <T, E, N>(
    result: Result<T, E>,
    functor: (value: T) => Result<N, E>,
): Result<N, E> => {
    return result.ok ? functor(result.value) : result;
};

interface Iter<T> {
    next(): Option<T>;
}

function iterate<T>(iterator: Iter<T>) {
    return {
        [Symbol.iterator](): Iterator<T> {
            let value = None<T>();
            return {
                next(): IteratorResult<T> {
                    value = iterator.next();
                    if (value.ok) {
                        return { value: value.value };
                    } else {
                        return { value: undefined, done: true };
                    }
                },
            };
        },
    };
}

function contains<T>(v: T, vs: readonly T[]): boolean {
    for (const c of vs) {
        if (c === v) {
            return true;
        }
    }
    return false;
}

main().catch((error) => console.error(error.message));
