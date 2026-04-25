/**
 * firebase-admin.js — Admin Firestore access via REST API
 *
 * Uses plain fetch() instead of the Firebase SDK.
 * SDK was hanging indefinitely in the admin context — REST API fails fast.
 *
 * Reads  : no auth token needed  (Firestore rules: allow read: if true)
 * Writes : anonymous Firebase ID token via Identity Toolkit REST API
 *
 * Media  : stored on Cloudinary (cloud name: dsyriylox, folder: uchhq)
 * Data   : stored in Firestore  (project: umbrella-corp-hq)
 */

const PROJECT = 'umbrella-corp-hq';
const API_KEY  = 'AIzaSyC2nm9K8-X4dCwNG50MMHTlhdJkIHo_B5U';
const FS       = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const IT       = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

// ─── Anonymous ID token (for writes) ─────────────────────────────────────────

let _token = null, _tokenExp = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExp) return _token;
  const res  = await fetch(IT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Firebase anonymous auth failed: ' + (data.error?.message || res.status) + '. Enable Anonymous sign-in in Firebase Console → Authentication → Sign-in method.');
  _token    = data.idToken;
  _tokenExp = Date.now() + (Number(data.expiresIn || 3600) - 120) * 1000;
  return _token;
}

// ─── Firestore value parsers ──────────────────────────────────────────────────

function parseVal(v) {
  if (!v) return null;
  if ('stringValue'    in v) return v.stringValue;
  if ('integerValue'   in v) return Number(v.integerValue);
  if ('doubleValue'    in v) return v.doubleValue;
  if ('booleanValue'   in v) return v.booleanValue;
  if ('nullValue'      in v) return null;
  if ('timestampValue' in v) return { toDate: () => new Date(v.timestampValue), _raw: v.timestampValue };
  if ('arrayValue'     in v) return (v.arrayValue.values || []).map(parseVal);
  if ('mapValue'       in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = parseVal(val);
    return out;
  }
  return null;
}

function encodeVal(v) {
  if (v === null || v === undefined)  return { nullValue: null };
  if (typeof v === 'boolean')         return { booleanValue: v };
  if (typeof v === 'number')          return Number.isInteger(v) ? { integerValue: `${v}` } : { doubleValue: v };
  if (typeof v === 'string')          return { stringValue: v };
  if (Array.isArray(v))               return { arrayValue: { values: v.map(encodeVal) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) fields[k] = encodeVal(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function parseDoc(raw) {
  const id   = raw.name.split('/').pop();
  const data = {};
  for (const [k, v] of Object.entries(raw.fields || {})) data[k] = parseVal(v);
  return { uid: id, id, ...data };
}

// ─── Generic PATCH helper ─────────────────────────────────────────────────────

async function patchDoc(col, docId, updates) {
  const token  = await getToken();
  const fields = {};
  for (const [k, v] of Object.entries(updates)) fields[k] = encodeVal(v);
  const mask = Object.keys(updates)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  const res = await fetch(`${FS}/${col}/${docId}?${mask}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body:    JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
}

// ─── FREELANCERS ──────────────────────────────────────────────────────────────

export async function getAllFreelancers() {
  // No auth needed — rules: allow read: if true
  const res  = await fetch(`${FS}/freelancers?pageSize=200`);
  const data = await res.json();
  if (!res.ok) throw new Error('Freelancer read failed: ' + (data.error?.message || `HTTP ${res.status}`) + '. Set Firestore rule: allow read: if true for /freelancers/{uid}');
  return (data.documents || []).map(parseDoc);
}

export async function adminUpdateFreelancer(uid, updates) {
  await patchDoc('freelancers', uid, updates);
}

// ─── JOBS ─────────────────────────────────────────────────────────────────────

export async function getAllJobs() {
  const token = await getToken();
  const res   = await fetch(`${FS}/jobs?pageSize=200`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data  = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return (data.documents || [])
    .map(parseDoc)
    .sort((a, b) => _toMs(b.submittedAt) - _toMs(a.submittedAt));
}

export async function updateJob(jobId, updates) {
  await patchDoc('jobs', jobId, updates);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getAdminNotifications(limitN = 100) {
  const token = await getToken();
  const body  = {
    structuredQuery: {
      from:    [{ collectionId: 'notifications' }],
      where:   {
        fieldFilter: {
          field: { fieldPath: 'forAdmin' },
          op:    'EQUAL',
          value: { booleanValue: true },
        },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit:   limitN,
    },
  };
  const res  = await fetch(`${FS}:runQuery`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body:    JSON.stringify(body),
  });
  const rows = await res.json();
  if (!res.ok) throw new Error(rows.error?.message || `HTTP ${res.status}`);
  return rows.filter(r => r.document).map(r => parseDoc(r.document));
}

export async function markNotificationRead(notifId) {
  await patchDoc('notifications', notifId, { read: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _toMs(ts) {
  if (!ts) return 0;
  if (ts._raw)   return new Date(ts._raw).getTime();
  if (ts.toDate) return ts.toDate().getTime();
  return new Date(ts).getTime();
}
