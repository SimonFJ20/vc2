
@preprocessor typescript

@{%
import * as moo from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";
import * as ast from "./ast.out.ts";

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
            keyword: ["fn"],
        }),
    },

    lparen: "(",
    rparen: ")",
    comma: ",",
});
%}

@lexer lexer

file -> _ (expr _):*

fn  ->  "fn" __ name _ "(" paramList ")" _ body

paramList -> _ (param paramTail _ ",":?):? _

paramTail -> (_ "," _ param):*

body -> value

statement -> expr ";" {% v => ast.ExprStatement(v[0]) %}

expr -> value

value       ->  int {% v => ast.IntExpr(v[0]) %}
            |   string {% v => ast.StringExpr(v[0]) %}
            |   name {% v => ast.NameExpr(v[0]) %}
            # |   "(" _ expression _ ")"
            #         {% v => v %} 

name -> %name {% v => ast.Name(v[0].value) %}
int -> %int {% v => ast.Int(v[0].value) %}
string -> %string {% v => ast.String(v[0].value) %}

_           ->  __:?
__          ->  (%whitespace|%newline|%singleLineComment|%multiLineComment):+


