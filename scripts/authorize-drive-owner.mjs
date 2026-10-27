import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { OAuth2Client } from 'google-auth-library'

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')

const OWNER_EMAIL = 'geral.productionsflow@gmail.com'
const REDIRECT_URI = 'http://127.0.0.1:53682/oauth2callback'
const SCOPE = 'https://www.googleapis.com/auth/drive'
const ENV_PATH = '.env.local'
const REFRESH_KEY = 'GOOGLE_OAUTH_REFRESH_TOKEN'

loadEnvConfig(process.cwd())

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env.local first.')
  process.exit(1)
}

const oauth = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI })
const authUrl = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [SCOPE],
  login_hint: OWNER_EMAIL,
})

const code = await waitForCode(authUrl)
let tokens
try {
  const response = await oauth.getToken(code)
  tokens = response.tokens
} catch (error) {
  console.error(safeMessage(error))
  process.exit(1)
}

if (!tokens.refresh_token || !tokens.access_token) {
  console.error('Google did not return a refresh token. Nothing was saved.')
  process.exit(1)
}

const about = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
})
if (!about.ok) {
  console.error('Google did not confirm the signed-in account. Nothing was saved.')
  process.exit(1)
}
const profile = await about.json()
if (profile?.user?.emailAddress !== OWNER_EMAIL) {
  console.error('The signed-in Google account is not geral.productionsflow@gmail.com. Nothing was saved.')
  process.exit(1)
}

saveRefreshToken(tokens.refresh_token)
console.log('Google authorization saved for geral.productionsflow@gmail.com.')

function waitForCode(url) {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? '/', REDIRECT_URI)
      const authCode = requestUrl.searchParams.get('code')
      const authError = requestUrl.searchParams.get('error')
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(authCode ? '<p>Authorization received. You can close this window.</p>' : '<p>Authorization was not completed.</p>')
      server.close()
      if (authCode) resolve(authCode)
      else reject(new Error(authError || 'Authorization was not completed.'))
    })
    server.on('error', reject)
    server.listen(53682, '127.0.0.1', () => {
      console.log('Waiting for Google authorization.')
      const opened = spawn('rundll32', ['url.dll,FileProtocolHandler', url], { windowsHide: true })
      opened.on('error', () => {
        console.error('The browser could not be opened. Open the Google authorization page from this computer.')
      })
    })
    setTimeout(() => {
      server.close()
      reject(new Error('Authorization timed out.'))
    }, 20 * 60 * 1000).unref()
  })
}

function saveRefreshToken(refreshToken) {
  const line = `${REFRESH_KEY}=${JSON.stringify(refreshToken)}`
  let text = ''
  try {
    text = readFileSync(ENV_PATH, 'utf8')
  } catch {
    text = ''
  }
  const pattern = new RegExp(`^${REFRESH_KEY}=.*$`, 'm')
  const next = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\s*$/, '')}\n${line}\n`
  writeFileSync(ENV_PATH, next)
}

function safeMessage(error) {
  const message = error instanceof Error ? error.message : ''
  if (!message || message.length > 180) return 'Google authorization failed.'
  if (/token|secret|ya29|1\/\//i.test(message)) return 'Google authorization failed.'
  return message
}
