// netlify/functions/verificar-pago-wompi.js
// Función serverless para verificar el estado de un pago en Wompi
//
// CONFIGURACIÓN REQUERIDA EN NETLIFY:
// Variables de entorno necesarias:
// - WOMPI_PUBLIC_KEY: Llave pública de Wompi (comienza con pub_)

const fetch = require('node-fetch');

/**
 * Validar que las variables de entorno estén configuradas
 */
function validarConfiguracion() {
    const errores = [];
    
    if (!process.env.WOMPI_PUBLIC_KEY) {
        errores.push('WOMPI_PUBLIC_KEY no configurada');
    }
    
    return errores;
}

/**
 * Validar formato de ID de transacción
 */
function validarTransactionId(id) {
    if (!id || typeof id !== 'string') {
        return { valido: false, error: 'ID de transacción inválido' };
    }
    
    // IDs de Wompi típicamente tienen formato específico
    if (id.length < 10) {
        return { valido: false, error: 'ID de transacción demasiado corto' };
    }
    
    return { valido: true };
}

exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Solo permitir GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Método no permitido',
                mensaje: 'Esta función solo acepta peticiones GET'
            })
        };
    }

    // Validar configuración del servidor
    const erroresConfig = validarConfiguracion();
    if (erroresConfig.length > 0) {
        console.error('❌ Errores de configuración:', erroresConfig);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Servidor no configurado correctamente',
                detalles: erroresConfig,
                ayuda: 'Configure las variables de entorno en Netlify: Site Settings > Environment Variables'
            })
        };
    }

    try {
        // Obtener ID de transacción de los parámetros de la URL
        const { id } = event.queryStringParameters || {};
        
        // Validar ID de transacción
        const validacion = validarTransactionId(id);
        if (!validacion.valido) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: validacion.error,
                    mensaje: 'Debes proporcionar el parámetro ?id=TRANSACTION_ID con un ID válido'
                })
            };
        }

        console.log('🔍 Verificando transacción:', id);

        // Obtener llave pública de variables de entorno
        const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;

        // Consultar transacción en Wompi API
        const wompiResponse = await fetch(
            `https://production.wompi.co/v1/transactions/${id}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${WOMPI_PUBLIC_KEY}`,
                    'Accept': 'application/json'
                }
            }
        );

        let resultado;
        try {
            resultado = await wompiResponse.json();
        } catch (parseError) {
            console.error('❌ Error parseando respuesta de Wompi:', parseError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Error procesando respuesta de Wompi',
                    mensaje: 'La respuesta del servidor no pudo ser procesada'
                })
            };
        }

        console.log('📥 Respuesta de Wompi:', {
            id: id,
            status: resultado.data?.status || 'DESCONOCIDO',
            httpStatus: wompiResponse.status
        });

        // Manejar errores HTTP
        if (!wompiResponse.ok) {
            console.error('❌ Error HTTP al consultar Wompi:', {
                status: wompiResponse.status,
                error: resultado
            });
            
            return {
                statusCode: wompiResponse.status,
                headers,
                body: JSON.stringify({
                    error: 'Error al consultar transacción en Wompi',
                    detalles: resultado.error?.reason || resultado.error || 'Error desconocido',
                    mensaje: resultado.error?.messages || 'No se pudo obtener la transacción'
                })
            };
        }

        // Verificar que tengamos datos válidos
        if (!resultado.data) {
            console.warn('⚠️ Transacción no encontrada:', id);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Transacción no encontrada',
                    id: id,
                    mensaje: 'La transacción solicitada no existe o no está disponible'
                })
            };
        }

        console.log('✅ Transacción consultada exitosamente:', {
            id,
            status: resultado.data.status,
            reference: resultado.data.reference
        });

        // Responder con los datos de la transacción
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                exito: true,
                data: resultado.data,
                mensaje: 'Transacción consultada exitosamente',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Error en función verificar-pago:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error interno del servidor',
                mensaje: error.message,
                ayuda: 'Si el error persiste, contacte al administrador',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};