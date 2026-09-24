/**
 * Función Netlify para guardar tokens FCM de usuarios
 * Ruta: /.netlify/functions/guardar-token-fcm
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

/**
 * Inicializar Firebase Admin SDK
 */
function initFirebase() {
    if (getApps().length === 0) {
        try {
            const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
            if (!serviceAccountB64) {
                console.error('❌ FIREBASE_SERVICE_ACCOUNT_B64 no está configurado');
                throw new Error('Firebase no configurado - credenciales faltantes');
            }

            const serviceAccount = JSON.parse(
                Buffer.from(serviceAccountB64, 'base64').toString('utf8')
            );

            initializeApp({
                credential: cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
            });

            console.log('✅ Firebase Admin SDK inicializado para guardar-token-fcm');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error.message);
            throw error;
        }
    }
    return getFirestore();
}

/**
 * Handler principal
 */
exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Solo aceptar POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ ok: false, error: 'Método no permitido' })
        };
    }

    try {
        // Parsear body
        const { token, userAgent, timestamp } = JSON.parse(event.body || '{}');

        // Validar token
        if (!token || typeof token !== 'string') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ ok: false, error: 'Token inválido' })
            };
        }

        // Inicializar Firestore
        const db = initFirebase();

        // Guardar token en Firestore
        const tokenData = {
            token: token,
            userAgent: userAgent || 'Unknown',
            createdAt: Timestamp.now(),
            lastUpdated: Timestamp.now(),
            active: true,
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'Unknown'
        };

        // Usar el token como ID del documento para evitar duplicados
        await db.collection('fcm_tokens').doc(token).set(tokenData, { merge: true });

        console.log('✅ Token FCM guardado:', token.substring(0, 20) + '...');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message: 'Token guardado correctamente',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Error guardando token FCM:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                ok: false,
                error: 'Error interno del servidor',
                details: error.message
            })
        };
    }
};
