
# vc2

**Virtual Computer 2**

## Architecture

32-bit.

Big endian, eg. value `0xABCDEF` as bytes in memory: `[0xAB, 0xCD, 0xEF]`.

### Instructions

Opcode | Mnemonic | Description
---|---|---
`0x00` | `nop` | Do nothing, continue
`0x01` | `hlt` | Stop
`0x02` | `mov` | Move data, from/to registers and memory, `a = b`
`0x03` | `or` | Or, `a \| b`
`0x04` | `and` | And, `a & b`
`0x05` | `xor` | Xor, `a xor b`
`0x06` | `not` | Not, `~a`
`0x07` | `shl` | Shift left, `a << b`
`0x08` | `shr` | Shift right, `a >> b`
`0x09` | `add` | Add, `a + b`
`0x0a` | `sub` | Subtract, `a - b`
`0x0b` | `mul` | Multiply unsigned, `a * b`
`0x0c` | `imul` | Multiply signed, `a * b`
`0x0d` | `div` | Unsigned integer division, `a / b`
`0x0e` | `idiv` | Signed integer division, `a / b`
`0x0f` | `rem` | Calculator remainder (modulo), `a % b`
`0x10` | `cmp` | Compare values, `a == b`, `a < b`
`0x11` | `jmp` | Jump relative or absolute
`0x12` | `jz` | Jump if zero
`0x13` | `jnz` | Jump if not zero

#### NOP

Opcode | Instruction | Description
---|---|---
`0x00` | NOP | Do nothing

#### HLT

Opcode | Instruction | Description
---|---|---
`0x01` | HLT | Halt execution

#### MOV
Move values to registers, values to memory, registers to registers, registers to memory, memory to registers.
Cannot move from directly from memory to memory.
Opcode | Instruction | Description
---|---|---
`0x02 0b0000 reg1 reg2` | MOV reg1 reg2 | reg1 = reg2
`0x02 0b0001 reg 0b00 imm` | MOV reg imm | reg = imm
`0x02 0b0010 reg1 reg2` | MOV reg1 [reg2] | reg1 = memory[reg2]
`0x02 0b0011 reg 0b00 imm` | MOV reg [imm] | reg = memory[imm]
`0x02 0b1000 reg1 reg2` | MOV [reg1] reg2 | memory[reg1] = reg2
`0x02 0b1001 reg 0b00 imm` | MOV [reg] imm | memory[reg1] = imm
`0x02 0b110000 reg2 imm` | MOV [imm] reg2 | memory[imm] = reg2
`0x02 0b110100000 imm1 imm2` | MOV [imm1] imm2 | memory[imm1] = imm2

```
0x02 0bxxyyddss
```

`xx` is destination select.
`yy` is source select.
`dd` is destination register, if applicable.
`ss` is source register, if applicable.
Immediates are appended if applicable, destination first.

#### OR, AND, XOR, SHL, SHR, ADD, SUB, MUL, IMUL, DIV, IDIV, REM, CMP

Opcode | Instruction | Description
---|---|---
`0xkk 0b0000 reg1 reg2` | OP reg1 reg2 | reg1 = reg1 op reg2
`0xkk 0b0001 reg 0b00 imm` | OP reg imm | reg = reg op imm
`0xkk 0b0010 reg1 reg2` | OP reg1 [reg2] | reg1 = reg1 op memory[reg2]
`0xkk 0b0011 reg 0b00 imm` | OP reg [imm] | reg = reg op memory[imm]
`0xkk 0b1000 reg1 reg2` | OP [reg1] reg2 | memory[reg1] = memory[reg1] op reg2
`0xkk 0b1001 reg 0b00 imm` | OP [reg] imm | memory[reg1] = memory[reg1] op imm
`0xkk 0b110000 reg2 imm` | OP [imm] reg2 | memory[imm] = memory[imm] op reg2
`0xkk 0b110100000 imm1 imm2` | OP [imm1] imm2 | memory[imm1] = memory[imm1] op imm2

```
0xkk 0bxxyyddss
```

