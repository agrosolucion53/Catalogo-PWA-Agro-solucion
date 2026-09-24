// netlify/functions/crear-transaccion-wompi.js
// Backend serverless para procesar pagos con Wompi (crear transacción)
// 
// CONFIGURACIÓN REQUERIDA EN NETLIFY:
// Variables de entorno necesarias:
// - WOMPI_PUBLIC_KEY: Llave pública de Wompi (comienza con pub_)
// - WOMPI_PRIVATE_KEY: Llave privada de Wompi (comienza con prv_)
// - WOMPI_INTEGRITY_SECRET: Secret para firma de integridad (requerido para Nequi y otros medios)
// - URL: URL base de tu sitio en Netlify (ej: https://tu-sitio.netlify.app)

const fetchFn = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');
const crypto = require('crypto');

/**
 * Validar que todas las variables de entorno estén configuradas
 */
function validarConfiguracion() {
    const errores = [];
    const advertencias = [];
    
    if (!process.env.WOMPI_PUBLIC_KEY) {
        errores.push('WOMPI_PUBLIC_KEY no configurada');
    } else if (!process.env.WOMPI_PUBLIC_KEY.startsWith('pub_')) {
        advertencias.push('WOMPI_PUBLIC_KEY no comienza con "pub_" - verifica que sea correcta');
    }
    
    if (!process.env.WOMPI_PRIVATE_KEY) {
        errores.push('WOMPI_PRIVATE_KEY no configurada');
    } else if (!process.env.WOMPI_PRIVATE_KEY.startsWith('prv_')) {
        advertencias.push('WOMPI_PRIVATE_KEY no comienza con "prv_" - verifica que sea correcta');
    }
    
    if (!process.env.WOMPI_INTEGRITY_SECRET) {
        errores.push('WOMPI_INTEGRITY_SECRET no configurada - Requerida para Nequi y otros medios de pago');
    } else if (!process.env.WOMPI_INTEGRITY_SECRET.includes('integrity')) {
        advertencias.push('WOMPI_INTEGRITY_SECRET no contiene "integrity" - verifica que sea correcta (debe ser test_integrity_... o prod_integrity_...)');
    }
    
    // Log de advertencias si las hay
    if (advertencias.length > 0) {
        console.warn('⚠️ Advertencias de configuración:', advertencias);
    }
    
    return errores;
}

/**
 * Generar firma de integridad según documentación de Wompi
 * Formato EXACTO: SHA256(reference + amount_in_cents + currency + integrity_secret)
 * CRÍTICO: Todo en minúsculas, el amount debe ser STRING
 */
