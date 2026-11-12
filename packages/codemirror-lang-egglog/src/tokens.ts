import {ExternalTokenizer} from "@lezer/lr"
import {word, Integer, Float, Bool, Wildcard, Option} from "./egglog.grammar.terms"

// Whitespace is Rust's `char::is_whitespace`, as in the grammar's `space`.
const delimiter = /[\t\n\v\f\r \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000;()]/
const integer = /^[+-]?[0-9]+$/
const float = /^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$/
const minI64 = -(2n ** 63n)
const maxI64 = 2n ** 63n - 1n

/// egglog's `SexpParser` token classification: anything up to whitespace, `;`, `(` or `)`
/// that does not start a string is a boolean, an `i64`, a finite `f64` (or `NaN`, `inf`,
/// `-inf`), or else an atom.
function classify(text: string) {
  if (text == "true" || text == "false") return Bool
  if (integer.test(text) && BigInt(text) >= minI64 && BigInt(text) <= maxI64) return Integer
  if (text == "NaN" || text == "inf" || text == "-inf") return Float
  if (float.test(text) && Number.isFinite(Number(text))) return Float
  if (text == "_") return Wildcard
  if (text.startsWith(":")) return Option
  return word
}

export const atoms = new ExternalTokenizer(input => {
  let text = ""
  for (let c = input.next; c >= 0 && !delimiter.test(String.fromCharCode(c)); c = input.advance()) {
    if (!text && c == 34 /* " */) return
    text += String.fromCharCode(c)
  }
  if (text) input.acceptToken(classify(text))
})
