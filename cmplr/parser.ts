import { Err, None, Ok, Option, range, Result, Some } from "./utils.ts";
import { Message, Pos } from "./info.ts";

export type TokenType =
    | "eof"
    | "error"
    | "id"
    | "int"
    | "hex"
    | "binary"
    | "char"
    | "string"
    | "fn"
    | "return"
    | "let"
    | "mut"
    | "if"
    | "else"
    | "loop"
    | "continue"
    | "break"
    | "and"
    | "or"
    | "false"
    | "true"
    | "_"
    | "."
    | ","
    | ":"
    | ";"
    | "("
    | ")"
    | "{"
    | "}"
    | "["
    | "]"
    | "!"
    | "+"
    | "-"
    | "*"
    | "/"
    | "%"
    | "<"
    | ">"
    | "&"
    | "|"
    | "^"
    | "="
    | "<="
    | ">="
    | "<<"
    | ">>"
    | "=="
    | "!="
    | "+="
    | "-="
    | "*="
    | "/="
    | "%="
    | "<<="
    | ">>="
    | "&="
    | "^="
    | "|="
    | "->";

export type Token = {
    type: TokenType;
    pos: Pos;
    length: number;
};

export class Lexer {
    private index = 0;
    private line = 1;
    private col = 1;
    public constructor(private text: string, private messages: Message[]) {}

    public next(): Token {
        const pos = this.pos();
        if (this.done()) {
            return this.token("eof", pos);
        }
        if (this.currentIn(" \t\r\n")) {
            while (this.currentIn(" \t\r\n")) {
                this.step();
            }
            return this.next();
        }
        if (this.currentMatchesSequence("//")) {
            while (!this.done() && !this.currentIs("\n")) {
                this.step();
            }
            return this.next();
        }
        if (this.currentMatchesSequence("/*")) {
            return this.skipMultilineComment();
        }
        if (this.currentMatches(/^[a-zA-Z_]/)) {
            this.step();
            if (!this.currentMatches(/^[a-zA-Z0-9_]/)) {
                return this.token("_", pos);
            }
            while (this.currentMatches(/^[a-zA-Z0-9_]/)) {
                this.step();
            }
            const value = this.text.slice(pos.index, this.index - pos.index);
            for (const key in Lexer.keywords) {
                if (value === Lexer.keywords[key]) {
                    return this.token(Lexer.keywords[key], pos);
                }
            }
            return this.token("id", pos);
        }
        if (this.currentIn("123456789")) {
            while (this.currentIn("1234567_890")) {
                this.step();
            }
            return this.token("int", pos);
        }
        if (this.currentIs("'")) {
            return this.makeChar();
        }
        if (this.currentIs('"')) {
            return this.makeString();
        }
        if (this.currentIs("0")) {
            return this.makeHexBinaryOrZero();
        }
        for (let i = 0; i < Lexer.staticTokens.length; ++i) {
            if (this.currentMatchesSequence(Lexer.staticTokens[i])) {
                for (const _ of range(Lexer.staticTokens[i].length)) {
                    this.step();
                }
                return this.token(Lexer.staticTokens[i], pos);
            }
        }
        this.error(
            `unrecognized character '${this.current()}' (0x${
                this.current().charCodeAt(0).toString(16)
            })`,
            pos,
        );
        this.step();
        return this.token("error", pos);
    }

    private skipMultilineComment(): Token {
        const pos = this.pos();
        this.step();
        this.step();
        let depth = 1;
        while (!this.done() && depth != 0) {
            if (this.currentMatchesSequence("*/")) {
                this.step();
                this.step();
                depth -= 1;
            } else if (this.currentMatchesSequence("/*")) {
                this.step();
                this.step();
                depth += 1;
            } else {
                this.step();
            }
        }
        if (depth != 0) {
            this.error("malformed multi-line comment", pos);
            return this.token("error", pos);
        }
        return this.next();
    }

