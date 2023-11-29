export type Pos = {
    index: number;
    line: number;
    col: number;
};

export type Message = {
    severity: "error" | "warning" | "note";
    source: "none" | "lexer" | "parser" | "checker";
    message: string;
    pos: Pos;
};

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

export type Expr =
    & (
        | { type: "error" }
        | { type: "blank" }
        | { type: "id"; id: number }
        | { type: "int"; value: number }
        | { type: "char"; value: string }
        | { type: "string"; value: string }
        | { type: "arrayInitializer"; value: Expr; repeats: Expr }
        | { type: "block"; statements: Expr[] }
        | {
            type: "if";
            condition: Expr;
            truthy: Expr;
            falsy?: Expr;
        }
        | { type: "call"; subject: Expr; args: Expr[] }
        | { type: "index"; subject: Expr; value: Expr }
        | {
            type: "unary";
            unaryType: UnaryType;
            subject: Expr;
        }
        | {
            type: "binary";
            binaryType: BinaryType;
            left: Expr;
            right: Expr;
        }
        | {
            type: "assign";
            assignType: AssignType;
            subject: Expr;
            value: Expr;
        }
        | {
            type: "let";
            param: Param;
            value: Expr;
        }
        | { type: "break" }
        | { type: "continue" }
        | {
            type: "loop";
            body: Expr;
        }
        | {
            type: "fn";
            id: string;
            params: Param[];
            returnType: Type;
            body: Expr;
        }
        | { type: "return"; value?: Expr }
    )
    & {
        pos: Pos;
        valueType: Type;
        constEval: boolean;
    };

export type Param = {
    id: string;
    mutable: boolean;
    valueType?: Type;
    pos: Pos;
};

export type Type =
    & (
        | { type: "error" }
        | { type: "blank" }
        | { type: "unit" | "int" | "i32" | "u32" | "bool" | "char" | "str" }
        | { type: "array"; valueType: Type; length: Expr }
        | {
            type: "fn";
            id: number;
            params: Param[];
            returnType: Type;
        }
    )
    & { pos: Pos };
