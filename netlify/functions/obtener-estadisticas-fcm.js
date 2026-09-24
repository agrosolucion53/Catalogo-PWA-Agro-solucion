/**
 * Función Netlify para obtener estadísticas de tokens FCM
 * Ruta: /.netlify/functions/obtener-estadisticas-fcm
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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

            console.log('✅ Firebase Admin SDK inicializado para obtener-estadisticas-fcm');
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Solo aceptar GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ ok: false, error: 'Método no permitido' })
        };
    }

    try {
        // Inicializar Firestore
        const db = initFirebase();

        // Obtener todos los tokens
        const allTokensSnapshot = await db.collection('fcm_tokens').get();
        const totalTokens = allTokensSnapshot.size;

        // Obtener tokens activos
        const activeTokensSnapshot = await db.collection('fcm_tokens')
            .where('active', '==', true)
            .get();
        const activeTokens = activeTokensSnapshot.size;

        // Obtener tokens inactivos
        const inactiveTokens = totalTokens - activeTokens;

        // Calcular tokens de hoy (últimas 24 horas)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let tokensToday = 0;
        allTokensSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.createdAt && data.createdAt.toDate() >= yesterday) {
                tokensToday++;
            }
        });

        console.log(`📊 Estadísticas: ${totalTokens} total, ${activeTokens} activos`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                stats: {
                    totalTokens: totalTokens,
                    activeTokens: activeTokens,
                    inactiveTokens: inactiveTokens,
                    tokensToday: tokensToday,
                    successRate: activeTokens > 0 ? Math.round((activeTokens / totalTokens) * 100) : 0
                },
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
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
