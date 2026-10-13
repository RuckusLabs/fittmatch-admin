const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const fixture = require('./chat-media-fixtures.json');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, URL, console, process: { env: { NEXT_PUBLIC_SUPABASE_URL: fixture.baseUrl } }, require(name) {
    if (!(name in mocks)) throw Error('Unexpected import: ' + name);
    return mocks[name];
  } }, { filename: file });
  return exports;
}
const parser = load('lib/chat-media.ts');
const labels = load('lib/labels.ts', { '@/lib/chat-media': parser });
for (const item of fixture.cases) assert.equal(labels.chatMediaPath(item.value, fixture), item.path, item.name);
let role = 'moderator', authenticated = true, message, fetchError, storageError, updateError, changed = true, calls;
function reset(image = fixture.cases[0].value) {
  role = 'moderator'; authenticated = true; changed = true; fetchError = storageError = updateError = null; calls = [];
  message = { id: 'message', match_id: fixture.matchId, sender_id: fixture.senderId, image_url: image };
}
const client = {
  from(table) {
    if (table === 'admin_users') return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { role } }) };
    if (table === 'admin_audit_log') return { insert: async payload => { calls.push({ audit: payload }); return { error: null }; } };
    assert.equal(table, 'messages');
    let updating = false; const filters = [];
    return {
      select(fields) { if (!updating) assert(fields.includes('sender_id')); return this; },
      eq(key, value) { filters.push([key, value]); return this; },
      single: async () => { calls.push({ fetch: true }); return { data: message, error: fetchError }; },
      update(payload) { assert.deepEqual(JSON.parse(JSON.stringify(payload)), { image_url: null }); updating = true; return this; },
      maybeSingle: async () => { calls.push({ update: filters }); return { data: changed ? { id: 'message' } : null, error: updateError }; },
    };
  },
  storage: { from(bucket) { assert.equal(bucket, 'chat-media'); return { remove: async paths => { calls.push({ remove: [...paths] }); return { error: storageError }; } }; } },
};
const actions = load('lib/actions.ts', {
  'next/headers': { cookies: async () => ({ getAll: () => [] }) },
  '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'admin' } : null } }) } }) },
  'next/cache': { revalidatePath: () => calls.push({ refresh: true }) },
  '@/lib/supabase-server': { createServiceClient: () => client }, '@/lib/labels': labels, '@/lib/account-media': {}, '@/lib/certificate-proof': load('lib/certificate-proof.ts', {}),
});
(async () => {
  for (const item of fixture.cases.filter(row => row.value)) {
    reset(item.value); const result = await actions.removeMessageMedia('message'); assert.equal(result.error, null, item.name);
    const removed = calls.find(call => call.remove);
    if (item.path) assert.deepEqual(removed.remove, [item.path], item.name);
    else assert.equal(removed, undefined, item.name);
    assert(calls.some(call => call.update), item.name);
    assert(calls.some(call => call.audit), item.name);
    assert(calls.some(call => call.refresh), item.name);
  }
  for (const value of ['support', 'unrecognized']) {
    reset(); role = value; await assert.rejects(actions.removeMessageMedia('message'), /Not authorized/); assert.equal(calls.length, 0);
  }
  reset(); authenticated = false; await assert.rejects(actions.removeMessageMedia('message'), /Not authenticated/); assert.equal(calls.length, 0);
  reset(); role = 'admin'; assert.equal((await actions.removeMessageMedia('message')).error, null);
  reset(); fetchError = { message: 'Read failed' }; assert.equal((await actions.removeMessageMedia('message')).error, 'Read failed'); assert.equal(calls.length, 1);
  reset(); storageError = { message: 'Storage failed' }; assert.equal((await actions.removeMessageMedia('message')).error, 'Storage failed'); assert(!calls.some(call => call.update || call.audit));
  reset(); updateError = { message: 'Write failed' }; assert.equal((await actions.removeMessageMedia('message')).error, 'Write failed'); assert(!calls.some(call => call.audit || call.refresh));
  reset(); changed = false; assert.match((await actions.removeMessageMedia('message')).error, /Attachment changed/); assert(!calls.some(call => call.audit));
  reset(null); assert.equal((await actions.removeMessageMedia('message')).error, null); assert.equal(calls.length, 1);
  // Execute the page itself so bad history cannot regress to a server-render crash.
  const rows = [fixture.cases[0], fixture.cases.find(item => item.name === 'malformed escape'), fixture.cases.find(item => item.name === 'different sender')]
    .map((item, index) => ({ id: String(index), match_id: fixture.matchId, sender_id: fixture.senderId, body: `Caption ${index}`, image_url: item.value, created_at: null, read_at: null }));
  const signedPaths = [];
  const pageClient = {
    from(table) {
      const data = table === 'profiles' ? { full_name: 'Synthetic coach' } : table === 'matches'
        ? [{ id: fixture.matchId, status: 'active', coach: { profiles: { full_name: 'Coach' } }, client: { profiles: { full_name: 'Client' } } }]
        : rows;
      let query; query = new Proxy({}, { get(_, key) { if (key === 'then') return (yes, no) => Promise.resolve({ data }).then(yes, no); return () => query; } }); return query;
    },
    storage: { from: () => ({ createSignedUrls: async paths => { signedPaths.push(...paths); return { data: paths.map(path => ({ path, signedUrl: 'https://signed.invalid/controlled' })) }; } }) },
  };
  const element = (type, props) => ({ type, props });
  const page = load('app/users/[id]/messages/page.tsx', {
    'react/jsx-runtime': { jsx: element, jsxs: element }, 'next/navigation': { notFound: () => { throw Error('Unexpected notFound'); } },
    'next/link': { default: 'Link' }, '@/lib/supabase-server': { createServiceClient: () => pageClient },
    '@/components/ui/badge': { Badge: 'Badge' }, '@/components/ui/card': { Card: 'Card', CardContent: 'CardContent', CardHeader: 'CardHeader', CardTitle: 'CardTitle' },
    'lucide-react': { ArrowLeft: 'ArrowLeft' }, '@/components/RemoveMediaButton': { RemoveMediaButton: 'RemoveMediaButton' }, '@/lib/labels': labels,
  }).default;
  function nodes(value) { if (Array.isArray(value)) return value.flatMap(nodes); if (!value || typeof value !== 'object') return [value]; return [value, ...nodes(value.props?.children)]; }
  const rendered = nodes(await page({ params: Promise.resolve({ id: fixture.senderId }), searchParams: Promise.resolve({}) }));
  assert.deepEqual(signedPaths, [fixture.cases[0].path]);
  assert.equal(rendered.filter(node => node === '[image unavailable]').length, 2);
  assert.equal(rendered.filter(node => node?.type === 'RemoveMediaButton').length, 3);
  rows.forEach(row => assert(rendered.includes(row.body)));
  console.log(`PASS: ${fixture.cases.length} parser fixtures, actual moderator/admin action and page, malformed and foreign-path recovery without storage removal, authorization, errors and changed-row handling`);
})().catch(error => { console.error(error); process.exitCode = 1; });
