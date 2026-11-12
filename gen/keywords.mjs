// Reads egglog's parser, src/ast/parse.rs at the release that the package's package.json
// names under "egglog", and writes its head keywords and option names to
// spec/keywords.json, recording the source in spec/SOURCE. Fails on an empty category,
// and on a category that lost entries (after writing, so the diff can be reviewed).
import {createHash} from "node:crypto"
import {existsSync, readFileSync, writeFileSync} from "node:fs"

const root = new URL("../", import.meta.url)
const file = path => new URL(path, root)

const {version} = JSON.parse(readFileSync(file("packages/codemirror-lang-egglog/package.json"), "utf8")).egglog
const url = `https://raw.githubusercontent.com/egraphs-good/egglog/v${version}/src/ast/parse.rs`
const response = await fetch(url)
if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`)
const rust = await response.text()
const sha256 = createHash("sha256").update(rust).digest("hex")

const sourcePath = file("spec/SOURCE")
const recorded = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : ""
const field = name => new RegExp(`^${name}: (.*)$`, "m").exec(recorded)?.[1]
if (field("url") == url && field("sha256") != sha256)
  throw new Error(`${url} changed since spec/SOURCE was written: sha256 ${sha256}, recorded ${field("sha256")}`)

// The unit tests at the end of parse.rs hold egglog programs, not parser code.
const code = rust.slice(0, rust.indexOf("#[cfg(test)]"))
const tokens = scan(code)

const options = [...new Set(tokens.filter(t => t.string && /^:[a-z][a-z-]*$/.test(t.string)).map(t => t.string))]
const keywords = {
  commands: heads("parse_command"),
  actions: heads("parse_action"),
  schedules: heads("parse_schedule"),
  facts: heads("parse_fact"),
  options: options.filter(o => !o.startsWith(":internal-")).sort(),
  internalOptions: options.filter(o => o.startsWith(":internal-")).sort(),
}

const keywordsPath = file("spec/keywords.json")
const previous = existsSync(keywordsPath) ? JSON.parse(readFileSync(keywordsPath, "utf8")) : {}
const empty = Object.keys(keywords).filter(category => !keywords[category].length)
if (empty.length) throw new Error(`found no ${empty.join(", ")} in ${url}`)
let shrunk = false
for (const [category, words] of Object.entries(keywords)) {
  const before = previous[category] ?? []
  const added = words.filter(w => !before.includes(w))
  const removed = before.filter(w => !words.includes(w))
  if (added.length) console.log(`${category} added: ${added.join(" ")}`)
  if (removed.length) console.log(`${category} removed: ${removed.join(" ")}`)
  shrunk ||= removed.length > 0
}

writeFileSync(keywordsPath, JSON.stringify(keywords, null, 2) + "\n")
if (field("url") != url) {
  const date = new Date().toISOString().slice(0, 10)
  writeFileSync(sourcePath, `url: ${url}\nversion: ${version}\nsha256: ${sha256}\ndate: ${date}\n`)
}
if (shrunk) {
  console.error("Keywords were removed (listed above). spec/keywords.json is written: if egglog really dropped them, review the diff and rerun.")
  process.exit(1)
}

// The string literals of the outermost arms of the first `match head.as_str()` in
// function `name`, sorted.
function heads(name) {
  const match = code.indexOf("match head.as_str() {", code.indexOf(`fn ${name}(`))
  if (match < 0) throw new Error(`no \`match head.as_str()\` in fn ${name}`)
  const start = match + "match head.as_str() ".length
  const result = []
  let depth = 0
  for (const token of tokens) {
    if (token.at < start) continue
    if (token.open) depth++
    else if (token.close && --depth == 0) break
    else if (token.string != null && depth == 1 && /^\s*(=>|\|)/.test(code.slice(token.end))) result.push(token.string)
  }
  return [...new Set(result)].sort()
}

// The brackets and string literals of Rust source, skipping comments and char literals.
function scan(text) {
  const tokens = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (text.startsWith("//", i)) i = past("\n", i)
    else if (text.startsWith("/*", i)) i = past("*/", i)
    else if (c == "'") i += (/^'(\\.|[^\\'])'/.exec(text.slice(i))?.[0].length ?? 1) - 1
    else if (c == '"') {
      let j = i + 1
      while (text[j] != '"') j += text[j] == "\\" ? 2 : 1
      tokens.push({at: i, end: j + 1, string: text.slice(i + 1, j)})
      i = j
    } else if ("([{".includes(c)) tokens.push({at: i, open: true})
    else if (")]}".includes(c)) tokens.push({at: i, close: true})
  }
  return tokens

  function past(end, from) {
    const at = text.indexOf(end, from)
    return at < 0 ? text.length : at + end.length - 1
  }
}