    private makeChar(): Token {
        const pos = this.pos();
        this.step();
        if (this.currentIs("\\")) {
            this.step();
            if (this.done()) {
                this.error("malformed char escape sequence", pos);
                return this.token("error", pos);
            }
        }
        this.step();
        if (!this.currentIs("'")) {
            this.error("malformed char literal", pos);
            return this.token("error", pos);
        }
        this.step();
        return this.token("char", pos);
    }

    private makeString(): Token {
        const pos = this.pos();
        this.step();
        while (!this.done() && this.current() != '"') {
            if (this.currentIs("\\")) {
                this.step();
                if (this.done()) {
                    this.error("malformed string escape sequence", pos);
                    return this.token("error", pos);
                }
            }
            this.step();
        }
        if (!this.currentIs('"')) {
            this.error("malformed string literal", pos);
            return this.token("error", pos);
        }
        this.step();
        return this.token("char", pos);
    }

    private makeHexBinaryOrZero(): Token {
        const pos = this.pos();
        this.step();
        if (this.currentIs("x")) {
            this.step();
            if (!this.currentIn("1234567890abcdef")) {
                this.error("expected hex digit", pos);
                return this.token("error", pos);
            }
            while (this.currentIn("1234567890abcdef_")) {
                this.step();
            }
            return this.token("hex", pos);
        } else if (this.currentIs("b")) {
            this.step();
            if (!this.currentIn("01")) {
                this.error("expected binary digit", pos);
                return this.token("error", pos);
            }
            while (this.currentIn("01_")) {
                this.step();
            }
            return this.token("binary", pos);
        } else {
            return this.token("int", pos);
        }
    }

    private error(message: string, pos: Pos) {
        this.messages.push({
            severity: "error",
            source: "lexer",
            message,
            pos,
        });
    }
    private step() {
        if (this.done()) return;
        if (this.currentIs("\n")) {
            this.line += 1;
            this.col = 1;
        } else {
            this.col += 1;
        }
        this.index += 1;
    }
    private token(type: TokenType, pos: Pos): Token {
        return { type, pos, length: this.index - pos.index };
    }
    private pos(): Pos {
        return { index: this.index, line: this.line, col: this.col };
    }
    private done(): boolean {
        return this.index >= this.text.length;
    }
    private current(): string {
        return this.text[this.index];
    }
    private currentIs(value: string): boolean {
        return !this.done() && this.current() === value;
    }
    private currentIn(values: readonly string[] | string): boolean {
        for (const value of values) {
            if (this.currentIs(value)) {
                return true;
            }
        }
        return false;
    }
    private currentMatches(pattern: RegExp): boolean {
        return pattern.test(this.text.slice(this.index));
    }
    private currentMatchesSequence(sequence: string): boolean {
        return new RegExp("^" + sequence).test(this.text.slice(this.index));
    }
    private static readonly staticTokens = [
        "<=",
        ">=",
        "<<",
        ">>",
        "==",
        "!=",
        "+=",
        "-=",
        "*=",
        "/=",
        "%=",
        "<<=",
        ">>=",
        "&=",
        "^=",
        "|=",
        "->",
        "_",
        ".",
        ",",
        ":",
        ";",
        "(",
        ")",
        "{",
        "}",
        "[",
        "]",
        "!",
        "+",
        "-",
        "*",
        "/",
        "%",
        "<",
        ">",
        "&",
        "|",
        "^",
        "=",
    ] as const;
    private static readonly keywords = [
        "fn",
        "return",
        "let",
        "mut",
        "if",
        "else",
        "loop",
        "continue",
        "break",
        "and",
        "or",
        "false",
        "true",
    ] as const;
}

export type UnaryType = "-" | "*" | "!" | "&" | "&mut";

export type BinaryType =
    | "*"
    | "/"
    | "%"
    | "+"
    | "-"
    | "<<"
    | ">>"
    | "&"
    | "^"
    | "|"
    | "=="
    | "!="
    | "<"
    | ">"
    | "<="
    | ">="
    | "and"
    | "or"
    | "=";

