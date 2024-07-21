#!/bin/bash

set -xe

generate_ast ast > ast.out.ts

nearleyc -o parser.out.ts parser.ne

deno run --allow-read --allow-write --allow-run main.ts $1