`kk` is instruction selector.
`xx` is destination select.
`yy` is source select.
`dd` is destination register.
`ss` is source register, if applicable.
Immediates are appended if applicable, destination first.
Flags in `fl` regiser are set according to [the table](#flags).
The `cmp` instruction persists the destination.
The `add` and `sub` instructions, use the flags in the `fl` register as input. 

#### NOT

Opcode | Instruction | Description
---|---|---
`0x06 0b0000 reg 0b00` | NOT reg | reg = not reg

```
0x06 0b0000dd00
```

`dd` is destination register.

#### JMP

Opcode | Instruction | Description
---|---|---
`0x11 0b0000 reg 0b00` | JMP reg | pc += reg
`0x11 0b0100 reg 0b00 imm` | JMP imm | pc += imm
`0x11 0b1000 reg 0b00` | JMP [reg] | pc += [reg]
`0x11 0b1100 reg 0b00 imm` | JMP [imm] | pc += [imm]
`0x11 0b0000 reg 0b01` | JMP reg | pc = reg
`0x11 0b0100 reg 0b01 imm` | JMP imm | pc = imm
`0x11 0b1000 reg 0b01` | JMP [reg] | pc = [reg]
`0x11 0b1100 reg 0b01 imm` | JMP [imm] | pc = [imm]

Relative jumps are relative to the jump instruction's address.

```
0x11 0bzz00aa0r
```

`zz` is target select.
`aa` is target register, if applicable.
`r` is relative/absolute switch, `1` if absolute, else `0`.
Immediates are appended if applicable, destination first.

#### JZ, JNZ

Opcode | Instruction | Description
---|---|---
`0xkk 0b0000 reg1 reg2` | JCC reg1 reg2 | pc = reg1 if CC(reg2)
`0xkk 0b0001 reg1 0b00 imm` | JCC reg1 imm | pc = reg1 if CC(imm)
`0xkk 0b0010 reg1 reg2` | JCC reg1 [reg2] | pc = reg1 if CC([reg2])
`0xkk 0b0011 reg1 0b00` | JCC reg1 [imm] | pc = reg1 if CC([imm])
`0xkk 0b1000 reg1 reg2` | JCC [reg1] reg2 | pc = [reg1] if CC(reg2)
`0xkk 0b1001 reg1 0b00 imm` | JCC [reg1] imm | pc = [reg1] if CC(imm)
`0xkk 0b110000 reg2 imm` | JCC [imm] reg2 | pc = [imm] if CC(reg2)
`0xkk 0b110100 0b00 imm1 imm2` | JCC [imm1] imm2 | pc = [imm1] if CC(imm2)

Conditional jumps are relative to the jump instruction's address.

```
0xkk 0bzzyyaass
```

`kk` is instruction selector.
`yy` is source select.
`aa` is target register, if applicable.
`ss` is source register, if applicable.
Immediates are appended if applicable, destination first.

### Data selection

Any selector in an opcode, is replaced by one of:

Selector | Description
---|---
`0b00` | Register
`0b01` | Immediate
`0b10` | Register address
`0b11` | Immediate address

### Registers

Any `reg` in an opcode, is replaced by one of:

Selector | Mnemonic | Description
---|---|---
`0b00` | `r0` | General purpose, result
`0b01` | `r1` | General purpose, operand
`0b10` | `fl` | Flags
`0b11` | `pc` | Program counter

### Flags

Bit | Hex mask | Description | Value
---|---|---|---
0 | `0x1` | Overflow | If result is too large to fit in the destination, unless Carry/borrow suffices
1 | `0x2` | Carry/borrow | If op in [add, subtract], the result constitutes a carry or subtract.
2 | `0x4` | Equal | if op == cmp, if destination == source
3 | `0x8` | Less | if op == cmp, if destination < source

### Memory layout and mappings

Address | Description
---|---
`0x0000..0x1000` | Program memory
`0x1000..0x2000` | General purpose
`0x2010` | Current time [µs] (Read)
`0x2014` | Enable timer (Write)
`0x2018` | Timer countdown time [µs] (Write)
`0x201c` | Timer callback address (Write)
`0x2020` | Keyboard enabled. `1` if enabled, else `0` (Read)
`0x2024` | Key event happened. `1` if press, `2` if release, else `0` (Read)
`0x2028` | Keycode (Read)
`0x202c` | Key event callback address. `0` disables callback (Write)
`0x2030` | Screen video output enabled. `1` if enabled, else `0` (Read)
`0x2034` | VRAM address (Read)
`0x2038` | Screen resolution width (Read)
`0x203c` | Screen resolution height (Read)

