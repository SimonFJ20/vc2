type Option<T> = { ok: true; value: T } | { ok: false };
const Some = <T>(value: T): Option<T> => ({ ok: true, value });
const None = <T>(): Option<T> => ({ ok: false });
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
const Ok = <T, E>(value: T): Result<T, E> => ({ ok: true, value });
const Err = <T, E>(error: E): Result<T, E> => ({ ok: false, error });

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

type ParsedInstruction = {
    operator: string;
    operands: ParsedExpr[];
};

type ParsedLine = {
    label?: string;
    instruction?: ParsedInstruction;
    lineNumber: number;
};

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
                console.log(this.currentIs("\n"));
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

    private parseExpr(): ParsedExpr {
        return this.parseOr();
    }

    private parseOr(): ParsedExpr {
        return this.parseLeftistBinaryExpr(this.parseXor, { "|": "or" });
    }

    private parseXor(): ParsedExpr {
        return this.parseLeftistBinaryExpr(this.parseAnd, { "^": "xor" });
    }

    private parseAnd(): ParsedExpr {
        return this.parseLeftistBinaryExpr(this.parseShift, { "&": "and" });
    }

    private parseShift(): ParsedExpr {
        return this.parseLeftistBinaryExpr(this.parseTerm, {
            "<<": "shl",
            ">>": "shr",
        });
    }

    private parseTerm(): ParsedExpr {
        return this.parseLeftistBinaryExpr(this.parseFactor, {
            "+": "add",
            "-": "sub",
        });
    }

    private parseFactor(): ParsedExpr {
        return this.parseLeftistBinaryExpr(this.parseUnary, {
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
        return this.parseOperand();
    }

    private parseOperand(): ParsedExpr {
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

function findSymbols(lines: ParsedLine[]): Map<string, number> {
    const symbols = new Map<string, number>();
    let currentGlobalLabel = None<string>();
    for (const line of lines) {
        if (line.label) {
            let label = line.label!;
            if (!line.label.startsWith(".")) {
                currentGlobalLabel = label;
            } else {
                if (!currentGlobalLabel.ok) {
                    throw new Error(
                        `panic on line ${line.lineNumber}: sub-label before global label`,
                    );
                }
                label = `${currentGlobalLabel.value}${label}`;
            }
            if (symbols.has(label)) {
                throw new Error(
                    `panic on line ${line.lineNumber}: redefinition of label "${line.label}"`,
                );
            }
            symbols;
        }
    }
}

async function main() {
    const text = await Deno.readTextFile(Deno.args[0]);
    const parser = new Parser(text);
    const lines = [...iterate(parser)];
    console.log(lines);
}

main();

