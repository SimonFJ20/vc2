pub enum Mnemonic {
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
    Jeq,
    Jne,
    Jlt,
    Jle,
    Jgt,
    Jge,
}

pub enum Register {
    R0,
    R1,
    Fl,
    Pc,
}

pub enum Operand {
    Register(Register),
    Immidiate(i32),
    AddressRegister(Register),
    AddressImmidate(u32),
}

pub struct Instruction {
    mnemonic: Mnemonic,
    operands: Vec<Operand>,
}