export type AssignType =
    | "="
    | "+="
    | "-="
    | "*="
    | "/="
    | "%="
    | "<<="
    | ">>="
    | "&="
    | "^="
    | "|=";

export type ParsedExpr =
    & (
        | { type: "error" }
        | { type: "blank" }
        | { type: "id"; id: string }
        | { type: "int"; value: number }
        | { type: "char"; value: string }
        | { type: "string"; value: string }
        | { type: "arrayInitializer"; value: ParsedExpr; repeats: ParsedExpr }
        | { type: "block"; statements: ParsedExpr[] }
        | {
            type: "if";
            condition: ParsedExpr;
            truthy: ParsedExpr;
            falsy: Option<ParsedExpr>;
        }
        | { type: "call"; subject: ParsedExpr; args: ParsedExpr[] }
        | { type: "index"; subject: ParsedExpr; value: ParsedExpr }
        | {
            type: "unary";
            unaryType: UnaryType;
            subject: ParsedExpr;
        }
        | {
            type: "binary";
            binaryType: BinaryType;
            left: ParsedExpr;
            right: ParsedExpr;
        }
        | {
            type: "assign";
            assignType: AssignType;
            subject: ParsedExpr;
            value: ParsedExpr;
        }
        | {
            type: "let";
            param: ParsedParam;
            value: ParsedExpr;
        }
        | { type: "break" }
        | { type: "continue" }
        | {
            type: "loop";
            body: ParsedExpr;
        }
        | {
            type: "fn";
            id: string;
            params: ParsedParam[];
            returnType: ParsedType;
            body: ParsedExpr;
        }
        | { type: "return"; value: Option<ParsedExpr> }
    )
    & { pos: Pos };

export type ParsedParam = {
    id: string;
    mutable: boolean;
    valueType: Option<ParsedType>;
    pos: Pos;
};

export type ParsedType =
    & (
        | { type: "error" }
        | { type: "blank" }
        | { type: "id"; id: string }
        | { type: "array"; valueType: ParsedType; length: ParsedExpr }
    )
    & { pos: Pos };

export class Parser {
    private lexer: Lexer;
    private current: Token;

    public constructor(private text: string, private messages: Message[]) {
        this.lexer = new Lexer(text, messages);
        this.current = this.lexer.next();
    }

    public parseFile(): ParsedExpr[] {
        const statements: ParsedExpr[] = [];
        while (!this.done()) {
            if (this.currentIs("fn")) {
                statements.push(this.parseFn());
            } else if (this.currentIs("let")) {
                statements.push(this.parseLet());
            } else {
                this.error("expected 'fn' or 'let'");
                while (!this.done() && !this.currentIn(["fn", "let"])) {
                    this.step();
                }
            }
        }
        return statements;
    }

    private parseFn(): ParsedExpr {
        const pos = this.current.pos;
        this.step();
        if (!this.currentIs("id")) {
            this.error("expected id");
            return { type: "error", pos };
        }
        const id = this.tokenSlice();
        this.step();
        if (!this.currentIs("(")) {
            this.error(`expected '"("'`);
            return { type: "error", pos: this.current.pos };
        }
        this.step();
        const params: ParsedParam[] = [];
        if (!this.done() && !this.currentIs(")")) {
            const paramResult = this.parseParam();
            if (!paramResult.ok) {
                return { type: "error", pos: paramResult.error };
            }
            params.push(paramResult.value);
            while (!this.done() && this.currentIs(",")) {
                this.step();
                if (this.done() || this.currentIs(")")) {
                    break;
                }
                const paramResult = this.parseParam();
                if (!paramResult.ok) {
                    return { type: "error", pos: paramResult.error };
                }
                params.push(paramResult.value);
            }
        }
        if (!this.currentIs(")")) {
            this.error("expected '{'");
            return { type: "error", pos: this.current.pos };
        }
        this.step();
        if (!this.currentIs("->")) {
            this.error("expected '->'");
            return { type: "error", pos: this.current.pos };
        }
        this.step();
        const returnType = this.parseType();
        if (!this.currentIs("{")) {
            this.error("expected '{'");
            return { type: "error", pos: this.current.pos };
        }
        const body = this.parseBlock();
        return { type: "fn", id, params, returnType, body, pos };
    }

