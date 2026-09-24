// =========================================
// FUNCIÓN NETLIFY: Registrar Referido
// =========================================

const fs = require('fs').promises;
const path = require('path');

// Archivo donde se almacenarán los datos
const DATA_FILE = path.join('/tmp', 'referidos.json');

/**
 * Lee los datos de referidos desde el archivo
 */
async function leerDatos() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, devolver estructura inicial
        return {
            codigos: {},
            referidos: []
        };
    }
}

/**
 * Guarda los datos de referidos en el archivo
 */
async function guardarDatos(datos) {
    await fs.writeFile(DATA_FILE, JSON.stringify(datos, null, 2));
}

/**
 * Handler principal de Netlify Function
 */
exports.handler = async (event, context) => {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const datos = await leerDatos();

        // GET: Consultar información de un código
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const codigo = params.codigo;

            if (!codigo) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Código requerido' })
                };
            }

            const infoCodigo = datos.codigos[codigo] || {
                codigo: codigo,
                totalReferidos: 0,
                descuentosDisponibles: 0,
                referidos: []
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(infoCodigo)
            };
        }

        // POST: Registrar nuevo referido
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { codigoReferente, pedidoId, total } = body;

            if (!codigoReferente) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Código de referente requerido' })
                };
            }

            // Inicializar código si no existe
            if (!datos.codigos[codigoReferente]) {
                datos.codigos[codigoReferente] = {
                    codigo: codigoReferente,
                    totalReferidos: 0,
                    descuentosDisponibles: 0,
                    referidos: []
                };
            }

            // Registrar el referido
            const nuevoReferido = {
                pedidoId: pedidoId || 'PED-' + Date.now(),
                timestamp: new Date().toISOString(),
                total: total || 0,
                descuentoUsado: false
            };

            datos.codigos[codigoReferente].totalReferidos += 1;
            datos.codigos[codigoReferente].descuentosDisponibles += 1;
            datos.codigos[codigoReferente].referidos.push(nuevoReferido);

            // Agregar a lista global
            datos.referidos.push({
                codigoReferente,
                ...nuevoReferido
            });

            await guardarDatos(datos);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    mensaje: 'Referido registrado exitosamente',
                    data: datos.codigos[codigoReferente]
                })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método no permitido' })
        };

    } catch (error) {
        console.error('Error en registrar-referido:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Error interno del servidor',
                details: error.message 
            })
        };
    }
};
