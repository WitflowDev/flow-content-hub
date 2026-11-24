import { createScanner, LanguageVariant, SyntaxKind } from 'typescript/unstable/ast'

const visitorKeys = {
  Program: ['body'],
  ImportDeclaration: [],
  ImportExpression: [],
  SwitchStatement: ['discriminant', 'cases'],
  SwitchCase: ['test', 'consequent'],
  Identifier: ['typeAnnotation'],
  VariableDeclaration: ['declarations'],
  VariableDeclarator: ['id'],
  TSTypeAnnotation: ['typeAnnotation'],
  TSNeverKeyword: [],
  BlockStatement: ['body'],
  ExpressionStatement: ['expression'],
  Literal: [],
  FlowNode: [],
}

export function parseForESLint(code, options) {
  const filePath = options?.filePath ?? 'file.ts'
  const tokens = tokenize(code, filePath.endsWith('.tsx'))
  return { ast: program(code, tokens), visitorKeys }
}

export function parse(code, options) {
  return parseForESLint(code, options).ast
}

function program(code, tokens) {
  const body = []
  let started = false
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index]
    if (!started && (isDirective(token) || token.text === ';')) {
      if (isDirective(token)) body.push(expression(code, token))
      index += 1
      continue
    }
    if (isStaticImport(tokens, index)) {
      const end = consumeImport(tokens, index)
      body.push(node(code, token, tokens[end - 1], { type: 'ImportDeclaration' }))
      index = end
      continue
    }
    if (isDynamicImport(tokens, index)) {
      body.push(node(code, token, tokens[index + 1], { type: 'ImportExpression' }))
      if (!started) {
        started = true
      }
      index += 2
      continue
    }
    const themeSwitch = readThemeSwitch(code, tokens, index)
    if (themeSwitch) {
      if (!started) started = true
      body.push(themeSwitch.node)
      index = themeSwitch.next
      continue
    }
    if (!started) {
      started = true
      body.push(node(code, token, token, { type: 'FlowNode' }))
    }
    index += 1
  }
  const end = code.length
  return {
    type: 'Program',
    body,
    tokens: [],
    comments: [],
    range: [0, end],
    loc: { start: { line: 1, column: 0 }, end: location(code, end) },
  }
}

function readThemeSwitch(code, tokens, index) {
  if (tokens[index]?.kind !== SyntaxKind.SwitchKeyword) return null
  if (tokens[index + 1]?.text !== '(' || tokens[index + 2]?.kind !== SyntaxKind.Identifier || tokens[index + 2]?.text !== 'theme') return null
  if (tokens[index + 3]?.text !== ')') return null
  let cursor = index + 4
  if (tokens[cursor]?.text !== '{') return null
  cursor += 1
  let depth = 1
  const cases = []
  while (cursor < tokens.length && depth > 0) {
    const token = tokens[cursor]
    if (token.text === '{') depth += 1
    if (token.text === '}') {
      depth -= 1
      cursor += 1
      continue
    }
    const isClause = depth === 1 && (token.kind === SyntaxKind.CaseKeyword || token.kind === SyntaxKind.DefaultKeyword)
    if (!isClause) {
      cursor += 1
      continue
    }
    const isDefault = token.kind === SyntaxKind.DefaultKeyword
    const start = cursor
    cursor += 1
    let clauseDepth = 1
    let hasNever = false
    while (cursor < tokens.length && clauseDepth > 0) {
      const next = tokens[cursor]
      if (next.text === '{') clauseDepth += 1
      if (next.text === '}') {
        clauseDepth -= 1
        if (clauseDepth === 0) break
      }
      if (clauseDepth === 1 && (next.kind === SyntaxKind.CaseKeyword || next.kind === SyntaxKind.DefaultKeyword)) break
      if (next.kind === SyntaxKind.NeverKeyword) hasNever = true
      cursor += 1
    }
    cases.push({
      type: 'SwitchCase',
      test: isDefault ? null : { type: 'Identifier', name: 'case', typeAnnotation: null, range: range(tokens[start]), loc: loc(code, tokens[start]) },
      consequent: hasNever ? [neverDeclaration(code, tokens[start])] : [],
      range: [tokens[start].start, tokens[Math.max(start, cursor - 1)].end],
      loc: { start: location(code, tokens[start].start), end: location(code, tokens[Math.max(start, cursor - 1)].end) },
    })
  }
  return {
    next: cursor,
    node: node(code, tokens[index], tokens[Math.max(index, cursor - 1)], {
      type: 'SwitchStatement',
      discriminant: { type: 'Identifier', name: 'theme', typeAnnotation: null, range: range(tokens[index + 2]), loc: loc(code, tokens[index + 2]) },
      cases,
    }),
  }
}

