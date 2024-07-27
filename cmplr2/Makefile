
all: check

ast-example: check
	./cmplr2 example.cmplr2 \
		| pygmentize -O style=gruvbox-dark -l json \
		| deno run indent_lines.ts

check: main.ts parser.out.ts ast.out.ts hir.out.ts
	deno check $<

hir.out.ts: hir
	generate_ast $< > $@

parser.out.ts: parser.ne ast.out.ts
	nearleyc -o $@ $<

ast.out.ts: ast
	generate_ast $< > $@

