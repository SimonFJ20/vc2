use crate::set::Instruction;

enum EmitError {}

pub struct Emitter {
    result: Vec<u8>,
}

impl Emitter {
    pub fn new() -> Self {
        Self { result: vec![] }
    }

    pub fn emit(&mut self, instructions: &[Instruction]) -> Result<(), EmitError> {
        for instruction in instructions {
            self.emit_instruction(instruction);
        }
        Ok(())
    }

    fn emit_instruction(&mut self, instruction: &Instruction) -> Result<(), EmitError> {}
}
