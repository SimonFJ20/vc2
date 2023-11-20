import { contains, None, Option, Some } from "./utils.ts";

async function main() {
    const options = parseArgOptions(Deno.args);
    if (options.printHelp) {
        console.log(helpMessage);
        return;
    }
    if (options.printVersion) {
        console.log(versionMessage);
        return;
    }
    const text = await Deno.readTextFile(options.inputFile);
}

type ArgOptions = {
    printHelp: boolean;
    printVersion: boolean;
    inputFile: string;
    outputFile: Option<string>;
    printAst: boolean;
    printIr: boolean;
    printAsm: boolean;
};

const helpMessage = `
cmplr [options] <filename>
options:
    -h,--help       print help
    -v,--version    print version
    -o <filename>   specify output file
    --print-ast     print result of parsing
    --print-ir      print result of lowering
    --print-asm     print result of generating
`.trim();

const versionMessage = `
cmplr WIP
compiler compiling language to vc2 assembly
`.trim();

function parseArgOptions(args: string[]): ArgOptions {
    let printHelp = false;
    let printVersion = false;
    let inputFile = None<string>();
    let outputFile = None<string>();
    let printAst = false;
    let printIr = false;
    let printAsm = false;

    let i = 0;
    while (i < args.length) {
        if (!args[i].startsWith("-")) {
            if (inputFile.ok) {
                console.error("error: multiple input files");
                Deno.exit(1);
            }
            inputFile = Some(args[i]);
        } else if (args[i] == "-o") {
            i += 1;
            if (i >= args.length || args[i].startsWith("-")) {
                console.error(`error: expected output file after "-o"`);
                Deno.exit(1);
            }
            outputFile = Some(args[i]);
        } else if (contains(args[i], ["-h", "--help"])) {
            printHelp = true;
        } else if (contains(args[i], ["-v", "--version"])) {
            printVersion = true;
        } else if (args[i] == "--print-ast") {
            printAst = true;
        } else if (args[i] == "--print-ir") {
            printIr = true;
        } else if (args[i] == "--print-asm") {
            printAsm = true;
        } else {
            console.error(`error: unrecognized argument "${args[i]}"`);
            Deno.exit(1);
        }
        i += 1;
    }

    if (!inputFile.ok) {
        console.error("error: no input file");
        Deno.exit(1);
    }

    return {
        printHelp,
        printVersion,
        inputFile: inputFile.value,
        outputFile,
        printAst,
        printIr,
        printAsm,
    };
}

main().catch((error) => console.error(error));
