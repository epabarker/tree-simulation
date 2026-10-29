//! Plain JSON with JavaScript's semantics, for params, presets, event logs and checkpoint headers
//! (ADR 0024, I1). The core stays dependency-free, and three things must match the TypeScript
//! core exactly, which a general-purpose crate does not promise:
//!
//! - **Key order.** Objects keep insertion order, as JavaScript's do (params never have
//!   integer-like keys, the one exception to that rule). Seed rain walks `species` in order.
//! - **Numbers.** Parsing is correctly rounded (`str::parse::<f64>`), as `JSON.parse` is, and
//!   `stringify` writes numbers as `Number.prototype.toString` does (shortest round-trip digits,
//!   exponent form below 10⁻⁶ and from 10²¹), so a checkpoint the Rust core writes is the bytes
//!   the TypeScript core writes.
//! - **`mergeParams`** (`src/core/params.ts`): sections merge one level deep, everything else
//!   (arrays included) is replaced, and new keys are appended.

use std::fmt::Write as _;

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Num(f64),
    Str(String),
    Arr(Vec<Value>),
    Obj(Vec<(String, Value)>),
}

impl Value {
    pub fn get(&self, key: &str) -> Option<&Value> {
        match self {
            Value::Obj(fields) => fields.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    pub fn get_mut(&mut self, key: &str) -> Option<&mut Value> {
        match self {
            Value::Obj(fields) => fields.iter_mut().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    /// Sets `key`, in place if present (JavaScript keeps a key's position), else appended.
    pub fn set(&mut self, key: &str, value: Value) {
        if let Value::Obj(fields) = self {
            if let Some(slot) = fields.iter_mut().find(|(k, _)| k == key) {
                slot.1 = value;
            } else {
                fields.push((key.to_string(), value));
            }
        }
    }

    pub fn remove(&mut self, key: &str) -> Option<Value> {
        if let Value::Obj(fields) = self {
            let i = fields.iter().position(|(k, _)| k == key)?;
            return Some(fields.remove(i).1);
        }
        None
    }

    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Value::Num(x) => Some(*x),
            _ => None,
        }
    }

    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Value::Bool(b) => Some(*b),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            Value::Str(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_array(&self) -> Option<&[Value]> {
        match self {
            Value::Arr(a) => Some(a),
            _ => None,
        }
    }

    pub fn as_object(&self) -> Option<&[(String, Value)]> {
        match self {
            Value::Obj(o) => Some(o),
            _ => None,
        }
    }

    pub fn is_object(&self) -> bool {
        matches!(self, Value::Obj(_))
    }

    pub fn obj() -> Value {
        Value::Obj(Vec::new())
    }
}

/// `mergeParams(base, patch)`: each key of `patch` replaces `base`'s, except that an object
/// replacing an object is merged into it one level deep (`{ ...current, ...value }`).
pub fn merge(base: &Value, patch: &Value) -> Value {
    let mut out = base.clone();
    let Some(fields) = patch.as_object() else {
        return out;
    };
    for (key, value) in fields {
        match (out.get_mut(key), value) {
            (Some(Value::Obj(current)), Value::Obj(inner)) => {
                for (k, v) in inner {
                    if let Some(slot) = current.iter_mut().find(|(ck, _)| ck == k) {
                        slot.1 = v.clone();
                    } else {
                        current.push((k.clone(), v.clone()));
                    }
                }
            }
            _ => out.set(key, value.clone()),
        }
    }
    out
}

// ---- Parsing -------------------------------------------------------------------------------

#[derive(Debug)]
pub struct ParseError(pub String);

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "JSON: {}", self.0)
    }
}

impl std::error::Error for ParseError {}

pub fn parse(text: &str) -> Result<Value, ParseError> {
    let mut p = Parser {
        s: text.as_bytes(),
        i: 0,
    };
    p.ws();
    let v = p.value()?;
    p.ws();
    if p.i != p.s.len() {
        return Err(p.err("trailing characters"));
    }
    Ok(v)
}

