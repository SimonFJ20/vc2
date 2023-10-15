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

enum ParsedLine {
    Instruction {
        label: Option<String>,
        instruction: Option<ParsedInstruction>,
    },
    Include {
        path: String,
    },
    Define {
        id: String,
        value: String,
    },
    Macro {
        id: String,
        operand_ount: i32,
    },
    EndMacro,
}

struct ParsedInstruction {
    mnemonic: String,
    operands: Vec<String>,
}

fn main() {
    println!("hello world");
}
