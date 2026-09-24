/**
 * Función Netlify para obtener notificaciones recientes
 * Ruta: /.netlify/functions/obtener-notificaciones
 * 
 * Permite sincronizar notificaciones que un usuario pudo haber perdido
 * cuando estuvo offline o no tenía la app abierta
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

            console.log('✅ Firebase Admin SDK inicializado para obtener-notificaciones');
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
        // Obtener parámetros de query
        const params = event.queryStringParameters || {};
        const desde = params.desde ? parseInt(params.desde) : Date.now() - (24 * 60 * 60 * 1000); // Por defecto: últimas 24 horas
        const limite = params.limite ? Math.min(parseInt(params.limite), 100) : 50; // Máximo 100
        
        console.log(`📡 Consultando notificaciones desde: ${new Date(desde).toISOString()}`);

        // Inicializar Firestore
        const db = initFirebase();

        // Obtener notificaciones broadcast (enviadas a "todos")
        // Estas son las que un usuario pudo haber perdido
        const notificacionesSnapshot = await db.collection('notificaciones_broadcast')
            .where('timestamp', '>=', Timestamp.fromMillis(desde))
            .orderBy('timestamp', 'desc')
            .limit(limite)
            .get();

        const notificaciones = [];
        
        notificacionesSnapshot.forEach(doc => {
            const data = doc.data();
            notificaciones.push({
                id: doc.id,
                titulo: data.title || data.titulo,
                mensaje: data.body || data.mensaje,
                tipo: data.tipo || 'general',
                icono: data.icon || data.icono || '/Imagenes/logo/Logo.png',
                url: data.url || '/',
                timestamp: data.timestamp?.toMillis() || Date.now(),
                createdAt: data.createdAt?.toMillis() || data.timestamp?.toMillis() || Date.now()
            });
        });

        console.log(`✅ ${notificaciones.length} notificaciones encontradas`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                notificaciones: notificaciones,
                total: notificaciones.length,
                desde: new Date(desde).toISOString(),
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Error obteniendo notificaciones:', error);
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
