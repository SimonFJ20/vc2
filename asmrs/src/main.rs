#![allow(dead_code)]

use std::str::Chars;

#[derive(Debug, Clone)]
struct Pos {
    index: usize,
    line: i32,
    col: i32,
}

impl Pos {
    pub fn value<'a>(&self, text: &'a str, length: usize) -> &'a str {
        &text[self.index..self.index + length]
    }
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
        self.pos.value(text, self.length)
    }
}

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
    pub fn next_token(&mut self) -> Option<Token> {
        let pos = self.pos();
        match self.current {
            Some(' ' | '\t' | '\r') => {
                self.step();
                loop {
                    match self.current {
                        Some(' ' | '\t' | '\r') => self.step(),
                        _ => break self.next_token(),
                    }
                }
            }
            Some(';') => {
                self.step();
                loop {
                    match self.current {
                        Some('\n') | None => break self.next_token(),
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
            None => None,
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
    fn token(&self, token_type: TokenType, pos: Pos) -> Option<Token> {
        Some(Token {
            token_type,
            length: self.index - pos.index,
            pos,
        })
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

impl<'a> Iterator for Lexer<'a> {
    type Item = Token;
    fn next(&mut self) -> Option<Self::Item> {
        self.next_token()
    }
}

#[derive(Debug, Clone)]
enum Line {
    Label(Label),
    Instruction(Instruction),
}

#[derive(Debug, Clone)]
struct Label {
    value: String,
    label_type: LabelType,
}

#[derive(Debug, Clone)]
enum LabelType {
    Global,
    Local,
}

#[derive(Debug, Clone)]
struct Instruction {
    operator: String,
    attribute: Option<String>,
    operands: Vec<Operand>,
}

#[derive(Debug, Clone)]
enum Operand {
    Value(Value),
    Address(Value),
}

#[derive(Debug, Clone)]
enum Value {
    Id(String),
    Int(i32),
}

struct Parser<'a> {
    text: &'a str,
    lexer: Lexer<'a>,
    current: Option<Token>,
    last_pos: Pos,
    errors: Vec<Error>,
}

impl<'a> Parser<'a> {
    pub fn new(text: &'a str) -> Self {
        let mut lexer = Lexer::new(text);
        let first = lexer.next_token();
        Self {
            text,
            lexer: Lexer::new(text),
            current: first,
            last_pos: Pos {
                index: 0,
                line: 1,
                col: 1,
            },
            errors: Vec::new(),
        }
    }

    pub fn parse(&mut self) -> Vec<Line> {
        let mut lines = Vec::<Line>::new();
        while self.current.is_some() {
            match self.parse_line() {
                Ok(line) => {
                    lines.push(line);
                }
                Err(_) => loop {
                    match self.current() {
                        Some(TokenType::Newline) | None => break,
                        _ => self.step(),
                    }
                },
            }
        }
        lines
    }

    pub fn errors(self) -> Vec<Error> {
        [self.lexer.errors(), self.errors].concat()
    }

    fn parse_line(&mut self) -> Result<Line, ()> {
        let line = match self.current() {
            Some(TokenType::Dot) => self.parse_local_label(),
            Some(TokenType::Id) => self.parse_global_label_or_instruction(),
            _ => {
                let pos = self.pos();
                self.add_error("expected label, instruction or directive", pos);
                return Err(());
            }
        };
        match self.current() {
            Some(TokenType::Newline) | None => {
                while self.current_is(TokenType::Newline) {
                    self.step()
                }
            }
            _ => {
                let pos = self.pos();
                self.add_error("expected newline", pos);
                return Err(());
            }
        }
        line
    }

    fn parse_local_label(&mut self) -> Result<Line, ()> {
        self.step();
        if !self.current_is(TokenType::Id) {
            let pos = self.pos();
            self.add_error("expected id", pos);
            return Err(());
        }
        let value = self.current.as_ref().unwrap().value(self.text).to_string();
        self.step();
        if !self.current_is(TokenType::Colon) {
            let pos = self.pos();
            self.add_error("expected ':'", pos);
            return Err(());
        }
        self.step();
        Ok(Line::Label(Label {
            value,
            label_type: LabelType::Local,
        }))
    }

    fn parse_global_label_or_instruction(&mut self) -> Result<Line, ()> {
        let value = self.current.as_ref().unwrap().value(self.text).to_string();
        self.step();
        match self.current() {
            Some(TokenType::Colon) => {
                self.step();
                Ok(Line::Label(Label {
                    value,
                    label_type: LabelType::Global,
                }))
            }
            _ => self.parse_instruction(value),
        }
    }

    fn parse_instruction(&mut self, operator: String) -> Result<Line, ()> {
        let attribute = if self.current_is(TokenType::Id) {
            let value = self.current.as_ref().unwrap().value(self.text).to_string();
            self.step();
            Some(value)
        } else {
            None
        };
        let mut operands = Vec::<Operand>::new();
        match self.current() {
            Some(TokenType::Newline) | None => {}
            _ => {
                operands.push(self.parse_operand()?);
                match self.current() {
                    Some(TokenType::Comma) => {
                        self.step();
                    }
                    Some(TokenType::Newline) | None => {}
                    _ => {
                        let pos = self.pos();
                        self.add_error("expected operand", pos);
                        return Err(());
                    }
                }
            }
        }
        Ok(Line::Instruction(Instruction {
            operator,
            attribute,
            operands,
        }))
    }

    fn parse_operand(&mut self) -> Result<Operand, ()> {
        Err(())
    }

    fn add_error<S: Into<String>>(&mut self, message: S, pos: Pos) {
        self.errors.push(Error {
            message: message.into(),
            pos,
        })
    }
    fn step(&mut self) {
        if let Some(token) = &self.current {
            self.last_pos = token.pos.clone();
        }
        self.current = self.lexer.next();
    }
    fn pos(&mut self) -> Pos {
        self.current
            .clone()
            .map_or_else(|| self.last_pos.clone(), |token| token.pos)
    }
    fn done(&self) -> bool {
        self.current.is_none()
    }
    fn current(&self) -> Option<TokenType> {
        self.current.clone().map(|t| t.token_type)
    }
    fn current_is(&self, token_type: TokenType) -> bool {
        self.current() == Some(token_type)
    }
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
        let token = lexer.next_token();
        if token.is_some() {
            break;
        }
    }
    for error in lexer.errors() {
        println!("{}", error.formatted(text, "file.asm"));
    }
}
