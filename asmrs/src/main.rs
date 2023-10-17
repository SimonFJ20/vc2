#![allow(dead_code)]

use std::str::Chars;

#[derive(Debug, Clone)]
struct Pos {
    index: usize,
    line: i32,
    col: i32,
}

#[derive(Debug, Clone)]
struct Error {
    message: String,
    pos: Pos,
}

impl Error {
    pub fn formatted(&self, text: &str, filename: &str) -> String {
        let line_start = self.pos.index - self.pos.col as usize + 1;
        let mut line_end = line_start;
        let mut chars = text.chars().skip(line_start);
        loop {
            match chars.next() {
                Some('\n') | None => break,
                _ => {
                    line_end += 1;
                }
            }
        }
        let line = &text[line_start..line_end];
        format!(
            "error: {}\n  -> {}:{}:{}\n    |\n{:>4}|{}\n    |{}^ {}\n",
            self.message,
            filename,
            self.pos.line,
            self.pos.col,
            self.pos.line,
            line,
            " ".repeat(self.pos.col as usize - 1),
            self.message
        )
    }
}

#[derive(Debug, Clone, PartialEq)]
enum TokenType {
    Eof,
    Error,
    Newline,
    Id,
    Int,
    Hex,
    Binary,
    LBracket,
    RBracket,
    Dot,
    Comma,
    Colon,
}

#[derive(Debug, Clone)]
struct Token {
    token_type: TokenType,
    pos: Pos,
    length: usize,
}

impl Token {
    pub fn value<'a>(&self, text: &'a str) -> &'a str {
        &text[self.pos.index..self.pos.index + self.length]
    }
}

#[derive(Debug, Clone)]
struct Lexer<'a> {
    chars: Chars<'a>,
    index: usize,
    line: i32,
    col: i32,
    current: Option<char>,
    errors: Vec<Error>,
}

impl<'a> Lexer<'a> {
    pub fn new(text: &'a str) -> Self {
        let mut chars = text.chars();
        let first = chars.next();
        Self {
            chars,
            index: 0,
            line: 1,
            col: 1,
            current: first,
            errors: Vec::new(),
        }
    }
    pub fn next(&mut self) -> Token {
        let pos = self.pos();
        match self.current {
            Some(' ' | '\t' | '\r') => {
                self.step();
                loop {
                    match self.current {
                        Some(' ' | '\t' | '\r') => self.step(),
                        _ => break self.next(),
                    }
                }
            }
            Some(';') => {
                self.step();
                loop {
                    match self.current {
                        Some('\n') | None => break self.next(),
                        _ => {
                            self.step();
                        }
                    }
                }
            }
            Some('\n') => {
                self.step();
                self.token(TokenType::Newline, pos)
            }
            Some('a'..='z' | 'A'..='Z' | '_') => {
                self.step();
                loop {
                    match self.current {
                        Some('a'..='z' | 'A'..='Z' | '0'..='9' | '_') => self.step(),
                        _ => break self.token(TokenType::Id, pos),
                    }
                }
            }
            Some('1'..='9') => {
                self.step();
                loop {
                    match self.current {
                        Some('0'..='9') => self.step(),
                        _ => break self.token(TokenType::Int, pos),
                    }
                }
            }
            Some('0') => {
                self.step();
                match self.current {
                    Some('x') => {
                        self.step();
                        loop {
                            match self.current {
                                Some('0'..='9' | 'a'..='f' | 'A'..='F') => self.step(),
                                _ => break self.token(TokenType::Hex, pos),
                            }
                        }
                    }
                    Some('b') => {
                        self.step();
                        loop {
                            match self.current {
                                Some('0' | '1') => self.step(),
                                _ => break self.token(TokenType::Binary, pos),
                            }
                        }
                    }
                    _ => self.token(TokenType::Int, pos),
                }
            }
            Some('[') => {
                self.step();
                self.token(TokenType::LBracket, pos)
            }
            Some(']') => {
                self.step();
                self.token(TokenType::RBracket, pos)
            }
            Some('.') => {
                self.step();
                self.token(TokenType::Dot, pos)
            }
            Some(',') => {
                self.step();
                self.token(TokenType::Comma, pos)
            }
            Some(':') => {
                self.step();
                self.token(TokenType::Colon, pos)
            }
            Some(_) => {
                self.step();
                self.add_error("unexpected char", pos.clone());
                self.token(TokenType::Error, pos)
            }
            None => self.token(TokenType::Eof, pos),
        }
    }
    pub fn errors(self) -> Vec<Error> {
        self.errors
    }
    fn add_error<S: Into<String>>(&mut self, message: S, pos: Pos) {
        self.errors.push(Error {
            message: message.into(),
            pos,
        })
    }
    fn step(&mut self) {
        if self.done() {
            return;
        }
        match self.current() {
            '\n' => {
                self.line += 1;
                self.col = 1;
            }
            _ => {
                self.col += 1;
            }
        }
        self.index += 1;
        self.current = self.chars.next();
    }
    fn token(&self, token_type: TokenType, pos: Pos) -> Token {
        Token {
            token_type,
            length: self.index - pos.index,
            pos,
        }
    }
    fn pos(&self) -> Pos {
        Pos {
            index: self.index,
            line: self.line,
            col: self.col,
        }
    }
    fn done(&self) -> bool {
        self.current.is_none()
    }
    fn current(&self) -> char {
        self.current.unwrap()
    }
}

struct Parser<'a> {
    text: &'a str,
    lexer: Lexer<'a>,
}

fn main() {
    let text = "
        add r0, 12 ; asdasd
        mov r1, r0
        mov r1, 1 - 2
        mov r1, r0
        add [r0], 12 ; asd
        mov r1, 1 - 2
        mov r1, r0
    ";

    let mut lexer = Lexer::new(text);
    loop {
        let token = lexer.next();
        if token.token_type == TokenType::Eof {
            break;
        }
    }
    for error in lexer.errors() {
        println!("{}", error.formatted(text, "file.asm"));
    }
}
