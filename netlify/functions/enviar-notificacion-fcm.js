/**
 * Función Netlify para enviar notificaciones push via Firebase Cloud Messaging
 * Ruta: /.netlify/functions/enviar-notificacion-fcm
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

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

            console.log('✅ Firebase Admin SDK inicializado para enviar-notificacion-fcm');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error.message);
            throw error;
        }
    }
    return { db: getFirestore(), messaging: getMessaging() };
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
        // Verificar autorización simple (puedes mejorar esto)
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
        const { 
            title, 
            body, 
            icon, 
            image, 
            url, 
            data,
            targetTokens, // Array de tokens específicos (opcional)
            sendToAll // Si es true, envía a todos los tokens activos
        } = JSON.parse(event.body || '{}');

        // Validar datos mínimos
        if (!title || !body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ ok: false, error: 'Título y cuerpo requeridos' })
            };
        }

        // Inicializar Firebase
        const { db, messaging } = initFirebase();

        let tokens = [];

        // Obtener tokens
        if (targetTokens && Array.isArray(targetTokens) && targetTokens.length > 0) {
            // Usar tokens específicos
            tokens = targetTokens;
        } else if (sendToAll) {
            // Obtener todos los tokens activos de Firestore
            const tokensSnapshot = await db.collection('fcm_tokens')
                .where('active', '==', true)
                .get();
            
            tokens = tokensSnapshot.docs.map(doc => doc.data().token);
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    ok: false, 
                    error: 'Debe especificar targetTokens o sendToAll=true' 
                })
            };
        }

        // Si no hay tokens, devolver éxito con 0 notificaciones enviadas
        if (tokens.length === 0) {
            console.log('⚠️ No hay tokens disponibles, pero la operación es válida');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ok: true,
                    message: 'No hay usuarios registrados aún',
                    results: {
                        totalTokens: 0,
                        successCount: 0,
                        failureCount: 0,
                        errors: []
                    },
                    timestamp: new Date().toISOString()
                })
            };
        }

        console.log(`📤 Enviando notificación a ${tokens.length} dispositivo(s)`);

        // Construir mensaje - IMPORTANTE: icon e image van en webpush, no en notification
        // 🆕 AGREGADO: Incluir TODOS los campos necesarios para el centro de notificaciones
        const message = {
            notification: {
                title: title,
                body: body
            },
            data: {
                // Campos necesarios para el centro de notificaciones
                titulo: title,
                mensaje: body,
                tipo: data?.tipo || 'general',
                icono: data?.icono || '🔔',
                icon: icon || '/Imagenes/logo/Logo.png',
                url: url || '/',
                timestamp: new Date().toISOString(),
                // Datos adicionales
                ...(data || {})
            },
            webpush: {
                notification: {
                    title: title,
                    body: body,
                    ...(icon && { icon: icon }),
                    ...(image && { image: image })
                },
                fcmOptions: {
                    link: url || '/'
                }
            }
        };

        // Enviar notificaciones
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Enviar en lotes de 500 (límite de FCM)
        const batchSize = 500;
        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            
            try {
                const response = await messaging.sendEachForMulticast({
                    ...message,
                    tokens: batch
                });

                results.success += response.successCount;
                results.failed += response.failureCount;

                // Registrar tokens inválidos para eliminarlos
                if (response.failureCount > 0) {
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            const failedToken = batch[idx];
                            results.errors.push({
                                token: failedToken.substring(0, 20) + '...',
                                error: resp.error?.message || 'Unknown error'
                            });

                            // Marcar token como inactivo si está inválido
                            if (resp.error?.code === 'messaging/invalid-registration-token' ||
                                resp.error?.code === 'messaging/registration-token-not-registered') {
                                db.collection('fcm_tokens').doc(failedToken).update({ active: false })
                                    .catch(err => console.error('Error marcando token inactivo:', err));
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Error enviando lote:', error);
                results.failed += batch.length;
                results.errors.push({ batch: i, error: error.message });
            }
        }

        console.log(`✅ Notificaciones enviadas: ${results.success} éxitos, ${results.failed} fallos`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message: 'Notificaciones enviadas',
                results: {
                    totalTokens: tokens.length,
                    successCount: results.success,
                    failureCount: results.failed,
                    errors: results.errors.slice(0, 10) // Limitar errores en respuesta
                },
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Error enviando notificaciones:', error);
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
