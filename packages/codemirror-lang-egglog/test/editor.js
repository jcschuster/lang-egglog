import {egglog} from "../dist/index.js"
import {EditorState} from "@codemirror/state"
import {CompletionContext} from "@codemirror/autocomplete"
import {foldable, getIndentation} from "@codemirror/language"
import assert from "assert"

const state = doc => EditorState.create({doc, extensions: [egglog()]})

describe("completion", () => {
  // Labels offered at the end of `doc`.
  function labels(doc, explicit = false) {
    const s = state(doc)
    const [source] = s.languageDataAt("autocomplete", doc.length)
    const result = source(new CompletionContext(s, doc.length, explicit))
    return result && result.options.map(option => option.label)
  }

  it("offers commands and actions in a top-level head", () => {
    const offered = labels("(ru")
    assert.ok(offered.includes("rule") && offered.includes("run") && offered.includes("let"))
    assert.ok(!offered.includes("saturate"))
  })

  it("offers actions and schedules in a nested head", () => {
    const offered = labels("(run-schedule (sat")
    assert.ok(offered.includes("saturate") && offered.includes("run") && offered.includes("set"))
    assert.ok(!offered.includes("rule"))
  })

  it("offers options after a colon", () => {
    assert.ok(labels("(function f () i64 :me").includes(":merge"))
  })

  it("offers nothing in argument position, or on an empty head unless asked", () => {
    assert.equal(labels("(let ru"), null)
    assert.equal(labels("("), null)
    assert.ok(labels("(", true).includes("rule"))
  })
})

describe("indentation", () => {
  // Indentation of the last line of `doc`.
  const indent = doc => getIndentation(state(doc), doc.lastIndexOf("\n") + 1)

  it("aligns with the first argument on the opening line", () => {
    assert.equal(indent("(rule ((= a b))\n"), 6)
  })

  it("indents one unit when the head stands alone", () => {
    assert.equal(indent("(datatype\n"), 2)
    assert.equal(indent("  (datatype\n"), 4)
  })

  it("lines a closing paren up with its opening one", () => {
    assert.equal(indent("(run-schedule\n  (seq\n    (run)\n    )"), 2)
  })
})

describe("folding", () => {
  it("folds a list inside its parens", () => {
    const doc = "(datatype Math\n  (Num i64))"
    assert.deepStrictEqual(foldable(state(doc), 0, doc.indexOf("\n")), {from: 1, to: doc.length - 1})
  })
})
