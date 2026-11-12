// Checks the Lezer parser against egglog's own tests/**/*.egg at the pinned release,
// downloaded to corpus/ (not committed): every file that `egglog --mode desugar` (parse and
// typecheck, no run) accepts must parse without error nodes. Needs `egglog` on PATH and a
// built package.
import {execFileSync, spawnSync} from "node:child_process"
import {existsSync, mkdirSync, readFileSync, readdirSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {egglogLanguage} from "../packages/codemirror-lang-egglog/dist/index.js"

const root = fileURLToPath(new URL("../", import.meta.url))
const {version} = JSON.parse(readFileSync(`${root}packages/codemirror-lang-egglog/package.json`, "utf8")).egglog
const dir = `${root}corpus/${version}`

if (!existsSync(`${dir}/tests`)) {
  mkdirSync(dir, {recursive: true})
  const archive = await fetch(`https://github.com/egraphs-good/egglog/archive/refs/tags/v${version}.tar.gz`)
  if (!archive.ok) throw new Error(`egglog ${version} archive: ${archive.status}`)
  execFileSync("tar", ["xz", "-C", dir, "--strip-components=1", "--wildcards", "*/tests/*"], {
    input: Buffer.from(await archive.arrayBuffer()),
  })
}

// Relative to the egglog checkout, which is where its tests resolve `include` paths from.
const files = readdirSync(`${dir}/tests`, {recursive: true}).filter(f => f.endsWith(".egg")).map(f => `tests/${f}`).sort()
let accepted = 0
const failures = []
for (const file of files) {
  const egglog = spawnSync("egglog", ["--mode", "desugar", file], {cwd: dir, stdio: "ignore", timeout: 60000})
  if (egglog.error) throw egglog.error
  if (egglog.status != 0) continue
  accepted++
  const text = readFileSync(`${dir}/${file}`, "utf8")
  egglogLanguage.parser.parse(text).iterate({
    enter: node => {
      if (node.type.isError) failures.push(`${file}:${node.from}: ${JSON.stringify(text.slice(node.from, node.from + 30))}`)
    },
  })
}

console.log(`${files.length} files, ${accepted} accepted by egglog ${version}, ${failures.length} error nodes in those`)
for (const failure of failures) console.log(`  ${failure}`)
if (!accepted || failures.length) process.exit(1)
