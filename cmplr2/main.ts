import {
    Grammar,
    Parser,
} from "https://deno.land/x/nearley@2.19.7-deno/mod.ts";
import compiledParserGrammar from "./parser.out.ts";
import * as ast from "./ast.out.ts";

const parser = new Parser(Grammar.fromCompiled(compiledParserGrammar));

if (Deno.args.length < 1) {
    throw new Error("not enough args");
}
const text = await Deno.readTextFile(Deno.args[0]);
parser.feed(text);
const result = parser.results[0];
if (parser.results.length > 1) {
    console.log("Ambigious parse:", parser.results.length, "results");
}
console.log(
    JSON.stringify(result, null, "|   ")
        .replaceAll("|", "\x1b[90m│\x1b[0m"),
);
