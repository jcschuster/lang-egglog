import type {NodePropSource} from "@lezer/common"
import {styleTags, tags as t} from "@lezer/highlight"

export const egglogHighlighting: NodePropSource = styleTags({
  CommandKeyword: t.definitionKeyword,
  ActionKeyword: t.keyword,
  ScheduleKeyword: t.controlKeyword,
  Option: t.attributeName,
  Callee: t.function(t.variableName),
  Atom: t.variableName,
  Wildcard: t.special(t.variableName),
  Bool: t.bool,
  Integer: t.integer,
  Float: t.float,
  String: t.string,
  LineComment: t.lineComment,
  "( )": t.paren,
})
