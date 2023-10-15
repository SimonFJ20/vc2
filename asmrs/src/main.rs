#![allow(dead_code)]

#[derive(Debug, Clone)]
enum Mnemonic {
    Nop,
    Hlt,
    Mov,
    Or,
    And,
    Xor,
    Not,
    Shl,
    Shr,
    Add,
    Sub,
    Mul,
    Imul,
    Div,
    Idiv,
    Rem,
    Cmp,
    Jmp,
    Jz,
    Jnz,
}

struct ParsedInstruction {
    label: Option<String>,
}

fn main() {
    println!("hello world");
}
