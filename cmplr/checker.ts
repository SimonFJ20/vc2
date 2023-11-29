import { Expr } from "./ast.ts";
import { Type } from "./ast.ts";
import { Param } from "./ast.ts";
import { Message } from "./ast.ts";
import { Pos } from "./ast.ts";
import { ParsedExpr, ParsedParam, ParsedType } from "./parser.ts";
import { assertExhausted, Err, None, Option, Result, Some } from "./utils.ts";

type ParsedExprW<T extends ParsedExpr["type"]> =
    & { type: T }
    & ParsedExpr;

const errorExpr = (pos: Pos): Expr => ({
    type: "error",
    valueType: errorType(pos),
    constEval: false,
    pos,
});
const errorType = (pos: Pos): Type => ({ type: "error", pos });
const unitType = (pos: Pos): Type => ({ type: "unit", pos });

type Sym = {
    type: "fn";
    checkedType: Type;
} | {
    type: "static";
    checkedType: Type;
};

export type SymTable = {
    parent?: SymTable;
    symbols: { [id: string]: Sym };
};

export class Checker {
    private symTable: SymTable = { symbols: {} };

    public constructor(private messages: Message[]) {}

    public checkFile(exprs: ParsedExpr[]): Expr[] {
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

    private checkFn(expr: ParsedExpr): Expr {
    }

    private checkLet(
        expr: ParsedExprW<"let">,
        symTable: SymTable,
    ): Expr {
        const param = this.checkParam(expr.param, symTable);
        const value = this.checkExpr(
            expr.value,
            symTable,
            param.valueType,
        );
        if (
            param.valueType &&
            !this.typesCompatible(param.valueType, value.valueType, symTable)
        ) {
            this.error("types incompatible", expr.pos);
            return errorExpr(expr.pos);
        }
        return {
            type: "let",
            param,
            value,
            valueType: unitType(expr.pos),
            constEval: param.mutable && value.constEval,
            pos: expr.pos,
        };
    }

    private checkParam(
        param: ParsedParam,
        symTable: SymTable,
    ): Param {
        if (param.id in symTable.symbols) {
            this.error("redefinition", param.pos);
        }
        let valueType = undefined;
        if (param.valueType.ok) {
            valueType = this.checkType(param.valueType.value, symTable);
        }
        return {
            id: param.id,
            valueType,
            mutable: param.mutable,
            pos: param.pos,
        };
    }

    private checkExpr(
        expr: ParsedExpr,
        symTable: SymTable,
        imposed?: Type,
    ): Expr {}

    private checkType(type: ParsedType, symTable: SymTable): Type {
        const pos = type.pos;
        if (type.type === "error") {
            return errorType(pos);
        }
        if (type.type === "blank") {
            this.warning("type inference not implemented", pos);
            return { type: "blank", pos };
        }
        if (type.type === "id") {
            if (
                ["unit", "i32", "u32", "bool", "char", "str"]
                    .includes(type.id)
            ) {
                return {
                    type: type.id as (Type & { type: "id" })["id"],
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

    private typesCompatible(
        a: Type,
        b: Type,
        symTable: SymTable,
        switched = false,
    ): boolean {
        if (a.type === "error" || a.type === "int") {
            return false;
        }
        if (a.type === "blank") {
            if (!switched) {
                return this.typesCompatible(b, a, symTable, true);
            }
            return false;
        }
        if (
            ["unit", "u32", "i32", "bool", "char", "str"].includes(a.type)
        ) {
            return b.type === a.type || b.type === "blank";
        }
        if (a.type === "array") {
            if (b.type === "blank") {
                return true;
            }
            if (b.type !== "array") {
                return false;
            }
            if (!this.typesCompatible(a.valueType, b.valueType, symTable)) {
                return false;
            }
            return true;
        }
        if (!switched) {
            return this.typesCompatible(b, a, symTable, true);
        }
        throw new Error("unexhaustive");
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
