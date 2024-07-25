
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

const lexer: any = moo.compile({

    newline: { match: /[\n;]+/, lineBreaks: true },
    whitespace: /[ \t]+/,

    singleLineComment: /\/\/.*?$/,
    multiLineComment: { match: /\*[^*]*\*+(?:[^/*][^*]*\*+)*/, lineBreaks: true },

    hex: /0x[0-9a-fA-F]+/,
    int: /0|(?:[1-9][0-9]*)/,

    char: { match: /'(?:[^'\\]|\\[\s\S])'/, value: s => s.slice(1, -1), lineBreaks: true },
    string: { match: /"(?:[^"\\]|\\[\s\S])*"/, value: s => s.slice(1, -1), lineBreaks: true },

    name: {
        match: /[a-zA-Z0-9_]+/,
        type: moo.keywords({
            keyword: ["fn", "if", "or", "and", "xor"],
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

function binary(kind: ast.BinaryType) {
    return (v) => ast.Binary(v[0], v[2], kind);
}
%}

@lexer lexer

seperatedList[ELEMENT, SEPERATOR]
    -> _ ($ELEMENT seperatedListTail[$ELEMENT, $SEPERATOR] _ ($SEPERATOR _):?):?
        {% v => v[1] ? [v[1][0], ...v[1][1]] : [] %}

seperatedListTail[ELEMENT, SEPERATOR]
    -> (_ $SEPERATOR $ELEMENT):*
        {% v => v[0] ? v[0].map(w => w[2]) : [] %}

file -> _ ((expr | fn) _):*

fn  ->  "fn" __ name _ "(" paramList ")" _ body

paramList -> _ (param paramTail _ ",":?):? _

paramTail -> (_ "," _ param):*

param -> (name ":" type)

body -> value

statement -> expr ";" {% v => ast.ExprStatement(v[0]) %}

expr -> expr1

expr1   ->  expr1 "or" expr2
                {% binary("Or") %}
        |   expr2 {% id %}

expr2   ->  expr2 "xor" expr3
                {% binary("Xor") %}
        |   expr3 {% id %}

expr3   ->  expr3 "and" expr4
                {% binary("And") %}
        |   expr4 {% id %}

expr4   ->  expr5 "==" expr5
                {% binary("Equal") %}
        |   expr5 "!=" expr5
                {% binary("NotEqual") %}
        |   expr5 "<" expr5
                {% binary("Lt") %}
        |   expr5 ">" expr5
                {% binary("Gt") %}
        |   expr5 "<=" expr5
                {% binary("LtEqual") %}
        |   expr5 ">=" expr5
                {% binary("GtEqual") %}
        |   expr5 {% id %}

expr5   ->  expr6 "<<" expr6
                {% binary("LeftShift") %}
        |   expr6 ">>" expr6
                {% binary("RightShift") %}
        |   expr6 {% id %}

expr6   ->  expr6 "+" expr7
                {% binary("Add") %}
        |   expr6 "-" expr7
                {% binary("Subtract") %}
        |   expr7 {% id %}

expr7   ->  expr7 "*" expr8
                {% binary("Multiply") %}
        |   expr7 "/" expr8
                {% binary("Divide") %}
        |   expr7 "%" expr8
                {% binary("Remainder") %}
        |   expr8 {% id %}

expr8   ->  expr8 "[" expr "]"
                {% v => ast.Expr.Index(v[0], v[2]) %}
        |   expr8 "(" seperatedList[expr, ","] ")"
                {% v => ast.Expr.Call(v[0], v[2]) %}
        |   expr9 {% id %}

expr9   ->  expr9 "." name
                {% v => ast.Expr.Field(v[0], v[2]) %}
        |   expr10 {% id %}

expr10  ->  path {% id %}
        |   expr11 {% id %}

expr11 -> operand {% id %}

operand     ->  name
                    {% v => ast.Expr.Name(v[0]) %}
            |   int
                    {% v => ast.Expr.Int(v[0]) %}
            |   string
                    {% v => ast.Expr.String(v[0]) %}
            |   "(" _ expression _ ")"
                    {% v => v[2] %}
            |   if      {% id %}
            |   block   {% id %}

if -> "if" _ expr _ block (_ "else" _ block):?

name -> %name {% v => ast.Name(v[0].value) %}
int -> %int {% v => ast.Int(v[0].value) %}
string -> %string {% v => ast.String(v[0].value) %}

_           ->  __:?
__          ->  (%whitespace|%newline|%singleLineComment|%multiLineComment):+


