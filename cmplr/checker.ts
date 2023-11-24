import { Message, Pos } from "./info.ts";
import { AssignType, ParsedExpr, UnaryType } from "./parser.ts";
import { Option } from "./utils.ts";

export type CheckedExpr =
    & (
        | { type: "error" }
        | { type: "blank" }
        | { type: "id"; id: number }
        | { type: "int"; value: number }
        | { type: "char"; value: string }
        | { type: "string"; value: string }
        | { type: "arrayInitializer"; value: CheckedExpr; repeats: CheckedExpr }
        | { type: "block"; statements: CheckedExpr[] }
        | {
            type: "if";
            condition: CheckedExpr;
            truthy: CheckedExpr;
            falsy: Option<CheckedExpr>;
        }
        | { type: "call"; subject: CheckedExpr; args: CheckedExpr[] }
        | { type: "index"; subject: CheckedExpr; value: CheckedExpr }
        | {
            type: "unary";
            unaryType: UnaryType;
            subject: CheckedExpr;
        }
        | {
            type: "binary";
            binaryType: BinaryType;
            left: CheckedExpr;
            right: CheckedExpr;
        }
        | {
            type: "assign";
            assignType: AssignType;
            subject: CheckedExpr;
            value: CheckedExpr;
        }
        | {
            type: "let";
            param: CheckedParam;
            value: CheckedExpr;
        }
        | { type: "break" }
        | { type: "continue" }
        | {
            type: "loop";
            body: CheckedExpr;
        }
        | {
            type: "fn";
            id: string;
            params: CheckedParam[];
            returnType: CheckedType;
            body: CheckedExpr;
        }
        | { type: "return"; value: Option<CheckedExpr> }
    )
    & {
        pos: Pos;
        checkedType: CheckedType;
        constEval: boolean;
    };

export type CheckedParam = {
    id: string;
    mutable: boolean;
    checkedType: CheckedType;
    pos: Pos;
};

export type CheckedType =
    & (
        | { type: "error" }
        | { type: "unit" | "i32" | "u32" | "bool" | "char" | "str" }
        | { type: "array"; valueType: CheckedType; length: CheckedExpr }
        | {
            type: "fn";
            id: number;
            params: CheckedParam[];
            returnType: CheckedType;
        }
    )
    & { pos: Pos };

const errorExpr = (pos: Pos): CheckedExpr => ({
    type: "error",
    checkedType: errorType(pos),
    constEval: false,
    pos,
});
const errorType = (pos: Pos): CheckedType => ({ type: "error", pos });

type Sym = {
    type: "fn";
    checkedType: CheckedType;
} | {
    type: "static";
    checkedType: CheckedType;
};

type SymTable = { [id: string]: Sym };

class Checker {
    private symbols: SymTable = {};

    public constructor(private messages: Message[]) {}

    public checkFile(stmts: ParsedExpr[]): CheckedExpr[] {
        return stmts.map((stmt) => {
            if (stmt.type === "fn") {
                return this.checkFn(stmt);
            }
            if (stmt.type === "let") {
                return this.checkLet(stmt);
            }
            if (stmt.type === "error") {
                return errorExpr(stmt.pos);
            }
            this.panic(`impossible`);
        });
    }

    private checkFn(stmt: ParsedExpr): CheckedExpr {
    }

    private checkStatement(stmt: ParsedExpr): CheckedExpr {}

    private checkLet(stmt: ParsedExpr): CheckedExpr {}

    private panic(message: string, pos?: Pos): never {
        throw new Error(
            `panic in checker: ${message}${
                pos ? `, on line ${pos.line} col ${pos.col}` : ``
            }`,
        );
    }

    private error(message: string, pos: Pos) {
        this.messages.push({
            severity: "error",
            source: "parser",
            message,
            pos,
        });
    }
}