struct Parser<'a> {
    s: &'a [u8],
    i: usize,
}

impl Parser<'_> {
    fn err(&self, what: &str) -> ParseError {
        ParseError(format!("{what} at byte {}", self.i))
    }

    fn ws(&mut self) {
        while self.i < self.s.len() && matches!(self.s[self.i], b' ' | b'\t' | b'\n' | b'\r') {
            self.i += 1;
        }
    }

    fn eat(&mut self, lit: &[u8]) -> Result<(), ParseError> {
        if self.s[self.i..].starts_with(lit) {
            self.i += lit.len();
            Ok(())
        } else {
            Err(self.err("unexpected token"))
        }
    }

    fn value(&mut self) -> Result<Value, ParseError> {
        match self.s.get(self.i) {
            Some(b'{') => {
                self.i += 1;
                let mut fields: Vec<(String, Value)> = Vec::new();
                self.ws();
                if self.s.get(self.i) == Some(&b'}') {
                    self.i += 1;
                    return Ok(Value::Obj(fields));
                }
                loop {
                    self.ws();
                    let key = self.string()?;
                    self.ws();
                    self.eat(b":")?;
                    self.ws();
                    let v = self.value()?;
                    // JSON.parse: a repeated key keeps its first position and its last value.
                    if let Some(slot) = fields.iter_mut().find(|(k, _)| *k == key) {
                        slot.1 = v;
                    } else {
                        fields.push((key, v));
                    }
                    self.ws();
                    match self.s.get(self.i) {
                        Some(b',') => self.i += 1,
                        Some(b'}') => {
                            self.i += 1;
                            return Ok(Value::Obj(fields));
                        }
                        _ => return Err(self.err("expected , or }")),
                    }
                }
            }
            Some(b'[') => {
                self.i += 1;
                let mut items = Vec::new();
                self.ws();
                if self.s.get(self.i) == Some(&b']') {
                    self.i += 1;
                    return Ok(Value::Arr(items));
                }
                loop {
                    self.ws();
                    items.push(self.value()?);
                    self.ws();
                    match self.s.get(self.i) {
                        Some(b',') => self.i += 1,
                        Some(b']') => {
                            self.i += 1;
                            return Ok(Value::Arr(items));
                        }
                        _ => return Err(self.err("expected , or ]")),
                    }
                }
            }
            Some(b'"') => Ok(Value::Str(self.string()?)),
            Some(b't') => self.eat(b"true").map(|_| Value::Bool(true)),
            Some(b'f') => self.eat(b"false").map(|_| Value::Bool(false)),
            Some(b'n') => self.eat(b"null").map(|_| Value::Null),
            Some(c) if *c == b'-' || c.is_ascii_digit() => self.number(),
            _ => Err(self.err("unexpected character")),
        }
    }

    fn number(&mut self) -> Result<Value, ParseError> {
        let start = self.i;
        while self.i < self.s.len()
            && matches!(
                self.s[self.i],
                b'-' | b'+' | b'.' | b'e' | b'E' | b'0'..=b'9'
            )
        {
            self.i += 1;
        }
        let text = std::str::from_utf8(&self.s[start..self.i]).unwrap();
        // Correctly rounded, as JSON.parse is.
        text.parse::<f64>()
            .map(Value::Num)
            .map_err(|_| self.err("bad number"))
    }

    fn hex4(&mut self) -> Result<u32, ParseError> {
        let h = self
            .s
            .get(self.i..self.i + 4)
            .ok_or_else(|| self.err("short \\u escape"))?;
        let h = std::str::from_utf8(h).map_err(|_| self.err("bad \\u escape"))?;
        self.i += 4;
        u32::from_str_radix(h, 16).map_err(|_| self.err("bad \\u escape"))
    }

    fn string(&mut self) -> Result<String, ParseError> {
        self.eat(b"\"")?;
        // Built as UTF-16, as JavaScript strings are, so lone surrogates survive as U+FFFD only
        // at the end (params never hold them).
        let mut units: Vec<u16> = Vec::new();
        loop {
            let c = *self
                .s
                .get(self.i)
                .ok_or_else(|| self.err("unterminated string"))?;
            self.i += 1;
            match c {
                b'"' => break,
                b'\\' => {
                    let e = *self.s.get(self.i).ok_or_else(|| self.err("bad escape"))?;
                    self.i += 1;
                    let unit = match e {
                        b'"' => b'"' as u32,
                        b'\\' => b'\\' as u32,
                        b'/' => b'/' as u32,
                        b'b' => 8,
                        b'f' => 12,
                        b'n' => 10,
                        b'r' => 13,
                        b't' => 9,
                        b'u' => self.hex4()?,
                        _ => return Err(self.err("bad escape")),
                    };
                    units.push(unit as u16);
                }
                _ => {
                    // A UTF-8 sequence: decode it to code units.
                    let len = match c {
                        0x00..=0x7f => 1,
                        0xc0..=0xdf => 2,
                        0xe0..=0xef => 3,
                        _ => 4,
                    };
                    let start = self.i - 1;
                    let bytes = self
                        .s
                        .get(start..start + len)
                        .ok_or_else(|| self.err("bad UTF-8"))?;
                    let ch = std::str::from_utf8(bytes).map_err(|_| self.err("bad UTF-8"))?;
                    self.i = start + len;
                    let mut buf = [0u16; 2];
                    for u in ch.chars().next().unwrap().encode_utf16(&mut buf) {
                        units.push(*u);
                    }
                }
            }
        }
        Ok(String::from_utf16_lossy(&units))
    }
}

