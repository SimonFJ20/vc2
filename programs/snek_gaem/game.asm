
%define KEY_EVENT_NONE 0
%define KEY_EVENT_PRESSED 1
%define KEY_EVENT_RELEASED 2

%define KEYCODE_SPACE 1
%define KEYCODE_UP 2
%define KEYCODE_DOWN 3
%define KEYCODE_LEFT 4
%define KEYCODE_RIGHT 5

%define COLOR_OFF 0x11111100
%define COLOR_ON 0xEEEEEE00

bp: dw 0x1000
sp: dw 0x1000

%macro push 1
    add [sp], 4
    mov r1, [sp]
    mov r0, %0
    mov [r1], r0
%endmacro

%macro pop 0
    sub [sp], 4
%endmacro

%macro pop 1
    mov r1, [sp]
    mov %0, r1
    sub [sp], 4
%endmacro

%macro enter 0
    push [bp]
    mov r1, [sp]
    mov [
%endmacro

%macro leave 0
    mov
%endmacro

main:
    nop

