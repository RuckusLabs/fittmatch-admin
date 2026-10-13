const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/public-profile-url.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context)
const { getPublicProfileLink } = context.exports
let calls = 0, result = { data: 'rachel-green-1001', error: null }, throwing = false
const client = { async rpc(name, args) {
  calls++
  assert.equal(name, 'get_profile_share_slug')
  assert.equal(args.p_profile_id, 'user-id')
  if (throwing) throw Error('offline')
  return result
} }
const profile = { id: 'user-id', role: 'coach', is_banned: false, open_to_offers: true, coach_profiles: { is_complete: true }, client_profiles: { is_complete: true } }
;(async () => {
  assert.equal((await getPublicProfileLink(client, profile)).url, 'https://fittmatch.fit/p/coach/?id=rachel-green-1001')
  assert.equal((await getPublicProfileLink(client, { ...profile, role: 'client', open_to_offers: false })).url, 'https://fittmatch.fit/p/client/?id=rachel-green-1001')
  for (const patch of [{ open_to_offers: false }, { open_to_offers: null }, { open_to_offers: undefined }, { is_banned: true }, { coach_profiles: null }, { coach_profiles: { is_complete: false } }, { role: 'unexpected' }]) {
    const before = calls
    const link = await getPublicProfileLink(client, { ...profile, ...patch })
    assert.equal(link.url, null); assert.equal(link.message, 'Public profile hidden'); assert.equal(calls, before)
  }
  for (const data of [null, 'rachel-green', '../../other-1001', 'https://evil.example/name-1001', 'name-0', 'a'.repeat(81) + '-1001']) {
    result = { data, error: null }; assert.equal((await getPublicProfileLink(client, profile)).url, null)
  }
  result = { data: 'rachel-green-1001', error: { message: 'RPC missing' } }
  assert.equal((await getPublicProfileLink(client, profile)).message, 'Public profile URL unavailable')
  throwing = true
  assert.equal((await getPublicProfileLink(client, profile)).url, null)
  console.log('PASS: stored unique URLs for both roles; opted-out/null/banned/incomplete profiles make no lookup; missing migration, network errors and unsafe identifiers expose no link')
})().catch(error => { console.error(error); process.exitCode = 1 })