// ---- Writing -------------------------------------------------------------------------------

/// `Number.prototype.toString()` (ECMA-262 Number::toString with radix 10).
pub fn number_to_string(x: f64) -> String {
    if x.is_nan() {
        return "NaN".into();
    }
    if x == 0.0 {
        return "0".into();
    }
    if x.is_infinite() {
        return if x > 0.0 { "Infinity" } else { "-Infinity" }.into();
    }
    let mut out = String::new();
    if x < 0.0 {
        out.push('-');
    }
    // Shortest round-trip digits: Rust's `{:e}` gives d.ddde±n with the fewest digits that read
    // back to x, choosing the closest such, as the specification asks.
    let e = format!("{:e}", x.abs());
    let (mantissa, exp) = e.split_once('e').unwrap();
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let k = digits.len() as i32;
    let n = exp.parse::<i32>().unwrap() + 1; // x = 0.d1…dk × 10ⁿ
    if k <= n && n <= 21 {
        out.push_str(&digits);
        for _ in 0..(n - k) {
            out.push('0');
        }
    } else if 0 < n && n <= 21 {
        out.push_str(&digits[..n as usize]);
        out.push('.');
        out.push_str(&digits[n as usize..]);
    } else if -6 < n && n <= 0 {
        out.push_str("0.");
        for _ in 0..(-n) {
            out.push('0');
        }
        out.push_str(&digits);
    } else {
        out.push_str(&digits[..1]);
        if k > 1 {
            out.push('.');
            out.push_str(&digits[1..]);
        }
        out.push('e');
        let e = n - 1;
        out.push(if e < 0 { '-' } else { '+' });
        write!(out, "{}", e.abs()).unwrap();
    }
    out
}

/// `JSON.stringify(value)` (no indentation). With `ascii`, every UTF-16 unit from U+007F up is
/// written as a `\uXXXX` escape, as the checkpoint's `asciiJson` does.
pub fn stringify(value: &Value, ascii: bool) -> String {
    let mut out = String::new();
    write_value(&mut out, value, ascii, None, 0);
    out
}

