// =========================================
// FUNCIÓN NETLIFY: Usar Descuento de Recompensa
// =========================================

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join('/tmp', 'referidos.json');

async function leerDatos() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            codigos: {},
            referidos: []
        };
    }
}

async function guardarDatos(datos) {
    await fs.writeFile(DATA_FILE, JSON.stringify(datos, null, 2));
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método no permitido' })
        };
    }

    try {
        const datos = await leerDatos();
        const { codigo } = JSON.parse(event.body || '{}');

        if (!codigo || !datos.codigos[codigo]) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Código no encontrado' })
            };
        }

        const infoCodigo = datos.codigos[codigo];

        if (infoCodigo.descuentosDisponibles <= 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'No hay descuentos disponibles',
                    descuentosDisponibles: 0
                })
            };
        }

        // Marcar un referido como usado
        const referidoSinUsar = infoCodigo.referidos.find(r => !r.descuentoUsado);
        if (referidoSinUsar) {
            referidoSinUsar.descuentoUsado = true;
            referidoSinUsar.fechaUso = new Date().toISOString();
            infoCodigo.descuentosDisponibles -= 1;
        }

        await guardarDatos(datos);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                mensaje: 'Descuento usado exitosamente',
                descuentosRestantes: infoCodigo.descuentosDisponibles
            })
        };

    } catch (error) {
        console.error('Error en usar-descuento:', error);
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
