// Generated file by ast_generator
export type IntExpr = {
    kind: "Int";
    [0]: Int;
};
export const IntExpr = (v0: Int): IntExpr => ({ kind: "Int", [0]: v0 });
export type StringExpr = {
    kind: "String";
    [0]: String;
};
export const StringExpr = (v0: String): StringExpr => ({ kind: "String", [0]: v0 });
export type Expr = IntExpr | StringExpr;
export type Int = {
    [0]: string;
    pos: Pos;
};
export const Int = (v0: string, pos: Pos): Int => ({ [0]: v0, pos });
export type String = {
    [0]: string;
    pos: Pos;
};
export const String = (v0: string, pos: Pos): String => ({ [0]: v0, pos });
export type Name = {
    [0]: string;
    pos: Pos;
};
export const Name = (v0: string, pos: Pos): Name => ({ [0]: v0, pos });
export type Pos = {
    line: number;
    col: number;
};
export const Pos = (line: number, col: number): Pos => ({ line, col });