    private parseStatement(): ParsedExpr {
        if (this.currentIs("loop")) {
            return this.parseLoop();
        }
        if (this.currentIs("{")) {
            return this.parseBlock();
        }
        if (this.currentIs("if")) {
            return this.parseIf();
        }
        return this.parseTerminatedStatement();
    }

    private parseLoop(): ParsedExpr {
        const pos = this.current.pos;
        this.step();
        if (!this.currentIs("{")) {
            this.error("expeceted '{'");
            return { type: "error", pos: this.current.pos };
        }
        const body = this.parseBlock();
        return { type: "loop", body, pos };
    }

    private parseTerminatedStatement(): ParsedExpr {
        const statement = this.parseSingleLineStatement();
        if (!this.currentIs(";")) {
            this.error("expeceted ';'");
        } else {
            this.step();
        }
        return statement;
    }

    private parseSingleLineStatement(): ParsedExpr {
        const pos = this.current.pos;
        if (this.currentIs("break")) {
            this.step();
            return { type: "break", pos };
        }
        if (this.currentIs("continue")) {
            this.step();
            return { type: "continue", pos };
        }
        if (this.currentIs("return")) {
            return this.parseReturn();
        }
        if (this.currentIs("let")) {
            return this.parseLet();
        }
        return this.parseAssign();
    }

    private parseReturn(): ParsedExpr {
        const pos = this.current.pos;
        this.step();
        if (this.done() || this.currentIs(";")) {
            return { type: "return", value: None(), pos };
        }
        const value = this.parseExpr();
        return { type: "return", value: Some(value), pos };
    }

    private parseLet(): ParsedExpr {
        const pos = this.current.pos;
        this.step();
        const paramResult = this.parseParam();
        if (!paramResult.ok) {
            return { type: "error", pos: paramResult.error };
        }
        if (!this.currentIs("=")) {
            this.error(`expected '"="'`);
            return { type: "error", pos: this.current.pos };
        }
        this.step();
        const value = this.parseExpr();
        return { type: "let", param: paramResult.value, value, pos };
    }

    private parseParam(): Result<ParsedParam, Pos> {
        const pos = this.current.pos;
        let mutable = false;
        if (this.currentIs("mut")) {
            mutable = true;
            this.step();
        }
        if (!this.currentIs("id")) {
            this.error("expected id");
            return Err(pos);
        }
        const id = this.tokenSlice();
        this.step();
        let valueType = None<ParsedType>();
        if (this.currentIs(":")) {
            this.step();
            valueType = Some(this.parseType());
        }
        return Ok({ id, mutable, valueType, pos });
    }

    private parseAssign(): ParsedExpr {
        const pos = this.current.pos;
        const subject = this.parseExpr();
        if (
            this.currentIn([
                "=",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "<<=",
                ">>=",
                "&=",
                "^=",
                "|=",
            ])
        ) {
            const assignType = this.current.type as AssignType;
            this.step();
            const value = this.parseExpr();
            return { type: "assign", assignType, subject, value, pos };
        }
        return subject;
    }

    public parseExpr(): ParsedExpr {
        return this.parseLogOr();
    }

    private parseLogOr(): ParsedExpr {
        return this.parseBinaryOperation(["or"], this.parseLogAnd);
    }

    private parseLogAnd(): ParsedExpr {
        return this.parseBinaryOperation(["and"], this.parseEquality);
    }

    private parseEquality(): ParsedExpr {
        return this.parseBinaryOperation(["==", "!="], this.parseComparison);
    }

