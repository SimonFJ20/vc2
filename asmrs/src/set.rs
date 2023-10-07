#[repr(u8)]
pub enum Mnemonic {
    Nop = 0x00,
    Hlt = 0x01,
    Mov = 0x02,
    Or = 0x03,
    And = 0x04,
    Xor = 0x05,
    Not = 0x06,
    Shl = 0x07,
    Shr = 0x08,
    Add = 0x09,
    Sub = 0x0a,
    Mul = 0x0b,
    Imul = 0x0c,
    Div = 0x0d,
    Idiv = 0x0e,
    Rem = 0x0f,
    Cmp = 0x10,
    Jmp = 0x11,
    Jz = 0x12,
    Jnz = 0x13,
    Jeq = 0x14,
    Jne = 0x15,
    Jlt = 0x16,
    Jle = 0x17,
    Jgt = 0x18,
    Jge = 0x19,
}

#[repr(u8)]
#[derive(Debug, Clone)]
pub enum Register {
    R0 = 0,
    R1 = 1,
    Fl = 2,
    Pc = 3,
}

#[derive(Debug, Clone)]
pub enum Operand {
    Register(Register),
    Immidiate(i32),
    AddressRegister(Register),
    AddressImmidate(u32),
}

#[derive(Debug, Clone)]
pub struct Instruction {
    mnemonic: Mnemonic,
    operands: Vec<Operand>,
}
