
@preprocessor typescript

@{%
import * as moo from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";
import * as ast from "./ast.out.ts";
import { Pos } from "./info.ts";
import { Ctx } from "./ctx.ts"

let ctx: Ctx;
export const setCtx = (_ctx: Ctx) => { ctx = _ctx; }

function tokens(tokens: string): { [key: string]: string } {
    const rules: { [key: string]: string } = {};
    for (const token of tokens.trim().split(/[ \t\n]+/)) {
        rules[token] = token;
    }
    return rules;
}

const lexer = moo.compile({

    newline: { match: /[\n]+/, lineBreaks: true },
    whitespace: /[ \t]+/,

    singleLineComment: /\/\/.*?$/,
    multiLineComment: { match: /\*[^*]*\*+(?:[^/*][^*]*\*+)*/, lineBreaks: true },

    hex: /0x[0-9a-fA-F]+/,
    int: /0|(?:[1-9][0-9]*)/,

    char: {
        match: /'(?:[^'\\]|\\[\s\S])'/,
        value: s => s.slice(1, -1),
        lineBreaks: true,
    },
    string: {
        match: /"(?:[^"\\]|\\[\s\S])*"/,
        value: s => s.slice(1, -1),
        lineBreaks: true,
    },

    ident: {
        match: /[a-zA-Z_][a-zA-z0-9_]+/,
        type: moo.keywords({
            keyword: [
                "fn", "if", "or", "and", "xor", "not", "mod",
                "use", "loop", "return", "break", "continue",
            ],
        }),
    },

    ...tokens(`
        == != << >> <= >=
        += -= :: -> =>
        ( ) { } [ ] < >
        . , : ;
        + - * / % & =
    `),
});

const pos =
    ({ line, col, pos }: { line: number, col: number, pos?: undefined }): Pos =>
        pos ?? { line, col };

const n = (i: number) =>
    (v: any[]) => v[i];

const binary = (kind: ast.BinaryType) =>
    (v: any[]) => ast.Expr.Binary(v[0], v[4], kind);
%}

@lexer lexer

seperatedList[ELEMENT, SEPERATOR]
    ->  _ ($ELEMENT seperatedListTail[$ELEMENT, $SEPERATOR]
            _ ($SEPERATOR _):? {% v => [v[0][0], ...v[1]] %}):?
        {% n(1) %}

seperatedListTail[ELEMENT, SEPERATOR]
    -> (_ $SEPERATOR _ $ELEMENT {% v => v[3][0][0] %}):*
        {% n(0) %}

file    ->  _ (stmt _ {% v => v[0]%}):*
                {% v => ast.File(v[1]) %}

stmt
    ->  "mod" __ ident _ block
            {% v => ast.Stmt(ast.StmtKind.Mod(v[2], v[4]), pos(v[0])) %}
    |   "use" __ path _ ";"
            {% v => ast.Stmt(ast.StmtKind.Use(v[3]), pos(v[0])) %}
    |   fn
            {% v => ast.Stmt(ast.StmtKind.Fn(v[0]), pos(v[0])) %}
    |   "return" _ ";"
            {% v => ast.Stmt(ast.StmtKind.Return(null), pos(v[0])) %}
    |   "return" _ expr _ ";"
            {% v => ast.Stmt(ast.StmtKind.Return(v[2]), pos(v[0])) %}
    |   "let" __ pattern _ "=" _ expr _ ";"
            {% v => ast.Stmt(ast.StmtKind.Let(v[2], v[6]), pos(v[0])) %}
    |   loop
            {% v => ast.Stmt(ast.StmtKind.Loop(v[0]), pos(v[0])) %}
    |   "break" _ ";"
            {% v => ast.Stmt(ast.StmtKind.Break(null), pos(v[0])) %}
    |   "break" __ expr _ ";"
            {% v => ast.Stmt(ast.StmtKind.Break(v[2]), pos(v[0])) %}
    |   "continue" _ ";"
            {% v => ast.Stmt(ast.StmtKind.Continue(), pos(v[0])) %}
    |   if
            {% v => ast.Stmt(ast.StmtKind.If(v[0]), pos(v[0])) %}
    |   assign {% id %}

fn  ->  "fn" __ ident _ "(" paramList ")" _ ("->" _ type _ {% n(2) %}):? block
            {% v => ast.Fn(v[2], v[5], v[8], v[9]) %}

paramList -> _ (param paramTail _ ",":? {% v => [v[0], ...v[1]] %}):? _
                {% v => v[1] ?? [] %}

paramTail -> (_ "," _ param {% n(3) %}):*

param -> pattern _ (":" _ type {% n(2) %}):?
            {% v => ast.Param(v[0], v[4], pos(v[0])) %}

pattern ->  ident
                {% v => ast.Pattern(ast.PatternKind.Ident(v[0]), pos(v[0])) %}
        |   "mut" __ ident
                {% v => ast.Pattern(ast.PatternKind.MutIdent(v[1]), pos(v[0])) %}

type    ->  "[" _ type _ "]"
                {% v => ast.Type(ast.TypeKind.Slice(v[2]), pos(v[0])) %}
        |   "[" _ type _ ";" _ expr _ "]"
                {% v => ast.Type(ast.TypeKind.Array(v[2], v[6]), pos(v[0])) %}
        |   "*" _ "mut" _ type
                {% v => ast.Type(ast.TypeKind.PtrMut(v[4]), pos(v[0])) %}
        |   "*" _ type
                {% v => ast.Type(ast.TypeKind.Ptr(v[2]), pos(v[0])) %}
        |   path
                {% v => ast.Type(ast.TypeKind.Path(v[0]), pos(v[0])) %}