    private parseComparison(): ParsedExpr {
        const pos = this.current.pos;
        const left = this.parseBitOr();
        if (this.currentIn(["<", ">", "<=", ">="])) {
            const binaryType = this.current.type as BinaryType;
            this.step();
            const right = this.parseBitOr();
            return { type: "binary", binaryType, left, right, pos };
        }
        return left;
    }

    private parseBitOr(): ParsedExpr {
        return this.parseBinaryOperation(["|"], this.parseBitXor);
    }

    private parseBitXor(): ParsedExpr {
        return this.parseBinaryOperation(["^"], this.parseBitAnd);
    }

    private parseBitAnd(): ParsedExpr {
        return this.parseBinaryOperation(["&"], this.parseShift);
    }

    private parseShift(): ParsedExpr {
        return this.parseBinaryOperation(["<<", ">>"], this.parseTerm);
    }

    private parseTerm(): ParsedExpr {
        return this.parseBinaryOperation(["+", "-"], this.parseFactor);
    }

    private parseFactor(): ParsedExpr {
        return this.parseBinaryOperation(["*", "/", "%"], this.parseUnary);
    }

    private parseBinaryOperation(
        tokenTypes: readonly (TokenType & BinaryType)[],
        next: () => ParsedExpr,
    ): ParsedExpr {
        const pos = this.current.pos;
        let left = next();
        while (!this.done()) {
            if (this.currentIn(tokenTypes)) {
                const binaryType = this.current.type as BinaryType;
                this.step();
                const right = next();
                left = { type: "binary", binaryType, left, right, pos };
            }
        }
        return left;
    }

    private parseUnary(): ParsedExpr {
        const pos = this.current.pos;
        if (this.currentIn(["-", "*", "!", "&"])) {
            let unaryType = this.current.type as UnaryType;
            this.step();
            if (unaryType === "&" && this.currentIs("mut")) {
                this.step();
                unaryType = "&mut";
            }
            const subject = this.parseUnary();
            return { type: "unary", unaryType, subject, pos };
        }
        return this.parseCallIndex();
    }

    private parseCallIndex(): ParsedExpr {
        let subject = this.parseOperand();
        while (!this.done()) {
            const pos = this.current.pos;
            if (this.currentIs("(")) {
                this.step();
                const args: ParsedExpr[] = [];
                if (!this.done() && !this.currentIs(")")) {
                    args.push(this.parseExpr());
                    while (this.currentIs(",")) {
                        this.step();
                        if (this.done() || this.currentIs("(")) {
                            this.step();
                        }
                        args.push(this.parseExpr());
                    }
                }
                if (!this.currentIs(")")) {
                    this.error(`expected '")"'`);
                    return { type: "error", pos: this.current.pos };
                }
                this.step();
                subject = { type: "call", subject, args, pos };
            } else if (this.currentIs("[")) {
                this.step();
                const value = this.parseExpr();
                if (!this.currentIs("]")) {
                    this.error(`expected '"]"'`);
                    return { type: "error", pos: this.current.pos };
                }
                this.step();
                subject = { type: "index", subject, value, pos };
            } else {
                break;
            }
        }
        return subject;
    }

