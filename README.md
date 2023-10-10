
# vc2

**Virtual Computer 2**

## Architecture

32-bit.

Big endian, eg. value `0xABCDEF` as bytes in memory: `[0xAB, 0xCD, 0xEF]`.

### Instructions

```
00  nop
01  hlt
02  mov
03  or
04  and
05  xor
06  not
07  shl
08  shr
09  add
0A  sub
0B  mul
0C  imul
0D  div
0E  idiv
0F  rem
10  cmp
11  jmp
12  jz 
13  jnz
14  jeq
15  jne
16  jlt
17  jle
18  jgt
19  jge
```

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
Immidiates are appended if applicable, destination first.

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
Immidiates are appended if applicable, destination first.

Flags in `fl`-regiser are set accordingly.

The `cmp` instruction persists the destination.

Bit | Description | Value
---|---|---
`0` | Overflow | If result is too large to fit in the destination, unless Carry/borrow suffices
`1` | Carry/borrow | If op in [add, subtract], the result constitutes a carry or subtract, and no information is discarded.
`2` | Equal | if op == cmp, if destination == source
`3` | Less | if op == cmp, if destination < source

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
Immidiates are appended if applicable, destination first.

#### JZ, JNZ, JEQ, JNE, JLT, JLE, JGT, JGE

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
Immidiates are appended if applicable, destination first.

### Data selection

Any selector in an opcode, is replaced by one of:

Selector | Description
---|---|---
`0b00` | Register
`0b01` | Immidiate
`0b10` | Register address
`0b11` | Immidiate address

### Registers

Any `reg` in an opcode, is replaced by one of:

Selector | Mnemonic | Description
---|---|---
`0b00` | `r0` | General purpose, result
`0b01` | `r1` | General purpose, operand
`0b10` | `fl` | Flags
`0b11` | `pc` | Program counter

### Flags

```
0   overflow
1   carry/borrow
2   equal
3   less
```

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