function generarFirmaIntegridad(referencia, amountInCents, moneda, integritySecret) {
    try {
        // Convertir todo a string y concatenar SIN espacios
        const referenciaStr = String(referencia);
        const amountStr = String(amountInCents);
        const monedaStr = String(moneda);
        const secretStr = String(integritySecret);
        
        // Concatenar en el orden EXACTO
        const concatenatedString = referenciaStr + amountStr + monedaStr + secretStr;
        
        // Generar hash SHA256
        const hash = crypto.createHash('sha256');
        hash.update(concatenatedString);
        const signature = hash.digest('hex');
        
        console.log('🔐 Generando firma de integridad:');
        console.log('   Referencia:', referenciaStr);
        console.log('   Monto (centavos):', amountStr);
        console.log('   Moneda:', monedaStr);
        console.log('   Concatenación:', `${referenciaStr}${amountStr}${monedaStr}[SECRET-OCULTO]`);
        console.log('   Firma SHA256:', signature);
        
        return signature;
    } catch (error) {
        console.error('❌ Error generando firma de integridad:', error);
        throw new Error('Error generando firma de seguridad');
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Preflight CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ error: 'Método no permitido. Use POST.' }) 
        };
    }

    // Validar configuración del servidor antes de procesar
    const erroresConfig = validarConfiguracion();
    if (erroresConfig.length > 0) {
        console.error('❌ Errores de configuración:', erroresConfig);
        console.error('📋 Variables de entorno requeridas:');
        console.error('   - WOMPI_PUBLIC_KEY (pub_test_... o pub_prod_...)');
        console.error('   - WOMPI_PRIVATE_KEY (prv_test_... o prv_prod_...)');
        console.error('   - WOMPI_INTEGRITY_SECRET (test_integrity_... o prod_integrity_...)');
        console.error('🔧 Configúralas en: Netlify Dashboard > Site Settings > Environment Variables');
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Servidor no configurado correctamente',
                detalles: erroresConfig,
                ayuda: 'Configure las variables de entorno en Netlify: Site Settings > Environment Variables',
                variables_requeridas: [
                    'WOMPI_PUBLIC_KEY (pub_test_... o pub_prod_...)',
                    'WOMPI_PRIVATE_KEY (prv_test_... o prv_prod_...)',
                    'WOMPI_INTEGRITY_SECRET (test_integrity_... o prod_integrity_...)'
                ],
                guia: 'Ver archivo CONFIGURACION-NETLIFY-WOMPI.md para instrucciones detalladas'
            })
        };
    }

    // Parsear payload
    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return { 
            statusCode: 400, 
            headers, 
            body: JSON.stringify({ error: 'JSON inválido' }) 
        };
    }

    const { monto, moneda = 'COP', referencia, email, telefono = '', nombre = '', productos = [] } = payload;

    // Validaciones de datos de entrada
    const errores = [];
    if (typeof monto !== 'number' || isNaN(monto) || monto <= 0) {
        errores.push('monto debe ser un número positivo');
    }
    if (!referencia || typeof referencia !== 'string') {
        errores.push('referencia es requerida y debe ser texto');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        errores.push('email es requerido y debe ser válido');
    }
    if (moneda !== 'COP' && moneda !== 'USD') {
        errores.push('moneda debe ser COP o USD');
    }

    if (errores.length) {
        return { 
            statusCode: 400, 
            headers, 
            body: JSON.stringify({ 
                error: 'Datos inválidos', 
                detalles: errores 
            }) 
        };
    }

    // Obtener variables de entorno (ya validadas arriba)
    const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;
    const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;

    try {
        // Wompi utiliza su widget de checkout con firma de integridad
        const amountInCents = Math.round(monto * 100);
        const redirectUrl = `${process.env.URL || 'https://agrosolucion.netlify.app'}/confirmacion-pago.html`;
        
        // Generar firma de integridad (CRÍTICO para seguridad)
        const signature = generarFirmaIntegridad(
            referencia, 
            amountInCents, 
            moneda, 
            WOMPI_INTEGRITY_SECRET
        );
        
        // Construir URL del widget de Wompi MANUALMENTE
        // IMPORTANTE: Wompi es MUY estricto con el formato de la URL
        const checkoutUrl = 'https://checkout.wompi.co/p/' +
            '?public-key=' + encodeURIComponent(WOMPI_PUBLIC_KEY) +
            '&currency=' + encodeURIComponent(moneda) +
            '&amount-in-cents=' + encodeURIComponent(amountInCents) +
            '&reference=' + encodeURIComponent(referencia) +
            '&signature:integrity=' + signature +  // NO codificar la firma ni los :
            '&redirect-url=' + encodeURIComponent(redirectUrl) +
            '&customer-data:email=' + encodeURIComponent(email) +  // : literal, valor codificado
            '&customer-data:full-name=' + encodeURIComponent(nombre || 'Cliente') +
            '&customer-data:phone-number=' + encodeURIComponent(telefono || '3135212887');

        console.log('✅ Transacción Wompi creada:');
        console.log('==========================================');
        console.log('Referencia:', referencia);
        console.log('Monto (pesos):', monto);
        console.log('Monto (centavos):', amountInCents);
        console.log('Moneda:', moneda);
        console.log('Email:', email);
        console.log('Nombre:', nombre);
        console.log('Teléfono:', telefono);
        console.log('Public Key:', WOMPI_PUBLIC_KEY ? WOMPI_PUBLIC_KEY.substring(0, 15) + '...' : 'NO DEFINIDA');
        console.log('Firma generada:', signature);
        console.log('==========================================');
        console.log('URL completa:', checkoutUrl);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                exito: true, 
                referencia, 
                checkout_url: checkoutUrl,
                transaccion: {
                    reference: referencia,
                    amount_in_cents: amountInCents,
                    currency: moneda,
                    customer_email: email,
                    signature: signature,
                    timestamp: new Date().toISOString()
                }
            })
        };
    } catch (e) {
        console.error('❌ Error procesando transacción:', e);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: 'Error interno procesando transacción', 
                mensaje: e.message 
            }) 
        };
    }
};