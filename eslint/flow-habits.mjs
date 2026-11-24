const plugin = {
  meta: { name: 'flow-habits' },
  rules: {
    'imports-at-top': {
      meta: {
        type: 'problem',
        docs: { description: 'Keep imports at the top of the file.' },
        schema: [],
        messages: { top: 'Keep imports at the top of the file.' },
      },
      create(context) {
        const filename = (context.filename ?? '').replaceAll('\\', '/')
        return {
          ImportExpression(node) {
            if (filename.endsWith('/src/instrumentation.ts')) return
            context.report({ node, messageId: 'top' })
          },
          Program(node) {
            let started = false
            for (const statement of node.body) {
              if (!started && isDirective(statement)) continue
              if (statement.type === 'ImportDeclaration') {
                if (started) context.report({ node: statement, messageId: 'top' })
                continue
              }
              started = true
            }
          },
        }
      },
    },
    'theme-switch-never': {
      meta: {
        type: 'problem',
        docs: { description: 'Theme switches need a never check in the default case.' },
        schema: [],
        messages: { never: 'Theme switches need a never check in the default case.' },
      },
      create(context) {
        return {
          SwitchStatement(node) {
            if (node.discriminant.type !== 'Identifier' || node.discriminant.name !== 'theme') return
            const fallback = node.cases.find((item) => item.test === null)
            if (!fallback || !fallback.consequent.some(declaresNever)) {
              context.report({ node, messageId: 'never' })
            }
          },
        }
      },
    },
  },
}

function isDirective(statement) {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'Literal' &&
    (statement.expression.value === 'use client' || statement.expression.value === 'use server')
  )
}

function declaresNever(statement) {
  if (statement.type === 'VariableDeclaration') {
    return statement.declarations.some((declaration) => declaration.id.typeAnnotation?.typeAnnotation?.type === 'TSNeverKeyword')
  }
  if (statement.type === 'BlockStatement') return statement.body.some(declaresNever)
  return false
}

export default plugin
