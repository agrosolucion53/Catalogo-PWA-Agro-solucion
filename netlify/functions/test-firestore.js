/**
 * Netlify Function: test-firestore.js
 * Verifica la conexión y credenciales con Firebase Admin/Firestore sin escribir por defecto.
 * GET /.netlify/functions/test-firestore
 * Opciones:
 *   - write=true  -> realiza una escritura de prueba en la colección "diagnostics" y la borra
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

function buildHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  };
}

function decodeServiceAccount() {
  const result = { ok: false };
  try {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) {
      result.error = 'FIREBASE_SERVICE_ACCOUNT_B64 ausente';
      return result;
    }
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const obj = JSON.parse(json);
    result.ok = true;
    result.account = {
      project_id: obj.project_id,
      client_email: obj.client_email,
      private_key_id: obj.private_key_id ? `${String(obj.private_key_id).slice(0,6)}…` : undefined
    };
    return { ...result, raw: obj };
  } catch (e) {
    result.error = `Error decodificando service account: ${e.message}`;
    return result;
  }
}

function initFirebase(force = false, decoded) {
  if (force || getApps().length === 0) {
    const info = decoded || decodeServiceAccount();
    if (!info.ok) throw new Error(info.error || 'Credenciales inválidas');

    initializeApp({
      credential: cert(info.raw),
      projectId: process.env.FIREBASE_PROJECT_ID || info.raw.project_id
    });
  }
  return getFirestore();
}

async function tryRead(db) {
  const started = Date.now();
  let count = 0;
  try {
    const snap = await db.collection('reviews').limit(1).get();
    count = snap.size;
    return { ok: true, count, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: e.message, ms: Date.now() - started };
  }
}

async function tryWriteAndCleanup(db) {
  const started = Date.now();
  const doc = {
    type: 'connectivity-test',
    createdAt: Timestamp.now(),
    note: 'Documento temporal para verificación de conexión (se elimina al instante)'
  };
  try {
    const ref = await db.collection('diagnostics').add(doc);
    await ref.delete();
    return { ok: true, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: e.message, ms: Date.now() - started };
  }
}

exports.handler = async (event) => {
  const headers = buildHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido. Use GET.' }) };
  }

  const params = event.queryStringParameters || {};
  const doWrite = params.write === 'true';

  const response = {
    ok: false,
    env: {
      hasServiceAccount: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_B64),
      projectId: process.env.FIREBASE_PROJECT_ID || null
    },
    steps: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Paso 1: decodificar credenciales
    const decoded = decodeServiceAccount();
    response.steps.push({ step: 'decodeServiceAccount', ...decoded, raw: undefined });
    if (!decoded.ok) throw new Error(decoded.error || 'No se pudo decodificar FIREBASE_SERVICE_ACCOUNT_B64');

    // Paso 2: inicializar Firebase Admin
    let db;
    try {
      db = initFirebase(false, decoded);
      response.steps.push({ step: 'initializeAdmin', ok: true });
    } catch (e) {
      response.steps.push({ step: 'initializeAdmin', ok: false, error: e.message });
      throw e;
    }

    // Paso 3: lectura simple (colección reviews)
    const readRes = await tryRead(db);
    response.steps.push({ step: 'readReviewsLimit1', ...readRes });

    // Paso 4 (opcional): escritura temporal
    if (doWrite) {
      const writeRes = await tryWriteAndCleanup(db);
      response.steps.push({ step: 'writeAndDeleteDiagnostic', ...writeRes });
    }

    response.ok = readRes.ok && (!doWrite || response.steps.at(-1)?.ok);
    response.message = response.ok
      ? 'Conexión a Firestore verificada correctamente.'
      : 'Se detectaron problemas al verificar Firestore. Revise los pasos.';

    return { statusCode: 200, headers, body: JSON.stringify(response) };
  } catch (e) {
    response.ok = false;
    response.message = e.message || 'Error verificando conexión con Firestore';
    return { statusCode: 500, headers, body: JSON.stringify(response) };
  }
};
