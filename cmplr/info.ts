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