    private parseOperand(): ParsedExpr {
        const pos = this.current.pos;
        if (this.currentIs("_")) {
            this.step();
            return { type: "blank", pos };
        }
        if (this.currentIs("id")) {
            const id = this.tokenSlice();
            this.step();
            return { type: "id", id, pos };
        }
        if (this.currentIs("int")) {
            const value = parseInt(this.tokenSlice().replace(/_/g, ""), 10);
            this.step();
            return { type: "int", value, pos };
        }
        if (this.currentIs("hex")) {
            const value = parseInt(
                this.tokenSlice().slice(2).replace(/_/g, ""),
                16,
            );
            this.step();
            return { type: "int", value, pos };
        }
        if (this.currentIs("binary")) {
            const value = parseInt(
                this.tokenSlice().slice(2).replace(/_/g, ""),
                2,
            );
            this.step();
            return { type: "int", value, pos };
        }
        if (this.currentIs("char")) {
            this.error("char literal not yet supported", pos);
            this.step();
            return { type: "error", pos };
        }
        if (this.currentIs("string")) {
            this.error("string literal not yet supported", pos);
            this.step();
            return { type: "error", pos };
        }
        if (this.currentIs("(")) {
            this.step();
            const expr = this.parseExpr();
            if (!this.currentIs(")")) {
                this.error(`expected '")"'`);
                return { type: "error", pos: this.current.pos };
            }
            this.step();
            return expr;
        }
        if (this.currentIs("[")) {
            this.step();
            const value = this.parseExpr();
            if (!this.currentIs(";")) {
                this.error(`expected '";"'`);
                return { type: "error", pos: this.current.pos };
            }
            this.step();
            const repeats = this.parseExpr();
            if (!this.currentIs("]")) {
                this.error(`expected '"]"'`);
                return { type: "error", pos: this.current.pos };
            }
            this.step();
            return { type: "arrayInitializer", value, repeats, pos };
        }
        if (this.currentIs("{")) {
            return this.parseBlock();
        }
        if (this.currentIs("if")) {
            return this.parseIf();
        }
        this.error("expected value");
        return { type: "error", pos };
    }

    private parseBlock(): ParsedExpr {
        const pos = this.current.pos;
        this.step();
        const statements: ParsedExpr[] = [];
        while (!this.done() && !this.currentIs("}")) {
            statements.push(this.parseStatement());
        }
        if (!this.currentIs("}")) {
            this.error(`expected '"}"'`);
            return { type: "error", pos: this.current.pos };
        }
        this.step();
        return { type: "block", statements, pos };
    }

    private parseIf(): ParsedExpr {
        const pos = this.current.pos;
        this.step();
        const condition = this.parseExpr();
        if (!this.currentIs("{")) {
            this.error("expeceted '{'");
            return { type: "error", pos };
        }
        const truthy = this.parseBlock();
        if (this.done() || this.currentIs("else")) {
            return { type: "if", condition, truthy, falsy: None(), pos };
        }
        this.step();
        if (!this.currentIs("{")) {
            this.error("expeceted '{'");
            return { type: "error", pos };
        }
        const falsy = this.parseBlock();
        return { type: "if", condition, truthy, falsy: Some(falsy), pos };
    }

    private parseType(): ParsedType {
        const pos = this.current.pos;
        if (this.currentIs("_")) {
            this.step();
            return { type: "blank", pos };
        }
        if (this.currentIs("id")) {
            const id = this.tokenSlice();
            this.step();
            return { type: "id", id, pos };
        }
        if (this.currentIs("[")) {
            this.step();
            const valueType = this.parseType();
            if (!this.currentIs(";")) {
                this.error(`expected '";"'`);
                return { type: "error", pos: this.current.pos };
            }
            this.step();
            const length = this.parseExpr();
            if (!this.currentIs("]")) {
                this.error(`expected '"]"'`);
                return { type: "error", pos: this.current.pos };
            }
            this.step();
            return { type: "array", valueType, length, pos };
        }
        this.error("expected type", pos);
        return { type: "error", pos };
    }

    private error(message: string, pos: Pos = this.current.pos) {
        this.messages.push({
            severity: "error",
            source: "parser",
            message,
            pos,
        });
    }
    private step() {
        this.current = this.lexer.next();
    }
    private tokenSlice(token = this.current): string {
        return this.text.slice(token.pos.index, token.pos.index + token.length);
    }
    private done(): boolean {
        return this.current.type !== "eof";
    }
    private currentIs(type: TokenType): boolean {
        return this.current.type == type;
    }
    private currentIn(types: readonly TokenType[]): boolean {
        return types.some((type) => this.currentIs(type));
    }
}