/// `JSON.stringify(value, null, indent)`.
pub fn stringify_pretty(value: &Value, indent: usize) -> String {
    let mut out = String::new();
    write_value(&mut out, value, false, Some(indent), 0);
    out
}

fn newline(out: &mut String, indent: Option<usize>, depth: usize) {
    if let Some(n) = indent {
        out.push('\n');
        for _ in 0..n * depth {
            out.push(' ');
        }
    }
}

fn write_value(out: &mut String, value: &Value, ascii: bool, indent: Option<usize>, depth: usize) {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Num(x) => {
            if x.is_finite() {
                out.push_str(&number_to_string(*x));
            } else {
                out.push_str("null");
            }
        }
        Value::Str(s) => write_string(out, s, ascii),
        Value::Arr(items) => {
            out.push('[');
            for (i, v) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                newline(out, indent, depth + 1);
                write_value(out, v, ascii, indent, depth + 1);
            }
            if !items.is_empty() {
                newline(out, indent, depth);
            }
            out.push(']');
        }
        Value::Obj(fields) => {
            out.push('{');
            for (i, (k, v)) in fields.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                newline(out, indent, depth + 1);
                write_string(out, k, ascii);
                out.push(':');
                if indent.is_some() {
                    out.push(' ');
                }
                write_value(out, v, ascii, indent, depth + 1);
            }
            if !fields.is_empty() {
                newline(out, indent, depth);
            }
            out.push('}');
        }
    }
}

fn write_string(out: &mut String, s: &str, ascii: bool) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => write!(out, "\\u{:04x}", c as u32).unwrap(),
            c if ascii && (c as u32) >= 0x7f => {
                let mut buf = [0u16; 2];
                for u in c.encode_utf16(&mut buf) {
                    write!(out, "\\u{:04x}", u).unwrap();
                }
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers_print_as_javascript_prints_them() {
        for (x, s) in [
            (1.0, "1"),
            (-0.0, "0"),
            (0.1, "0.1"),
            (1e21, "1e+21"),
            (1e20, "100000000000000000000"),
            (123456789012345680000.0, "123456789012345680000"),
            (1.5e-7, "1.5e-7"),
            (0.000001, "0.000001"),
            (1e-7, "1e-7"),
            (0.1 + 0.2, "0.30000000000000004"),
            (5e-324, "5e-324"),
            (1.7976931348623157e308, "1.7976931348623157e+308"),
            (-2.5, "-2.5"),
            (100.0, "100"),
            (1234.5678, "1234.5678"),
        ] {
            assert_eq!(number_to_string(x), s, "{x:e}");
        }
    }

    #[test]
    fn round_trips_keep_order_and_bits() {
        let text = r#"{"b":1,"a":[0.1,-2e-9,true,null,"x\"é"],"c":{"z":1,"y":2}}"#;
        let v = parse(text).unwrap();
        assert_eq!(
            stringify(&v, false),
            r#"{"b":1,"a":[0.1,-2e-9,true,null,"x\"é"],"c":{"z":1,"y":2}}"#
        );
        assert_eq!(
            stringify(&v, true),
            "{\"b\":1,\"a\":[0.1,-2e-9,true,null,\"x\\\"\\u00e9\"],\"c\":{\"z\":1,\"y\":2}}"
        );
    }

    #[test]
    fn merge_is_merge_params() {
        let base =
            parse(r#"{"c3":{"mode":"none","lambda":0.5},"trees":[{"x":1}],"seed":1}"#).unwrap();
        let patch =
            parse(r#"{"c3":{"lambda":0.6,"new":1},"trees":[{"x":2}],"extra":true}"#).unwrap();
        assert_eq!(
            stringify(&merge(&base, &patch), false),
            r#"{"c3":{"mode":"none","lambda":0.6,"new":1},"trees":[{"x":2}],"seed":1,"extra":true}"#
        );
    }
}
