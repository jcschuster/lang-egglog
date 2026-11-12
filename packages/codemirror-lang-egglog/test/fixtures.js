import {egglogLanguage} from "../dist/index.js"
import {getStyleTags, highlightTree, tagHighlighter, tags as t} from "@lezer/highlight"
import assert from "assert"
import * as fs from "fs"
import * as path from "path"
import {fileURLToPath} from "url"

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures")
const parse = text => egglogLanguage.parser.parse(text)

describe("fixtures", () => {
  for (const file of fs.readdirSync(fixtures).sort()) {
    it(`${file} parses without error nodes`, () => {
      const text = fs.readFileSync(path.join(fixtures, file), "utf8")
      const errors = []
      parse(text).iterate({
        enter: node => { if (node.type.isError) errors.push(JSON.stringify(text.slice(node.from, node.from + 30))) },
      })
      assert.deepStrictEqual(errors, [])
    })
  }
})

describe("highlighting", () => {
  // One class per tag the highlight table uses, so modified tags stay distinct.
  const highlighter = tagHighlighter([
    {tag: t.definitionKeyword, class: "command"},
    {tag: t.keyword, class: "action"},
    {tag: t.controlKeyword, class: "schedule"},
    {tag: t.attributeName, class: "option"},
    {tag: t.function(t.variableName), class: "callee"},
    {tag: t.variableName, class: "atom"},
    {tag: t.special(t.variableName), class: "wildcard"},
    {tag: t.bool, class: "bool"},
    {tag: t.integer, class: "integer"},
    {tag: t.float, class: "float"},
    {tag: t.string, class: "string"},
    {tag: t.lineComment, class: "comment"},
    {tag: t.paren, class: "paren"},
  ])

  // Map each highlighted piece of text to its class.
  function classes(text) {
    const result = {}
    highlightTree(parse(text), highlighter, (from, to, cls) => {
      result[text.slice(from, to)] = cls
    })
    return result
  }

  const sample = '; note\n(rule ((= e (f _ 1 2.5 true "s" ()))) ((let x e)) :name "r")\n(run-schedule (saturate (run)))'

  it("tells every node kind apart", () => {
    const expected = {
      "; note": "comment", "(": "paren", rule: "command", "=": "callee", e: "atom", f: "callee", _: "wildcard",
      1: "integer", 2.5: "float", true: "bool", '"s"': "string", let: "action", x: "atom", ":name": "option",
      "run-schedule": "command", saturate: "schedule", run: "schedule",
    }
    const c = classes(sample)
    assert.deepStrictEqual(Object.fromEntries(Object.keys(expected).map(key => [key, c[key]])), expected)
  })

  // Nodes that carry no tag of their own: their children do.
  const untagged = ["Program", "List", "Unit"]

  it("tags every named node, or lists it as untagged", () => {
    const seen = new Set()
    parse(sample).iterate({
      enter: node => {
        seen.add(node.name)
        assert.equal(!!getStyleTags(node), !untagged.includes(node.name), node.name)
      },
    })
    const named = egglogLanguage.parser.nodeSet.types.filter(type => type.name && !type.isError).map(type => type.name)
    assert.deepStrictEqual([...new Set(named)].filter(name => !seen.has(name)), [])
  })
})
