
export function preprocess(program: string): string {
    const processor = new Preprocessor();
    return processor.processLines(program);
}

type PSymbol = {
    type: "define",
    value: string,
} | {
    type: "macro",
    argCount: number,
    lines: string[],
};

class Preprocessor {
    private symbols: { [id: string]: PSymbol } = {};

    public processLines(text: string): string  {
        const lines = text.split("\n");
        let i = 0;
        while (i < lines.length) {
            if (/^\s+%\s+define/.test(lines[i])) {
                const match = lines[i].match(/^\s*%\s*define ([a-zA-Z_][a-zA-Z0-9_]*) (.+?);?/);
                if (match === null) {
                    throw new Error(`panic on line ${i + 1}: malformed %define directive`);
                }
                const id = match[1];
                const value = match[2];
                if (id in this.symbols) {
                    throw new Error(`panic on line ${i + 1}: redefinition of symbol \"${id}\"`);
                }
            }
            i += 1;
        }
    }
}