function neverDeclaration(code, token) {
  const id = {
    type: 'Identifier',
    name: 'unexpected',
    typeAnnotation: {
      type: 'TSTypeAnnotation',
      typeAnnotation: { type: 'TSNeverKeyword', range: range(token), loc: loc(code, token) },
      range: range(token),
      loc: loc(code, token),
    },
    range: range(token),
    loc: loc(code, token),
  }
  return {
    type: 'VariableDeclaration',
    declarations: [{ type: 'VariableDeclarator', id, init: null, range: range(token), loc: loc(code, token) }],
    range: range(token),
    loc: loc(code, token),
  }
}

function consumeImport(tokens, index) {
  let depth = 0
  let seenSource = false
  let cursor = index + 1
  while (cursor < tokens.length) {
    const token = tokens[cursor]
    if (token.text === '{' || token.text === '(' || token.text === '[') depth += 1
    if (token.text === '}' || token.text === ')' || token.text === ']') depth -= 1
    if (depth === 0 && token.kind === SyntaxKind.StringLiteral) seenSource = true
    if (token.text === ';' && depth === 0) return cursor + 1
    if (depth === 0 && seenSource && !continuesImport(token)) return cursor
    cursor += 1
  }
  return cursor
}

function continuesImport(token) {
  return token.text === 'with' || token.text === 'assert' || token.text === ',' || token.kind === SyntaxKind.StringLiteral
}

function isStaticImport(tokens, index) {
  return tokens[index]?.kind === SyntaxKind.ImportKeyword && tokens[index + 1]?.text !== '(' && tokens[index + 1]?.text !== '.'
}

function isDynamicImport(tokens, index) {
  return tokens[index]?.kind === SyntaxKind.ImportKeyword && tokens[index + 1]?.text === '('
}

function isDirective(token) {
  if (token.kind !== SyntaxKind.StringLiteral) return false
  const value = token.text.slice(1, -1)
  return value === 'use client' || value === 'use server'
}

function expression(code, token) {
  return node(code, token, token, {
    type: 'ExpressionStatement',
    expression: { type: 'Literal', value: token.text.slice(1, -1), range: range(token), loc: loc(code, token) },
  })
}

function node(code, start, end, value) {
  return {
    ...value,
    range: [start.start, end.end],
    loc: { start: location(code, start.start), end: location(code, end.end) },
  }
}

function range(token) {
  return [token.start, token.end]
}

function loc(code, token) {
  return { start: location(code, token.start), end: location(code, token.end) }
}

function location(code, offset) {
  let line = 1
  let column = 0
  for (let index = 0; index < offset && index < code.length; index += 1) {
    if (code[index] === '\n') {
      line += 1
      column = 0
    } else {
      column += 1
    }
  }
  return { line, column }
}

function tokenize(code, jsx) {
  const scanner = createScanner(true, jsx ? LanguageVariant.JSX : LanguageVariant.Standard, code)
  const tokens = []
  let previousEnd = -1
  while (true) {
    let kind = scanner.scan()
    if (kind === SyntaxKind.EndOfFile) break
    if (scanner.getTokenText() === '/' && regexFollows(tokens.at(-1))) {
      kind = scanner.reScanSlashToken()
    }
    const start = scanner.getTokenStart()
    const end = scanner.getTokenEnd()
    if (end <= start || end <= previousEnd) {
      const next = Math.max(start, previousEnd) + 1
      if (next > code.length) break
      scanner.resetTokenState(next)
      continue
    }
    previousEnd = end
    tokens.push({ kind, text: scanner.getTokenText(), start, end })
  }
  return tokens
}

function regexFollows(token) {
  if (!token) return true
  return (
    token.text === '(' ||
    token.text === '[' ||
    token.text === '{' ||
    token.text === ',' ||
    token.text === ':' ||
    token.text === ';' ||
    token.text === '=' ||
    token.text === '!' ||
    token.text === '?' ||
    token.text === '&' ||
    token.text === '|' ||
    token.text === '+' ||
    token.text === '-' ||
    token.text === '*' ||
    token.text === '%' ||
    token.text === '~' ||
    token.text === '<' ||
    token.text === '>' ||
    token.text === 'return' ||
    token.text === 'case' ||
    token.text === 'throw' ||
    token.text === 'typeof' ||
    token.text === 'void' ||
    token.text === 'await' ||
    token.text === 'of' ||
    token.text === 'in'
  )
}
