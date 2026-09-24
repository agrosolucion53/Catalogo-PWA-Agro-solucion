/**
 * Netlify Function: moderar-resena.js
 * Gestiona acciones de moderación sobre reseñas
 * POST /.netlify/functions/moderar-resena
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
                throw new Error('Firebase no configurado');
            }
            
            const serviceAccount = JSON.parse(
                Buffer.from(serviceAccountB64, 'base64').toString('utf8')
            );
            
            initializeApp({
                credential: cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
            });
            
            console.log('✅ Firebase inicializado para moderación');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error.message);
            throw error;
        }
    }
    
    return getFirestore();
}

/**
 * Función principal
 */
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ ok: false, error: 'Solo POST permitido' })
        };
    }
    
    try {
        const { reviewId, action, responseText } = JSON.parse(event.body);
        
        if (!reviewId || !action) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ ok: false, error: 'reviewId y action requeridos' })
            };
        }
        
        const db = initFirebase();
        const reviewRef = db.collection('reviews').doc(reviewId);
        const reviewDoc = await reviewRef.get();
        
        if (!reviewDoc.exists) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ ok: false, error: 'Reseña no encontrada' })
            };
        }
        
        let updateData = {};
        let message = '';
        
        switch (action) {
            case 'approve':
                updateData = { 
                    published: true,
                    moderatedAt: FieldValue.serverTimestamp(),
                    moderatedAction: 'approved'
                };
                message = 'Reseña aprobada';
                break;
                
            case 'unpublish':
                updateData = { 
                    published: false,
                    moderatedAt: FieldValue.serverTimestamp(),
                    moderatedAction: 'unpublished'
                };
                message = 'Reseña despublicada';
                break;
                
            case 'verify':
                updateData = { 
                    verified: true,
                    verifiedAt: FieldValue.serverTimestamp()
                };
                message = 'Reseña marcada como verificada';
                break;
                
            case 'respond':
                if (!responseText || responseText.trim().length === 0) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ ok: false, error: 'responseText requerido' })
                    };
                }
                
                updateData = {
                    adminResponse: {
                        texto: responseText.trim(),
                        fecha: new Date().toISOString(),
                        autor: 'Equipo AGRO SOLUCION'
                    },
                    respondedAt: FieldValue.serverTimestamp()
                };
                message = 'Respuesta guardada';
                break;
                
            case 'delete':
                await reviewRef.delete();
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        ok: true, 
                        message: 'Reseña eliminada permanentemente' 
                    })
                };
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        ok: false, 
                        error: 'Acción no válida. Use: approve, unpublish, verify, respond, delete' 
                    })
                };
        }
        
        // Actualizar documento
        await reviewRef.update(updateData);
        
        console.log(`✅ Acción '${action}' ejecutada en reseña ${reviewId}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message,
                reviewId,
                action
            })
        };
        
    } catch (error) {
        console.error('❌ Error moderando reseña:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                ok: false,
                error: 'Error interno del servidor',
                message: error.message
            })
        };
    }
};
