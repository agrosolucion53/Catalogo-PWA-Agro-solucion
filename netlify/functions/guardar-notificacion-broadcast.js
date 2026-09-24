/**
 * Función Netlify para guardar notificaciones broadcast en Firestore
 * Ruta: /.netlify/functions/guardar-notificacion-broadcast
 * 
 * Permite que las notificaciones enviadas se guarden en Firestore
 * para que usuarios offline puedan sincronizarlas después
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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

            console.log('✅ Firebase Admin SDK inicializado para guardar-notificacion-broadcast');
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        // Verificar autorización (mismo mecanismo que enviar-notificacion-fcm)
        const authHeader = event.headers.authorization || event.headers.Authorization;
        const expectedAuth = process.env.FCM_ADMIN_SECRET || 'tu-secreto-admin';
        
        if (authHeader !== `Bearer ${expectedAuth}`) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ ok: false, error: 'No autorizado' })
            };
        }

        // Parsear body
        const { title, body, tipo, icon, url, data, ttl } = JSON.parse(event.body || '{}');

        // Validar datos mínimos
        if (!title || !body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ ok: false, error: 'Título y cuerpo requeridos' })
            };
        }

        // Inicializar Firestore
        const db = initFirebase();

        // Preparar documento de notificación
        const notificacionDoc = {
            title: title,
            body: body,
            titulo: title, // Para compatibilidad con frontend
            mensaje: body, // Para compatibilidad con frontend
            tipo: tipo || 'general',
            icon: icon || '/Imagenes/logo/Logo agro.png',
            icono: data?.icono || '🔔',
            url: url || '/',
            data: data || {},
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            sendToAll: true,
            active: true,
            ttl: ttl || 7 * 24 * 60 * 60 * 1000, // 7 días por defecto
            readBy: [] // Array de IDs de usuarios que ya leyeron
        };

        // Guardar en Firestore
        const docRef = await db.collection('notificaciones_broadcast').add(notificacionDoc);

        console.log('✅ Notificación broadcast guardada con ID:', docRef.id);

        // Opcional: Limpiar notificaciones antiguas (más de TTL días)
        const ttlMs = notificacionDoc.ttl;
        const fechaLimite = new Date(Date.now() - ttlMs);
        
        const antiguasSnapshot = await db.collection('notificaciones_broadcast')
            .where('timestamp', '<', fechaLimite)
            .get();

        if (!antiguasSnapshot.empty) {
            const batch = db.batch();
            antiguasSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`🧹 ${antiguasSnapshot.size} notificaciones antiguas eliminadas`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                id: docRef.id,
                message: 'Notificación guardada correctamente',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Error guardando notificación:', error);
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
