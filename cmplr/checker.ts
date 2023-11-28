import { Message, Pos } from "./info.ts";
import {
    AssignType,
    ParsedExpr,
    ParsedParam,
    ParsedType,
    UnaryType,
} from "./parser.ts";
import { assertExhausted, None, Option, Result, Some } from "./utils.ts";

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

type ParsedExprW<T extends ParsedExpr["type"]> =
    & { type: T }
    & ParsedExpr;

export type CheckedParam = {
    id: string;
    mutable: boolean;
    valueType: Option<CheckedType>;
    pos: Pos;
};

export type CheckedType =
    & (
        | { type: "error" }
        | { type: "blank" }
        | { type: "unit" | "int" | "i32" | "u32" | "bool" | "char" | "str" }
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

export type SymTable = {
    parent?: SymTable;
    symbols: { [id: string]: Sym };
};

export class Checker {
    private symTable: SymTable = { symbols: {} };

    public constructor(private messages: Message[]) {}

    public checkFile(exprs: ParsedExpr[]): CheckedExpr[] {
        return exprs.map((expr) => {
            if (expr.type === "fn") {
                return this.checkFn(expr);
            }
            if (expr.type === "let") {
                return this.checkLet(expr, this.symTable);
            }
            if (expr.type === "error") {
                return errorExpr(expr.pos);
            }
            this.panic(`impossible`);
        });
    }

    private checkFn(expr: ParsedExpr): CheckedExpr {
    }

    private checkLet(
        expr: ParsedExprW<"let">,
        symTable: SymTable,
    ): CheckedExpr {
        const param = this.checkParam(expr.param, symTable);
        const value = this.checkExpr(expr.value, symTable);
    }

    private checkParam(
        param: ParsedParam,
        symTable: SymTable,
    ): CheckedParam {
        if (param.id in symTable.symbols) {
            this.error("redefinition", param.pos);
        }
        let valueType = None<CheckedType>();
        if (param.valueType.ok) {
            valueType = Some(this.checkType(param.valueType.value, symTable));
        }
        return {
            id: param.id,
            valueType,
            mutable: param.mutable,
            pos: param.pos,
        };
    }

    private checkExpr(expr: ParsedExpr, symTable: SymTable): CheckedExpr {}

    private checkType(type: ParsedType, symTable: SymTable): CheckedType {
        const pos = type.pos;
        if (type.type === "error") {
            return errorType(pos);
        }
        if (type.type === "blank") {
            this.warning("type inference not implemented", pos);
            return { type: "blank", pos };
        }
        if (type.type === "id") {
            //"unit" | "i32" | "u32" | "bool" | "char" | "str"
            if (
                ["unit", "i32", "u32", "bool", "char", "str"]
                    .includes(type.id)
            ) {
                return {
                    type: type.id as (CheckedType & { type: "id" })["id"],
                    pos,
                };
            }
            this.error("user defined types not implemented", pos);
            return { type: "error", pos };
        }
        if (type.type === "array") {
            const valueType = this.checkType(type.valueType, symTable);
            const length = this.checkExpr(type.length, symTable);
            if (!length.constEval) {
                this.error("length must be const", pos);
                return { type: "error", pos };
            }
            return { type: "array", valueType, length, pos };
        }
        assertExhausted(type);
    }

    private assertCompatible(
        a: CheckedType,
        b: CheckedType,
        symTable: SymTable,
        switched = false,
    ): boolean {
        if (!switched) {
            return this.assertCompatible(a, b, symTable, true);
        }
    }

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
            source: "checker",
            message,
            pos,
        });
    }
    private warning(message: string, pos: Pos) {
        this.messages.push({
            severity: "warning",
            source: "checker",
            message,
            pos,
        });
    }
    private note(message: string, pos: Pos) {
        this.messages.push({
            severity: "note",
            source: "checker",
            message,
            pos,
        });
    }
}
