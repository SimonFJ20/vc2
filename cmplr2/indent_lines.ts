const ch = "┊";

const decoder = new TextDecoder();
for await (const chunk of Deno.stdin.readable) {
    const text = decoder.decode(chunk);
    const result = text
        .replaceAll("    ", "|   ")
        .replaceAll("|", `\x1b[90m${ch}\x1b[0m`);
    Deno.stdout.write(new TextEncoder().encode(result));
}
