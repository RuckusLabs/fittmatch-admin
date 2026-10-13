const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
let states = [], cursor = 0, calls = [], destination, sendError, verifyError, session = {}, offline = false
const element = (type, props) => ({ type, props })
const auth = {
  async signInWithOtp(args) { calls.push(['send', args]); if (offline) throw Error('offline'); return { error: sendError } },
  async verifyOtp(args) { calls.push(['verify', args]); if (offline) throw Error('offline'); return { data: { session }, error: verifyError } },
}
const mocks = {
  react: { Suspense: 'Suspense', useEffect() {}, useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value }] } },
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'next/navigation': { useSearchParams: () => new URLSearchParams() },
  '@/lib/supabase-browser': { createClient: () => ({ auth }) },
  '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' },
  '@/components/ui/card': Object.fromEntries(['Card', 'CardContent', 'CardHeader', 'CardTitle', 'CardDescription'].map(name => [name, name])),
}
const context = { exports: {}, require: name => mocks[name], Date, URLSearchParams, window: { location: { assign: path => { destination = path } } } }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/login/page.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, context)
function nodes(value) { if (Array.isArray(value)) return value.flatMap(nodes); if (!value || typeof value !== 'object') return []; return [value, ...nodes(value.props?.children)] }
function render() { cursor = 0; return nodes(context.exports.default().props.children.type()) }
function input(id, value) { render().find(node => node.props?.id === id).props.onChange({ target: { value } }) }
async function submit() { await render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }) }
function textPresent(text) { return render().some(node => node.props?.children === text) }
;(async () => {
  input('email', '  ADMIN@EXAMPLE.COM ')
  sendError = { message: 'Email rejected' }; await submit(); assert(textPresent('Email rejected'))
  sendError = null; offline = true; await submit(); assert(textPresent('Unable to send a code. Please try again.'))
  offline = false; await submit()
  assert.equal(calls.at(-1)[1].email, 'admin@example.com')
  assert.equal(calls.at(-1)[1].options.shouldCreateUser, false)
  assert.equal(calls.at(-1)[1].options.emailRedirectTo, undefined)
  assert(render().find(node => node.props?.id === 'code'))
  assert(render().find(node => node.props?.children === 'Resend code in 60s').props.disabled)
  const before = calls.length; await submit(); assert.equal(calls.length, before); assert(textPresent('Enter the eight-digit code from your email.'))
  input('code', '1234 5678'); verifyError = { message: 'Code expired' }; await submit(); assert(textPresent('Code expired')); assert.equal(destination, undefined)
  verifyError = null; session = null; await submit(); assert(textPresent('Unable to sign in. Please request a new code.')); assert.equal(destination, undefined)
  session = {}; await submit(); assert.equal(destination, '/')
  assert.equal(calls.at(-1)[1].type, 'email'); assert.equal(calls.at(-1)[1].token, '12345678'); assert.equal(calls.at(-1)[1].email, 'admin@example.com')
  render().find(node => node.props?.children === 'Use a different email').props.onClick()
  assert(render().find(node => node.props?.id === 'email'))
  assert(render().find(node => node.props?.children === 'Send code in 60s').props.disabled)
  assert(fs.readFileSync('middleware.ts', 'utf8').includes(".from('admin_users')"))
  console.log('PASS: email-code login UI, existing-account requests, normalization, resend cooldown, send failures, invalid/expired codes, missing-session failure and navigation through admin middleware')
})().catch(error => { console.error(error); process.exitCode = 1 })
