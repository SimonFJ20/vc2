
bp: dw 0x1000
sp: dw 0x1000
is_prime:
    add [sp], 4
    mov r1, [sp]
    mov r1, [bp]
    mov r1, [sp]
    mov [bp], r1
    add [sp], 8
    mov r1, [bp]
    ; if (v <= 1)
    mov r1, [bp]
    add r1, 4
    cmp [r1], 1
    and fl, 0x4 | 0x8
    jz .L0, fl
    mov r0, 0
    jmp .return
.L0:
    ; int i = 2
    add r1, 8
    mov [r1], 2
.L1:
    ; i < nr
    mov r1, [bp]
    add r1, 4
    mov r0, [r1]
    sub r1, 0
    add r1, 4 ; i
    cmp [r1], r0
    and fl, 0x8
    jnz .L2, fl
    ; if (v % i == 0)
    sub r1, 4 ; v
    mov r0, [r1]
    add r1, 4 ; i
    rem r0, [r1]
    jz .L3, r0
    mov r0, 0
    jmp .return
.L3:
    mov r1, [bp]
    add r1, 8
    add [r1], 1
    jmp .L1
.L2:
    mov r0, 1
.return:
    sub [sp], 8
    mov r1, [bp]
    mov [sp], r1
    mov r1, [sp]
    mov r1, [r1]
    sub [sp], 4
    mov [bp], r1
    mov r1, [sp]
    mov r1, [r1]
    sub [sp], 4
    jmp r1
prime:
    add [sp], 4
    mov r1, [sp]
    mov r1, [bp]
    mov r1, [sp]
    mov [bp], r1
    add [sp], 12
    ; int v = 1
    mov r1, [bp]
    add r1, 8 ; v
    mov [r1], 1
    ; int i = 0
    add r1, 4 ; i
    mov [r1], 0
.L0:
    ; i < n
    mov r1, [bp]
    add r1, 4 ; n
    mov r0, [r1]
    add r1, 8 ; i
    cmp [r1], r0
    and fl, 0x8
    jz .L1, fl
    ; v += 1
.L2:
    mov r1, [bp]
    add r1, 8 ; v
    add [r1], 1
    ; while (!is_prime(v))
    mov r0, [r1]
    mov r1, [sp]
    add r1, 8
    mov [r1], r0
    add [sp], 4
    mov [sp], pc
    jmp is_prime
    jnz .L2, r0
    ; ++i
    mov r1, [bp]
    add r1, 12 ; i
    add [r1], 1
    jmp .L0
.L1:
    mov r1, [bp]
    add r1, 8 ; v
    mov r0, [r1]
.return:
    sub [sp], 12
    mov r1, [bp]
    mov [sp], r1
    mov r1, [sp]
    mov r1, [r1]
    sub [sp], 4
    mov [bp], r1
    mov r1, [sp]
    mov r1, [r1]
    sub [sp], 4
    jmp r1
