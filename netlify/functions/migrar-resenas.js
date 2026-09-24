/**
 * Script de migración: Publicar todas las reseñas pendientes
 * Ejecutar UNA VEZ después de desplegar el nuevo código
 * 
 * Uso: https://TU-SITIO.netlify.app/.netlify/functions/migrar-resenas?secret=TU_CLAVE_SECRETA
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
                throw new Error('Firebase no configurado - credenciales faltantes');
            }
            
            const serviceAccount = JSON.parse(
                Buffer.from(serviceAccountB64, 'base64').toString('utf8')
            );
            
            initializeApp({
                credential: cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
            });
            
            console.log('✅ Firebase inicializado para migración');
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
        'Content-Type': 'application/json'
    };
    
    // Verificar método
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Solo GET permitido' })
        };
    }
    
    // Verificar clave secreta (seguridad básica)
    const secret = event.queryStringParameters?.secret;
    const expectedSecret = process.env.ADMIN_SECRET || 'cambiar-esto-123';
    
    if (secret !== expectedSecret) {
        console.log('❌ Intento de acceso no autorizado');
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ 
                error: 'No autorizado',
                hint: 'Usa ?secret=TU_CLAVE_SECRETA'
            })
        };
    }
    
    try {
        console.log('🚀 Iniciando migración de reseñas...');
        
        const db = initFirebase();
        
        // Obtener todas las reseñas NO publicadas
        const snapshot = await db.collection('reviews')
            .where('published', '==', false)
            .get();
        
        if (snapshot.empty) {
            console.log('✅ No hay reseñas pendientes de publicar');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ok: true,
                    message: 'No hay reseñas pendientes',
                    updated: 0
                })
            };
        }
        
        console.log(`📊 Encontradas ${snapshot.size} reseñas pendientes`);
        
        // Actualizar en lote
        const batch = db.batch();
        let count = 0;
        
        snapshot.forEach(doc => {
            batch.update(doc.ref, { 
                published: true,
                migratedAt: new Date().toISOString()
            });
            count++;
            console.log(`  ✅ Marcada para publicar: ${doc.id}`);
        });
        
        // Ejecutar batch
        await batch.commit();
        
        console.log(`✅ Migración completada: ${count} reseñas publicadas`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message: 'Migración exitosa',
                updated: count,
                details: `${count} reseñas ahora están publicadas`
            })
        };
        
    } catch (error) {
        console.error('❌ Error en migración:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                ok: false,
                error: 'Error en migración',
                message: error.message
            })
        };
    }
};
