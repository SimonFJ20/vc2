
main:
    mov r0, 5
    mov r1, 1
.L0:
    sub r0, 1
    jz r1, .L1
    add r1, 1
    jnz .L0, r0
    add r1, r1
.L1:
    mov r1, r0

; 00   0      02   2 00000010 mov
; 01   1      10  16 00010000
; 02   2      00   0 00000000
; 03   3      00   0 00000000
; 04   4      00   0 00000000
; 05   5      05   5 00000101
; 06   6      02   2 00000010 mov
; 07   7      14  20 00010100
; 08   8      00   0 00000000
; 09   9      00   0 00000000
; 0a  10      00   0 00000000
; 0b  11      01   1 00000001
; 0c  12      0a  10 00001010 sub
; 0d  13      10  16 00010000
; 0e  14      00   0 00000000
; 0f  15      00   0 00000000
; 10  16      00   0 00000000
; 11  17      01   1 00000001
; 12  18      12  18 00010010 jz
; 13  19      14  20 00010100
; 14  20      00   0 00000000
; 15  21      00   0 00000000
; 16  22      00   0 00000000
; 17  23      26  38 00100110
; 18  24      09   9 00001001 add
; 19  25      14  20 00010100
; 1a  26      00   0 00000000
; 1b  27      00   0 00000000
; 1c  28      00   0 00000000
; 1d  29      01   1 00000001
; 1e  30      13  19 00010011 jz
; 1f  31      40  64 01000000
; 20  32      ff 255 11111111
; 21  33      ff 255 11111111
; 22  34      ff 255 11111111
; 23  35      ee 238 11101110
; 24  36      09   9 00001001 add
; 25  37      05   5 00000101
; 26  38      02   2 00000010 mov
; 27  39      04   4 00000100