assign  ->  expr _ "=" _ expr _ ";"
                {% v => ast.Stmt(ast.StmtKind.Assign(ast.Assign(v[0], v[4], "Assign")), pos(v[0])) %}
        |   expr _ "+=" _ expr _ ";"
                {% v => ast.Stmt(ast.StmtKind.Assign(ast.Assign(v[0], v[4], "Increment")), pos(v[0])) %}
        |   expr _ "-=" _ expr _ ";"
                {% v => ast.Stmt(ast.StmtKind.Assign(ast.Assign(v[0], v[4], "Decrement")), pos(v[0])) %}
        |   expr _ ";"
                {% v => ast.Stmt(ast.StmtKind.Expr(v[0]), pos(v[0])) %}

expr -> expr1 {% id %}

expr1   ->  expr1 _ "or" _ expr2
                {% binary("Or") %}
        |   expr2 {% id %}

expr2   ->  expr2 _ "xor" _ expr3
                {% binary("Xor") %}
        |   expr3 {% id %}

expr3   ->  expr3 _ "and" _ expr4
                {% binary("And") %}
        |   expr4 {% id %}

expr4   ->  expr5 _ "==" _ expr5
                {% binary("Equal") %}
        |   expr5 _ "!=" _ expr5
                {% binary("NotEqual") %}
        |   expr5 _ "<" _ expr5
                {% binary("Lt") %}
        |   expr5 _ ">" _ expr5
                {% binary("Gt") %}
        |   expr5 _ "<=" _ expr5
                {% binary("LtEqual") %}
        |   expr5 _ ">=" _ expr5
                {% binary("GtEqual") %}
        |   expr5 {% id %}

expr5   ->  expr6 _ "<<" _ expr6
                {% binary("LeftShift") %}
        |   expr6 _ ">>" _ expr6
                {% binary("RightShift") %}
        |   expr6 {% id %}

expr6   ->  expr6 _ "+" _ expr7
                {% binary("Add") %}
        |   expr6 _ "-" _ expr7
                {% binary("Subtract") %}
        |   expr7 {% id %}

expr7   ->  expr7 _ "*" _ expr8
                {% binary("Multiply") %}
        |   expr7 _ "/" _ expr8
                {% binary("Divide") %}
        |   expr7 _ "%" _ expr8
                {% binary("Remainder") %}
        |   expr8 {% id %}

expr8   ->  "not" _ expr8
                {% v => ast.Expr.Not(v[2]) %}
        |   "-" _ expr8
                {% v => ast.Expr.Negate(v[2]) %}
        |   "&" _ expr8
                {% v => ast.Expr.Ref(v[2]) %}
        |   "&" _ "mut" _ expr8
                {% v => ast.Expr.RefMut(v[4]) %}
        |   "*" _ expr8
                {% v => ast.Expr.Deref(v[2]) %}
        |    expr9 {% id %}

expr9   ->  expr8 _ "[" _ expr _ "]"
                {% v => ast.Expr.Index(v[0], v[4]) %}
        |   expr9 _ "(" seperatedList[expr, ","] ")"
                {% v => ast.Expr.Call(v[0], v[3]) %}
        |   expr10 {% id %}

expr10   ->  expr9 _ "."  _ ident
                {% v => ast.Expr.Field(v[0], v[4]) %}
        |   expr11 {% id %}

expr11 -> operand {% id %}

operand     ->  path
                    {% v => ast.Expr.Path(v[0]) %}
            |   int
                    {% v => ast.Expr.Int(v[0]) %}
            |   string
                    {% v => ast.Expr.String(v[0]) %}
            |   "(" _ expr _ ")"
                    {% n(2) %}
            |   loop
                    {% v => ast.Expr.Loop(v[0]) %}
            |   if
                    {% v => ast.Expr.If(v[0]) %}
            |   block
                    {% v => ast.Expr.Block(v[0]) %}

loop    ->  "loop" _ block
                {% v => ast.Loop(v[2]) %}

if      ->  "if" _ expr _ block (_ "else" _ block):?
                {% v => ast.If(v[2], v[4], v[5][3] ?? null) %}

block
    ->  "{" (_ stmt {% n(1) %}):* (_ expr {% n(1) %}):? _ "}"
        {% v => ast.Block(v[1] ?? [], v[2]) %}

path    ->  pathRoot? ident (_ "::" _ ident {% n(3) %}):*
                    {% v => ast.Path(
                        [...v[0], v[1], ...v[2]],
                        pos(v[0] ?? v[1])
                    ) %}

pathRoot?   ->  ("::" _):?
                    {% v => v[0] ? [ctx.addSym("kw::PathRoot")] : []%}

ident -> %ident {% v => ast.Ident(ctx.addSym(v[0].value), pos(v[0])) %}
int -> %int {% v => ast.Int(v[0].value, pos(v[0])) %}
string -> %string {% v => ast.String(v[0].value, pos(v[0])) %}

_           ->  __:?
__          ->  (%whitespace
                | %newline
                | %singleLineComment
                | %multiLineComment):+

# vim: ts=4 sw=4 et
