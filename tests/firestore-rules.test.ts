import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, test } from 'vitest'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-flow-content-hub',
    firestore: {
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
    },
  })
})

afterAll(async () => {
  await env.cleanup()
})

test('a signed-in user cannot change their role or Drive folder', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice'), {
      role: 'client',
      name: 'Alice',
      driveFolderId: 'folder1234567890',
      onboardingDone: true,
    })
  })

  const alice = env.authenticatedContext('alice').firestore()
  await assertFails(updateDoc(doc(alice, 'users/alice'), { role: 'admin' }))
  await assertFails(updateDoc(doc(alice, 'users/alice'), { driveFolderId: 'otherfolder123' }))
  await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { name: 'Alice Studio' }))
})
