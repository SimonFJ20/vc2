#![allow(dead_code)]

mod set;

use std::str::Chars;

#[derive(Clone)]
struct Pos {
    index: usize,
    line: i32,
    col: i32,
}

struct Error {
    pos: Pos,
    message: String,
}

enum TokenType {
    Error,
    Id,
    Int,
    Hex,
    Binary,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Comma,
    Colon,
    Dollarsign,
    Plus,
    Minus,
    Asterisk,
    Slash,
    Percent,
    Ampersand,
    Pipe,
    Exclamation,
    Lt,
    Gt,
}

struct Token {
    token_type: TokenType,
    length: usize,
    pos: Pos,
}

struct Lexer<'a> {
    chars: Chars<'a>,
    index: usize,
    line: i32,
    col: i32,
    current: Option<char>,
    pub errors: Vec<Error>,
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
            errors: vec![],
        }
    }

    fn internal_next(&mut self) -> Option<Token> {
        let pos = self.pos();
        match self.current {
            None => None,
            Some(' ' | '\t' | '\r' | '\n') => loop {
                match self.current {
                    Some(' ' | '\t' | '\r' | '\n') => self.step(),
                    _ => break self.internal_next(),
                }
            },
            Some(';') => loop {
                match self.current {
                    None | Some('\n') => break self.internal_next(),
                    _ => self.step(),
                }
            },
            Some('a'..='z' | 'A'..='Z' | '_') => loop {
                match self.current {
                    Some('a'..='z' | 'A'..='Z' | '0'..='9' | '_') => {
                        self.step();
                    }
                    _ => break Some(self.token(TokenType::Id, pos)),
                }
            },
            Some('1'..='9') => loop {
                match self.current {
                    Some('0'..='9') => {
                        self.step();
                    }
                    _ => break Some(self.token(TokenType::Int, pos)),
                }
            },
            Some('0') => {
                self.step();
                match self.current {
                    Some('x') => {
                        self.step();
                        match self.current {
                            Some('0'..='9' | 'a'..='f' | 'A'..='F') => loop {
                                match self.current {
                                    Some('0'..='9' | 'a'..='f' | 'A'..='F') => {}
                                    _ => break Some(self.token(TokenType::Hex, pos)),
                                }
                            },
                            _ => {
                                self.add_error(pos.clone(), "malformed hex literal");
                                Some(self.token(TokenType::Error, pos))
                            }
                        }
                    }
                    Some('b') => {
                        self.step();
                        match self.current {
                            Some('0' | '1') => loop {
                                match self.current {
                                    Some('0' | '1') => {}
                                    _ => break Some(self.token(TokenType::Binary, pos)),
                                }
                            },
                            _ => {
                                self.add_error(pos.clone(), "malformed binary literal");
                                Some(self.token(TokenType::Error, pos))
                            }
                        }
                    }
                    _ => Some(self.token(TokenType::Int, pos)),
                }
            }
            Some(c) => {
                self.step();
                Some(self.token(
                    match c {
                        '(' => TokenType::LParen,
                        ')' => TokenType::RParen,
                        '[' => TokenType::LBracket,
                        ']' => TokenType::RBracket,
                        ',' => TokenType::Comma,
                        ':' => TokenType::Colon,
                        '$' => TokenType::Dollarsign,
                        '+' => TokenType::Plus,
                        '-' => TokenType::Minus,
                        '*' => TokenType::Asterisk,
                        '/' => TokenType::Slash,
                        '%' => TokenType::Percent,
                        '&' => TokenType::Ampersand,
                        '|' => TokenType::Pipe,
                        '!' => TokenType::Exclamation,
                        '<' => TokenType::Lt,
                        '>' => TokenType::Gt,
                        _ => TokenType::Error,
                    },
                    pos,
                ))
            }
        }
    }

    fn step(&mut self) {
        match self.current {
            Some('\n') => {
                self.line += 1;
                self.col = 1;
            }
            Some(_) => {
                self.col += 1;
            }
            _ => {}
        }
        self.index += 1;
        self.current = self.chars.next();
    }

    fn add_error<S: Into<String>>(&mut self, pos: Pos, message: S) {
        self.errors.push(Error {
            pos: pos.clone(),
            message: message.into(),
        });
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
}

impl<'a> Iterator for Lexer<'a> {
    type Item = Token;

    fn next(&mut self) -> Option<Self::Item> {
        self.internal_next()
    }
}

struct Parser<'a> {
    text: &'a str,
    lexer: Lexer<'a>,
    current: Option<Token>,
    errors: Vec<Error>,
}

impl<'a> Parser<'a> {
    pub fn new(text: &'a str) -> Self {
        let mut lexer = Lexer::new(text);
        let current = lexer.next();
        Self {
            text,
            lexer,
            current,
            errors: vec![],
        }
    }

    fn parse_line(&mut self) -> Result<Line, ()> {
        Err(())
    }

    fn add_error<S: Into<String>>(&mut self, pos: Pos, message: S) {
        self.errors.push(Error {
            pos: pos.clone(),
            message: message.into(),
        });
    }

    fn step(&mut self) {
        self.current = self.lexer.next();
    }

    pub fn errors(mut self) -> Vec<Error> {
        self.errors.append(&mut self.lexer.errors);
        self.errors
    }
}

struct Emitter;

fn main() {
    println!("Hello, world!");
}
