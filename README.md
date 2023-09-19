
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
`0x02 0b110100000 imm imm` | MOV [imm] imm | memory[imm] = imm

```
0x02 0bxxyyddss
```

`xx` is destination select.
`yy` is source select.
`dd` is destination register, if applicable.
`ss` is source register, if applicable.
Immidiates are appended if applicable, destination first.

#### OR, AND, XOR, SHL, SHR, ADD, SUB, MUL, IMUL, DIV, IDIV, REM, CMP

```
0xkk 0b00yyddss
```

`kk` is instruction selector.
`yy` is source select.
`dd` is destination register.
`ss` is source register, if applicable.
Immidiates are appended if applicable, destination first.

Flags in `fl`-regiser are set accordingly.

#### NOT

```
0x06 0b0000dd00
```

`dd` is destination register.

#### JMP

```
0x11 0bzz00aa00
```

`zz` is target select.
`aa` is target register, if applicable.
Immidiates are appended if applicable, destination first.

#### JZ, JNZ, JEQ, JNE, JLT, JLE, JGT, JGE

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

```
00  register
01  immidiate
10  register address
11  immidiate address
```

### Registers

Any `reg` in an opcode, is replaced by one of:

```
00  r0  gp 0
01  r1  gp 1
10  fl  flags
11  pc  program counter
```

### Flags

```
0   zero
1   less
2   equal
3   overflow
4   carry
5   borrow
```

