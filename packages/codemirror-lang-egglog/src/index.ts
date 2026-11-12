import {parser} from "./egglog.grammar"
import {commands, actions, schedules, options} from "./keywords"
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  syntaxTree,
  TreeIndentContext,
} from "@codemirror/language"
import type {Completion, CompletionContext, CompletionResult} from "@codemirror/autocomplete"

/// Lisp-style indentation: a closing paren lines up with its opening one, an argument with
/// the first argument when that follows the head on the opening line, and anything else
/// one unit in from the opening paren.
function lispIndent(context: TreeIndentContext) {
  const open = context.node.firstChild!
  if (/^\s*\)/.test(context.textAfter)) return context.column(open.from)
  let head = open.nextSibling
  while (head?.name == "LineComment") head = head.nextSibling
  let argument = head?.nextSibling
  while (argument?.name == "LineComment") argument = argument.nextSibling
  if (argument && argument.name != ")" && context.lineAt(argument.from).from == context.lineAt(open.from).from)
    return context.column(argument.from)
  return context.column(open.from) + context.unit
}

const completions = (words: readonly string[], type: string): Completion[] => words.map(label => ({label, type}))
const topLevelHeads = completions([...commands, ...actions], "keyword")
const nestedHeads = completions([...new Set([...actions, ...schedules])], "keyword")
const optionCompletions = completions(options, "property")

/// Commands and actions in the head of a top-level list, actions and schedules in the head
/// of a nested one, and option names after `:`.
function egglogCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[^\s;()"]*/)!
  if (word.text.startsWith(":")) return {from: word.from, options: optionCompletions, validFor: /^:[^\s;()"]*$/}
  if (context.state.sliceDoc(word.from - 1, word.from) != "(" || (!word.text && !context.explicit)) return null
  const list = syntaxTree(context.state).resolveInner(word.from, -1).parent
  return {
    from: word.from,
    options: list?.parent?.type.isTop ? topLevelHeads : nestedHeads,
    validFor: /^[^\s;()":]*$/,
  }
}

/// The egglog language: highlighting (from `highlight.ts`, attached by the grammar), folding
/// of lists, Lisp-style indentation and keyword completion.
export const egglogLanguage = LRLanguage.define({
  name: "egglog",
  parser: parser.configure({
    props: [indentNodeProp.add({"List Unit": lispIndent}), foldNodeProp.add({List: foldInside})],
  }),
  languageData: {
    commentTokens: {line: ";"},
    closeBrackets: {brackets: ["(", '"']},
    autocomplete: egglogCompletion,
  },
})

/// egglog language support for CodeMirror.
export function egglog() {
  return new LanguageSupport(egglogLanguage)
}
