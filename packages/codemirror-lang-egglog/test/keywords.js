import {egglogLanguage} from "../dist/index.js"
import assert from "assert"
import * as fs from "fs"

const keywords = JSON.parse(fs.readFileSync(new URL("../../../spec/keywords.json", import.meta.url), "utf8"))

// The node names of the heads of the top-level list and of the list nested in it.
function heads(word) {
  const names = []
  egglogLanguage.parser.parse(`(${word} (${word}))`).iterate({
    enter: node => { if (node.name == "List") names.push(node.node.getChild("(").nextSibling.name) },
  })
  return names
}

describe("keyword tables", () => {
  for (const word of keywords.commands)
    it(`command ${word}`, () => assert.equal(heads(word)[0], "CommandKeyword"))
  for (const word of keywords.actions)
    it(`action ${word}`, () => assert.deepStrictEqual(heads(word), ["ActionKeyword", "ActionKeyword"]))
  for (const word of keywords.schedules)
    it(`schedule ${word}`, () => assert.equal(heads(word)[1], "ScheduleKeyword"))
})
