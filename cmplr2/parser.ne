
@preprocessor typescript

@{%
import * as moo from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";
import * as ast from "./ast.out.ts";

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

    char: { match: /'(?:[^'\\]|\\[\s\S])'/, value: s => s.slice(1, -1), lineBreaks: true },
    string: { match: /"(?:[^"\\]|\\[\s\S])*"/, value: s => s.slice(1, -1), lineBreaks: true },

    name: {
        match: /[a-zA-Z_][a-zA-z0-9_]+/,
        type: moo.keywords({
            keyword: [
                "fn", "if", "or", "and", "xor", "not", "mod", "use",
                "loop", "return", "break", "continue",
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

const n = (i: number) =>
    (v) => v[i];

const binary = (kind: ast.BinaryType) =>
    (v) => ast.Expr.Binary(v[0], v[4], kind);
%}

@lexer lexer

seperatedList[ELEMENT, SEPERATOR]
    ->  _ ($ELEMENT seperatedListTail[$ELEMENT, $SEPERATOR]
            _ ($SEPERATOR _):? {% v => [v[0][0], ...v[1]] %}):?
        {% n(1) %}

seperatedListTail[ELEMENT, SEPERATOR]
    -> (_ $SEPERATOR _ $ELEMENT {% v => v[3][0][0] %}):*
        {% n(0) %}

file    ->  _ (statement _ {% v => v[0]%}):*
                {% n(1) %}

statement
    ->  "mod" __ name _ ";"
            {% v => ast.Statement.ModDec(v[2]) %}
    |   "mod" __ name _ block
            {% v => ast.Statement.ModDef(v[2], v[4]) %}
    |   "use" __ path _ ";"
            {% v => ast.Statement.Use(v[3]) %}
    |   fn
            {% v => ast.Statement.Fn(v[0]) %}
    |   "return" _ ";"
            {% v => ast.Statement.Return(null) %}
    |   "return" _ expr _ ";"
            {% v => ast.Statement.Return(v[2]) %}
    |   "let" __ name _ "=" _ expr _ ";"
            {% v => ast.Statement.Let(v[2], v[6]) %}
    |   loop
            {% v => ast.Statement.Loop(v[0]) %}
    |   "break" _ ";"
            {% v => ast.Statement.Break(null) %}
    |   "break" __ expr _ ";"
            {% v => ast.Statement.Break(v[2]) %}
    |   "continue" _ ";"
            {% v => ast.Statement.Continue() %}
    |   if
            {% v => ast.Statement.If(v[0]) %}
    |   expr _ "=" _ expr _ ";"
            {% v => ast.Statement.Assign(v[0], v[4]) %}
    |   expr _ ";"
            {% v => ast.Statement.Expr(v[0]) %}

fn  ->  "fn" __ name _ "(" paramList ")" _ ("->" _ type _ {% n(2) %}):? block
            {% v => ast.Fn(v[2], v[5], v[8], v[9]) %}

paramList -> _ (param paramTail _ ",":? {% v => [v[0], ...v[1]] %}):? _
                {% v => v[1] ?? [] %}

paramTail -> (_ "," _ param {% n(3) %}):*

param -> name _ (":" _ type {% n(2) %}):?
            {% v => ast.Param(v[0], v[4]) %}

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

expr10   ->  expr9 _ "."  _ name
                {% v => ast.Expr.Field(v[0], v[4]) %}
        |   expr11 {% id %}

expr11 -> operand {% id %}

operand     ->  name
                    {% v => ast.Expr.Name(v[0]) %}
            |   path
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
    ->  "{" (_ statement {% n(1) %}):* (_ expr {% n(1) %}):? _ "}"
        {% v => ast.Block(v[1] ?? [], v[2]) %}

type    ->  "[" _ type _ "]"
                {% v => ast.Type.Slice(v[2]) %}
        |   "[" _ type _ ";" _ expr _ "]"
                {% v => ast.Type.Array(v[2], v[6]) %}
        |   "*" _ "mut" _ type
                {% v => ast.Type.RefMut(v[4]) %}
        |   "*" _ type
                {% v => ast.Type.Ref(v[2]) %}
        |   path
                {% v => ast.Type.Path(v[0]) %}
        |   name
                {% v => ast.Type.Name(v[0]) %}

path    ->  "::":? _ name (_ "::" _ name {% n(3) %}):+ (_ "::" _ "*"):?
                {% v => ast.Path(
                    [v[3], ...v[4]],
                    v[0].length !== 0,
                    v[4].length !== 0,
                ) %}

name -> %name {% v => ast.Name(v[0].value) %}
int -> %int {% v => ast.Int(v[0].value) %}
string -> %string {% v => ast.String(v[0].value) %}

_           ->  __:?
__          ->  (%whitespace
                | %newline
                | %singleLineComment
                | %multiLineComment):+

# vim: ts=4 sw=4 et
