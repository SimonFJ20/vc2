// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var name: any;
declare var int: any;
declare var string: any;
declare var whitespace: any;
declare var newline: any;
declare var singleLineComment: any;
declare var multiLineComment: any;

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

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "file$ebnf$1", "symbols": []},
    {"name": "file$ebnf$1$subexpression$1", "symbols": ["fn", "_"]},
    {"name": "file$ebnf$1", "symbols": ["file$ebnf$1", "file$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "file", "symbols": ["_", "file$ebnf$1"]},
    {"name": "fn", "symbols": [{"literal":"fn"}, "__", "name", "_", {"literal":"("}, "paramList", {"literal":")"}, "_", "body"]},
    {"name": "paramList$ebnf$1$subexpression$1$ebnf$1", "symbols": [{"literal":","}], "postprocess": id},
    {"name": "paramList$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "paramList$ebnf$1$subexpression$1", "symbols": ["param", "paramTail", "_", "paramList$ebnf$1$subexpression$1$ebnf$1"]},
    {"name": "paramList$ebnf$1", "symbols": ["paramList$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "paramList$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "paramList", "symbols": ["_", "paramList$ebnf$1", "_"]},
    {"name": "paramTail$ebnf$1", "symbols": []},
    {"name": "paramTail$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "param"]},
    {"name": "paramTail$ebnf$1", "symbols": ["paramTail$ebnf$1", "paramTail$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "paramTail", "symbols": ["paramTail$ebnf$1"]},
    {"name": "body", "symbols": ["value"]},
    {"name": "value", "symbols": ["int"], "postprocess": v => ast.IntExpr(v[0])},
    {"name": "value", "symbols": ["string"], "postprocess": v => ast.StringExpr(v[0])},
    {"name": "value", "symbols": ["name"], "postprocess": v => ast.NameExpr(v[0])},
    {"name": "name", "symbols": [(lexer.has("name") ? {type: "name"} : name)], "postprocess": v => ast.Name(v[0].value)},
    {"name": "int", "symbols": [(lexer.has("int") ? {type: "int"} : int)], "postprocess": v => ast.Int(v[0].value)},
    {"name": "string", "symbols": [(lexer.has("string") ? {type: "string"} : string)], "postprocess": v => ast.String(v[0].value)},
    {"name": "_$ebnf$1", "symbols": ["__"], "postprocess": id},
    {"name": "_$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "_", "symbols": ["_$ebnf$1"]},
    {"name": "__$ebnf$1$subexpression$1", "symbols": [(lexer.has("whitespace") ? {type: "whitespace"} : whitespace)]},
    {"name": "__$ebnf$1$subexpression$1", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "__$ebnf$1$subexpression$1", "symbols": [(lexer.has("singleLineComment") ? {type: "singleLineComment"} : singleLineComment)]},
    {"name": "__$ebnf$1$subexpression$1", "symbols": [(lexer.has("multiLineComment") ? {type: "multiLineComment"} : multiLineComment)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1$subexpression$1"]},
    {"name": "__$ebnf$1$subexpression$2", "symbols": [(lexer.has("whitespace") ? {type: "whitespace"} : whitespace)]},
    {"name": "__$ebnf$1$subexpression$2", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "__$ebnf$1$subexpression$2", "symbols": [(lexer.has("singleLineComment") ? {type: "singleLineComment"} : singleLineComment)]},
    {"name": "__$ebnf$1$subexpression$2", "symbols": [(lexer.has("multiLineComment") ? {type: "multiLineComment"} : multiLineComment)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "__$ebnf$1$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"]}
  ],
  ParserStart: "file",
};

export default grammar;
