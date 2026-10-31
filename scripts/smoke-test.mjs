/* CampusHub end-to-end API smoke test (run against a local server on :5000) */
const BASE = 'http://localhost:5000/api';
let passed = 0, failed = 0;
const results = [];

const check = (name, cond, extra = '') => {
  if (cond) { passed++; results.push(`  ok   ${name}`); }
  else { failed++; results.push(`  FAIL ${name} ${extra}`); }
};

const req = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined)
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
};

const rand = () => Math.random().toString(36).slice(2, 8);

(async () => {
  // ---------- health ----------
  let r = await req('GET', '/health');
  check('health endpoint', r.status === 200 && r.data?.status === 'OK', `got ${r.status}`);

  // ---------- auth ----------
  const email1 = `smoke_a_${rand()}@test.edu`;
  const email2 = `smoke_b_${rand()}@test.edu`;
  r = await req('POST', '/auth/register', { body: { name: 'Smoke A', email: email1, password: 'secret12' } });
  check('register user A', r.status === 201 && !!r.data?.token, `got ${r.status} ${JSON.stringify(r.data)}`);
  const tokenA = r.data?.token;
  check('register returns profile fields', r.data?.university !== undefined && r.data?.settings?.language === 'en');

  r = await req('POST', '/auth/register', { body: { name: 'Smoke B', email: email2, password: 'secret12' } });
  const tokenB = r.data?.token;
  check('register user B', r.status === 201 && !!tokenB);

  r = await req('POST', '/auth/register', { body: { name: 'Dup', email: email1, password: 'secret12' } });
  check('duplicate email rejected 400', r.status === 400, `got ${r.status}`);

  r = await req('POST', '/auth/login', { body: { email: email1, password: 'wrong' } });
  check('bad password rejected 401', r.status === 401, `got ${r.status}`);

  r = await req('POST', '/auth/login', { body: { email: email1, password: 'secret12' } });
  check('login works', r.status === 200 && !!r.data?.token, `got ${r.status}`);

  r = await req('GET', '/users/profile', { token: 'garbage.token.here' });
  check('invalid token rejected 401', r.status === 401, `got ${r.status}`);

  r = await req('GET', '/users/profile');
  check('missing token rejected 401', r.status === 401, `got ${r.status}`);

  // ---------- profile + settings ----------
  r = await req('PUT', '/users/profile', { token: tokenA, body: { major: 'Robotics', bio: 'Smoke test bot' } });
  check('update profile', r.status === 200 && r.data?.major === 'Robotics', `got ${r.status}`);

  r = await req('PUT', '/users/profile', { token: tokenA, body: { role: 'admin' } });
  check('self-assign admin blocked 403', r.status === 403, `got ${r.status}`);

  r = await req('PUT', '/users/settings', { token: tokenA, body: { emailNotifs: false, language: 'ur' } });
  check('save settings', r.status === 200 && r.data?.settings?.emailNotifs === false && r.data?.settings?.language === 'ur', `got ${r.status} ${JSON.stringify(r.data)}`);

  r = await req('PUT', '/users/settings', { token: tokenA, body: { language: 'fr' } });
  check('bad language rejected 400', r.status === 400, `got ${r.status}`);

  // ---------- lost & found ----------
  r = await req('POST', '/lost-found', { token: tokenA, body: { title: 'Smoke Keys', description: 'A keyring', type: 'lost', location: 'Lab 3' } });
  check('create lost post', r.status === 201 && r.data?.user?.name === 'Smoke A', `got ${r.status} ${JSON.stringify(r.data)}`);
  const postId = r.data?._id;

  r = await req('POST', '/lost-found', { token: tokenA, body: { title: '', description: '', type: 'lost', location: '' } });
  check('invalid lost post 400', r.status === 400, `got ${r.status}`);

  r = await req('GET', '/lost-found?type=lost&search=Smoke');
  check('filter lost posts', r.status === 200 && Array.isArray(r.data), `got ${r.status}`);

  r = await req('POST', `/lost-found/${postId}/claim`, { token: tokenA, body: { message: 'mine?' } });
  check('claim own post blocked 400', r.status === 400, `got ${r.status}`);

  r = await req('POST', `/lost-found/${postId}/claim`, { token: tokenB, body: { message: 'It has my name on it' } });
  check('other user claims post', r.status === 200 && r.data?.status === 'claimed', `got ${r.status} ${JSON.stringify(r.data)}`);
  const claimId = r.data?.claimedBy?._id || r.data?.claimedBy;

  r = await req('POST', `/lost-found/${postId}/claim`, { token: tokenA, body: { message: 'no' } });
  check('second claim blocked 400', r.status === 400, `got ${r.status}`);

  r = await req('GET', '/notifications', { token: tokenA });
  const notifForA = r.data?.find((n) => n.type === 'claim');
  check('poster notified of claim', r.status === 200 && !!notifForA, `got ${r.status} ${JSON.stringify(r.data?.slice(0,2))}`);

  r = await req('DELETE', `/lost-found/${postId}/claim`, { token: tokenB });
  check('claimer releases claim', r.status === 200 && r.data?.status === 'open', `got ${r.status}`);

  r = await req('PATCH', `/lost-found/${postId}/status`, { token: tokenB, body: { status: 'resolved' } });
  check('non-owner status change blocked 403', r.status === 403, `got ${r.status}`);

  r = await req('PATCH', `/lost-found/${postId}/status`, { token: tokenA, body: { status: 'resolved' } });
  check('owner marks resolved', r.status === 200 && r.data?.status === 'resolved', `got ${r.status}`);

  r = await req('PATCH', `/lost-found/${postId}/status`, { token: tokenA, body: { status: 'active' } });
  check('invalid status enum 400', r.status === 400, `got ${r.status}`);

  // ---------- marketplace ----------
  r = await req('POST', '/marketplace', { token: tokenA, body: { title: 'Smoke Laptop', price: 120, description: 'Works fine', category: 'Electronics', condition: 'Good' } });
  check('create listing', r.status === 201 && r.data?.condition === 'Good', `got ${r.status}`);
  const listingId = r.data?._id;

  r = await req('POST', `/marketplace/${listingId}/contact`, { token: tokenB, body: { message: 'Is this still available?' } });
  check('contact seller', r.status === 200 && r.data?.seller?.email === email1, `got ${r.status} ${JSON.stringify(r.data)}`);

  r = await req('POST', `/marketplace/${listingId}/contact`, { token: tokenB, body: { message: '' } });
  check('empty contact message 400', r.status === 400, `got ${r.status}`);

  r = await req('PATCH', `/marketplace/${listingId}/status`, { token: tokenB, body: { status: 'sold' } });
  check('non-seller status blocked 403', r.status === 403, `got ${r.status}`);

  r = await req('PATCH', `/marketplace/${listingId}/status`, { token: tokenA, body: { status: 'sold' } });
  check('seller marks sold', r.status === 200 && r.data?.status === 'sold', `got ${r.status}`);

  // ---------- events ----------
  r = await req('POST', '/events', { token: tokenA, body: { title: 'Smoke Meetup', description: 'Test', date: '2026-12-01', location: 'Hall B', capacity: 2 } });
  check('create event (organizer registered)', r.status === 201 && r.data?.isRegistered === true && r.data?.attendeeCount === 1, `got ${r.status} ${JSON.stringify(r.data)}`);
  const eventId = r.data?._id;

  r = await req('POST', '/events', { token: tokenA, body: { title: '', description: '', location: '' } });
  check('invalid event 400', r.status === 400, `got ${r.status}`);

  r = await req('PUT', `/events/${eventId}/register`, { token: tokenB });
  check('user B registers', r.status === 200 && r.data?.isRegistered === true && r.data?.attendeeCount === 2, `got ${r.status}`);

  r = await req('PUT', `/events/${eventId}/register`, { token: tokenB });
  check('toggle unregister', r.status === 200 && r.data?.isRegistered === false && r.data?.attendeeCount === 1, `got ${r.status}`);

  r = await req('GET', '/events', { token: tokenB });
  const ev = r.data?.find((e) => e._id === eventId);
  check('GET events includes isRegistered', r.status === 200 && typeof ev?.isRegistered === 'boolean', `got ${r.status}`);

  r = await req('DELETE', `/events/${eventId}`, { token: tokenB });
  check('non-organizer delete event blocked 403', r.status === 403, `got ${r.status}`);

  // ---------- notes ----------
  r = await req('POST', '/notes', { token: tokenA, body: { title: 'Smoke Notes', courseCode: 'CS 999', department: 'Computer Science', pages: 12 } });
  check('create note', r.status === 201 && r.data?.uploaderName === 'Smoke A', `got ${r.status}`);
  const noteId = r.data?._id;

  r = await req('PUT', `/notes/${noteId}/download`, { token: tokenB });
  check('download counter', r.status === 200 && r.data?.downloads === 1, `got ${r.status}`);

  r = await req('PUT', `/notes/${noteId}/rate`, { token: tokenB, body: { rating: 4 } });
  check('rate note', r.status === 200 && r.data?.rating === 4 && r.data?.ratingCount === 1, `got ${r.status} ${JSON.stringify({rating: r.data?.rating, count: r.data?.ratingCount})}`);

  r = await req('PUT', `/notes/${noteId}/rate`, { token: tokenB, body: { rating: 5 } });
  check('re-rate replaces', r.status === 200 && r.data?.rating === 5 && r.data?.ratingCount === 1, `got ${r.status}`);

  r = await req('PUT', `/notes/${noteId}/rate`, { token: tokenA, body: { rating: 1 } });
  check('average across users', r.status === 200 && r.data?.rating === 3 && r.data?.ratingCount === 2, `got ${r.status} ${r.data?.rating}`);

  r = await req('PUT', `/notes/${noteId}/rate`, { token: tokenB, body: { rating: 9 } });
  check('rating out of range 400', r.status === 400, `got ${r.status}`);

  // multipart note file upload
  const form = new FormData();
  form.append('file', new Blob(['%PDF-1.4 smoke test'], { type: 'application/pdf' }), 'smoke.pdf');
  r = await req('POST', '/upload/note', { token: tokenA, form });
  // Accept EITHER driver: local stores under /uploads/notes/, gridfs under
  // /uploads/<24-hex-id>/. The check must pass regardless of which mode the
  // server under test was started with.
  const noteFileUrl = r.data?.fileUrl || '';
  const noteIsGrid = /\/uploads\/[a-f\d]{24}\//i.test(noteFileUrl);
  const urlOk = noteIsGrid || noteFileUrl.includes('/uploads/notes/');
  check('upload note file', r.status === 201 && urlOk, `got ${r.status} ${JSON.stringify(r.data)}`);
  if (process.env.TEST_GRIDFS === '1' && !noteIsGrid) {
    check('server running with gridfs driver', false, `expected /uploads/<id>/ URL, got ${noteFileUrl}`);
  }

  if (noteFileUrl) {
    const abs = noteFileUrl.startsWith('http') ? noteFileUrl : `http://localhost:5000${noteFileUrl}`;
    const fileRes = await fetch(abs);
    check('note file served statically', fileRes.status === 200, `got ${fileRes.status}`);
  }

  const imgForm = new FormData();
  imgForm.append('image', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'smoke.png');
  r = await req('POST', '/upload', { token: tokenA, form: imgForm });
  check('reject broken image upload', r.status === 400 || r.status === 201, `got ${r.status} ${JSON.stringify(r.data)}`);

  // ---------- skills ----------
  r = await req('POST', '/skills', { token: tokenA, body: { offeredSkills: ['Python'], wantedSkills: ['Figma'], bio: 'Hi' } });
  check('create skill profile', r.status === 201 && r.data?.offeredSkills?.length === 1, `got ${r.status}`);
  r = await req('POST', '/skills', { token: tokenA, body: { offeredSkills: 'Python, Git', wantedSkills: 'Figma' } });
  check('skill profile upsert (no duplicates)', r.status === 201 && r.data?.offeredSkills?.length === 2, `got ${r.status}`);
  const profileId = r.data?._id;

  const bUser = await req('GET', '/users/profile', { token: tokenB });
  const bId = bUser.data?._id;

  r = await req('POST', '/skills/requests', { token: tokenA, body: { toUser: bId, skillOffered: 'Python', skillWanted: 'Figma', message: 'Trade?' } });
  check('send skill request', r.status === 201 && r.data?.fromUser?.name === 'Smoke A', `got ${r.status} ${JSON.stringify(r.data)}`);
  const requestId = r.data?._id;

  r = await req('POST', '/skills/requests', { token: tokenA, body: { toUser: 'not-an-id', skillOffered: 'x', skillWanted: 'y' } });
  check('invalid target id 400', r.status === 400, `got ${r.status}`);

  r = await req('POST', '/skills/requests', { token: tokenA, body: { toUser: bId, skillOffered: 'Python', skillWanted: 'Figma', message: 'Trade?' } });
  check('duplicate pending request blocked 400', r.status === 400, `got ${r.status}`);

  r = await req('GET', '/skills/requests', { token: tokenA });
  check('sender sees own request', r.status === 200 && r.data?.some((q) => q._id === requestId), `got ${r.status}`);

  r = await req('GET', '/skills/requests', { token: tokenB });
  check('receiver sees request', r.status === 200 && r.data?.some((q) => q._id === requestId), `got ${r.status}`);

  r = await req('PUT', `/skills/requests/${requestId}`, { token: tokenA, body: { status: 'accepted' } });
  check('sender cannot accept own request 403', r.status === 403, `got ${r.status}`);

  r = await req('PUT', `/skills/requests/${requestId}`, { token: tokenB, body: { status: 'accepted' } });
  check('receiver accepts', r.status === 200 && r.data?.status === 'accepted', `got ${r.status}`);

  r = await req('PUT', `/skills/requests/${requestId}`, { token: tokenB, body: { status: 'rejected' } });
  check('cannot respond twice 400', r.status === 400, `got ${r.status}`);

  r = await req('GET', '/notifications', { token: tokenA });
  check('sender notified of acceptance', r.data?.some((n) => n.type === 'skill-request'), `got ${r.status}`);

  // ---------- notifications ----------
  r = await req('GET', '/notifications/unread-count', { token: tokenA });
  check('unread count endpoint', r.status === 200 && typeof r.data?.count === 'number', `got ${r.status}`);

  const firstNotif = r.data ? (await req('GET', '/notifications', { token: tokenA })).data?.[0] : null;
  if (firstNotif) {
    r = await req('PUT', `/notifications/${firstNotif._id}/read`, { token: tokenA });
    check('mark one read', r.status === 200 && r.data?.isRead === true, `got ${r.status}`);
    r = await req('PUT', '/notifications/read-all', { token: tokenA });
    check('mark all read', r.status === 200, `got ${r.status}`);
    // B must not be able to modify A's notification
    r = await req('PUT', `/notifications/${firstNotif._id}/read`, { token: tokenB });
    check('other user cannot touch my notification 404', r.status === 404, `got ${r.status}`);
  }

  // ---------- password reset ----------
  r = await req('POST', '/auth/forgot-password', { body: { email: 'does.not.exist@nowhere.edu' } });
  check('forgot-password generic 200 for unknown email', r.status === 200 && !!r.data?.message, `got ${r.status}`);

  r = await req('POST', '/auth/forgot-password', { body: { email: 'not-an-email' } });
  check('forgot-password rejects bad email 400', r.status === 400, `got ${r.status}`);

  r = await req('POST', '/auth/forgot-password', { body: { email: email1 } });
  check('forgot-password accepts real email', r.status === 200, `got ${r.status}`);

  // Pull the single-use token straight out of the dev-mode user document
  // (in dev the email is printed to the console; tests read the DB instead).
  const { default: mongoose } = await import('mongoose');
  const { config } = await import('../src/config/env.js');
  await mongoose.connect(config.mongoUri);
  const { default: User } = await import('../src/models/User.js');
  const resetUser = await User.findOne({ email: email1 }).select('+resetToken +resetTokenExpires');
  const rawToken = resetUser?.resetToken;
  check('reset token stored (hashed)', !!rawToken && rawToken.length === 64, `got ${rawToken?.length}`);

  r = await req('POST', '/auth/reset-password', { body: { token: 'deadbeef'.repeat(8), password: 'newpass99' } });
  check('fake reset token rejected 400', r.status === 400, `got ${r.status}`);

  // Re-hash the fake raw value? No — the DB stores sha256(token), so to get a
  // usable token we generate a known one and write its hash directly.
  const crypto = await import('crypto');
  const knownToken = crypto.randomBytes(32).toString('hex');
  resetUser.resetToken = crypto.createHash('sha256').update(knownToken).digest('hex');
  resetUser.resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
  await resetUser.save();

  r = await req('POST', '/auth/reset-password', { body: { token: knownToken, password: 'newpass99' } });
  check('valid reset token works + auto-login', r.status === 200 && !!r.data?.token, `got ${r.status} ${JSON.stringify(r.data)?.slice(0, 120)}`);
  const resetTokenLogin = r.data?.token;

  r = await req('POST', '/auth/reset-password', { body: { token: knownToken, password: 'again123' } });
  check('reset token single-use (second try 400)', r.status === 400, `got ${r.status}`);

  r = await req('POST', '/auth/login', { body: { email: email1, password: 'newpass99' } });
  check('login with new password works', r.status === 200 && !!r.data?.token, `got ${r.status}`);
  const tokenA2 = r.data?.token || resetTokenLogin;

  r = await req('POST', '/auth/login', { body: { email: email1, password: 'secret12' } });
  check('old password no longer works 401', r.status === 401, `got ${r.status}`);

  // expired token: hash a token, set expiry in the past
  const expiredToken = crypto.randomBytes(32).toString('hex');
  resetUser.resetToken = crypto.createHash('sha256').update(expiredToken).digest('hex');
  resetUser.resetTokenExpires = new Date(Date.now() - 1000);
  await resetUser.save();
  r = await req('POST', '/auth/reset-password', { body: { token: expiredToken, password: 'whatever1' } });
  check('expired reset token rejected 400', r.status === 400, `got ${r.status}`);

  // ---------- gridfs upload driver (whenever the server uses it) ----------
  // Auto-detected from the note-upload URL above, so this runs against a
  // production-mode server (gridfs is the prod default) without env vars.
  if (noteIsGrid || process.env.TEST_GRIDFS === '1') {
    const gForm = new FormData();
    gForm.append('file', new Blob(['%PDF-1.4 gridfs smoke'], { type: 'application/pdf' }), 'gridfs.pdf');
    r = await req('POST', '/upload/note', { token: tokenA2, form: gForm });
    const idMatch = r.data?.fileUrl?.match(/\/uploads\/([a-f\d]{24})\//i);
    check('gridfs upload returns id URL', r.status === 201 && !!idMatch, `got ${r.status} ${JSON.stringify(r.data)}`);

    if (idMatch) {
      const fileRes = await fetch(`http://localhost:5000/uploads/${idMatch[1]}/gridfs.pdf`);
      check('gridfs file served back', fileRes.status === 200, `got ${fileRes.status}`);

      r = await req('DELETE', `/upload?path=/uploads/${idMatch[1]}/gridfs.pdf`, { token: tokenA2 });
      check('gridfs delete', r.status === 200, `got ${r.status}`);

      const goneRes = await fetch(`http://localhost:5000/uploads/${idMatch[1]}/gridfs.pdf`);
      check('gridfs file gone after delete', goneRes.status === 404, `got ${goneRes.status}`);
    }
  }

  // ---------- reports + admin ----------
  r = await req('POST', '/reports', { token: tokenB, body: { targetType: 'Marketplace', targetId: listingId, reason: 'Suspicious listing' } });
  check('create report', r.status === 201, `got ${r.status} ${JSON.stringify(r.data)}`);
  const reportId = r.data?._id;

  r = await req('POST', '/reports', { token: tokenB, body: { targetType: 'Marketplace', targetId: listingId, reason: 'again' } });
  check('duplicate report blocked 400', r.status === 400, `got ${r.status}`);

  r = await req('POST', '/reports', { token: tokenB, body: { targetType: 'Nope', targetId: listingId, reason: 'x' } });
  check('bad target type 400', r.status === 400, `got ${r.status}`);

  r = await req('GET', '/reports/mine', { token: tokenB });
  check('my reports list', r.status === 200 && r.data?.length >= 1, `got ${r.status}`);

  // admin login
  r = await req('POST', '/auth/login', { body: { email: 'admin@campushub.edu', password: 'admin123' } });
  check('seeded admin login', r.status === 200 && r.data?.role === 'admin', `got ${r.status} ${JSON.stringify(r.data)}`);
  const adminToken = r.data?.token;

  r = await req('GET', '/admin/stats', { token: adminToken });
  check('admin stats', r.status === 200 && typeof r.data?.users?.total === 'number' && typeof r.data?.skills === 'object', `got ${r.status}`);

  r = await req('GET', '/admin/stats', { token: tokenA });
  check('non-admin blocked from stats 403', r.status === 403, `got ${r.status}`);

  r = await req('GET', '/admin/reports', { token: adminToken });
  const decorated = r.data?.find((x) => x._id === reportId);
  check('admin reports decorated', r.status === 200 && decorated?.targetTitle === 'Smoke Laptop' && !!decorated?.reporter?.name, `got ${r.status} ${JSON.stringify(decorated)}`);

  r = await req('DELETE', `/admin/reports/${reportId}/content`, { token: adminToken });
  check('admin removes reported content', r.status === 200 && r.data?.action === 'content_deleted', `got ${r.status} ${JSON.stringify(r.data)}`);

  r = await req('GET', `/marketplace/${listingId}`);
  check('reported listing really deleted', r.status === 404, `got ${r.status}`);

  r = await req('PUT', `/admin/users/${bId}/suspend`, { token: adminToken });
  check('admin suspends user', r.status === 200 && r.data?.status === 'suspended', `got ${r.status}`);

  r = await req('POST', '/events', { token: tokenB, body: { title: 'x', description: 'y', date: '2026-12-01', location: 'z' } });
  check('suspended user blocked 403', r.status === 403, `got ${r.status}`);

  r = await req('POST', '/auth/login', { body: { email: email2, password: 'secret12' } });
  check('suspended user cannot log in 403', r.status === 403, `got ${r.status}`);

  r = await req('PUT', `/admin/users/${bId}/suspend`, { token: adminToken });
  check('admin reinstates user', r.status === 200 && r.data?.status === 'active', `got ${r.status}`);

  // ---------- misc ----------
  r = await req('GET', '/definitely-not-a-route');
  check('404 handler', r.status === 404, `got ${r.status}`);

  r = await req('GET', '/lost-found/%ZZ');
  check('malformed ObjectId -> 400 not 500', r.status === 400, `got ${r.status}`);

  // ---------- report ----------
  console.log(results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0 && results.some((line) => line.includes('429'))) {
    console.log(
      '\nHint: some checks got HTTP 429. The auth rate limiter is per-IP with a\n'
      + 'rolling window (default 25 requests / 15 min) — running the smoke test\n'
      + 'several times back-to-back exhausts it. Either wait for the window to\n'
      + 'reset, restart the server (the limiter is in-memory), or start it with\n'
      + 'AUTH_RATE_MAX=500 npm run dev for test runs.'
    );
  }
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.log(results.join('\n'));
  console.error('\nSmoke test crashed:', err.message);
  process.exit(1);
});
