// =========================================
// FUNCIÓN NETLIFY: Crear Transacción Nequi
// =========================================
// Sistema de pago por Nequi con notificación push y QR

const axios = require('axios');

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
        const { total, referencia, items, clienteInfo, telefonoCliente } = JSON.parse(event.body || '{}');

        if (!total || !referencia) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Faltan datos requeridos',
                    required: ['total', 'referencia']
                })
            };
        }

        const transaccionId = `NEQ-${Date.now()}`;
        let pushExitoso = false;
        let mensajePush = '';

        // ========================================
        // INTEGRACIÓN CON API DE NEQUI (PUSH TO PAY)
        // ========================================
        if (telefonoCliente && process.env.NEQUI_API_KEY) {
            try {
                // Configuración de Nequi
                const nequiConfig = {
                    apiKey: process.env.NEQUI_API_KEY,
                    apiSecret: process.env.NEQUI_API_SECRET,
                    clientId: process.env.NEQUI_CLIENT_ID,
                    phoneNumberBusiness: process.env.NEQUI_PHONE || '3104915876',
                    urlBase: process.env.NEQUI_URL_BASE || 'https://api.nequi.com.co'
                };

                // Generar token de acceso
                const tokenResponse = await axios.post(
                    `${nequiConfig.urlBase}/oauth/token`,
                    {
                        grant_type: 'client_credentials',
                        client_id: nequiConfig.clientId,
                        client_secret: nequiConfig.apiSecret
                    },
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );

                const accessToken = tokenResponse.data.access_token;

                // Enviar notificación push de pago
                const pushResponse = await axios.post(
                    `${nequiConfig.urlBase}/payments/v2/-services-paymentservice-unregisteredpayment`,
                    {
                        RequestMessage: {
                            RequestHeader: {
                                Channel: 'PNP04-C001',
                                RequestDate: new Date().toISOString(),
                                MessageID: transaccionId,
                                ClientID: nequiConfig.clientId,
                                Destination: {
                                    ServiceName: 'PaymentsService',
                                    ServiceOperation: 'unregisteredPayment',
                                    ServiceRegion: 'C001',
                                    ServiceVersion: '1.0.0'
                                }
                            },
                            RequestBody: {
                                any: {
                                    unregisteredPaymentRQ: {
                                        phoneNumber: telefonoCliente.replace(/\D/g, ''), // Solo números
                                        code: nequiConfig.phoneNumberBusiness,
                                        value: total.toString(),
                                        reference1: referencia,
                                        reference2: 'AGRO SOLUCION',
                                        reference3: items ? items.slice(0, 3).map(i => i.nombre).join(', ') : ''
                                    }
                                }
                            }
                        }
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                            'x-api-key': nequiConfig.apiKey
                        }
                    }
                );

                if (pushResponse.data?.ResponseMessage?.ResponseBody?.any?.unregisteredPaymentRS) {
                    const response = pushResponse.data.ResponseMessage.ResponseBody.any.unregisteredPaymentRS;
                    if (response.statusCode === '0' || response.statusCode === '00') {
                        pushExitoso = true;
                        mensajePush = `✅ Notificación enviada a Nequi (${telefonoCliente}). El cliente debe aprobar el pago en su app.`;
                        console.log('✅ Push to Pay enviado exitosamente:', response);
                    } else {
                        mensajePush = `⚠️ Nequi respondió con código ${response.statusCode}: ${response.statusDesc || 'Error desconocido'}`;
                        console.warn('⚠️ Error en Push to Pay:', response);
                    }
                }

            } catch (nequiError) {
                console.error('❌ Error en integración Nequi:', nequiError.response?.data || nequiError.message);
                mensajePush = '⚠️ No se pudo enviar la notificación push. Se mostrarán instrucciones manuales.';
            }
        }

        // Generar transacción (con o sin push exitoso)
        const transaccion = {
            id: transaccionId,
            referencia: referencia,
            estado: pushExitoso ? 'PUSH_ENVIADO' : 'PENDIENTE',
            total: total,
            numeroNequi: '3104915876',
            nombreNegocio: 'AGRO SOLUCION',
            items: items || [],
            clienteInfo: clienteInfo || {},
            telefonoCliente: telefonoCliente || null,
            pushEnviado: pushExitoso,
            mensajePush: mensajePush,
            fechaCreacion: new Date().toISOString(),
            expiraEn: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            instrucciones: pushExitoso ? [
                '✅ Notificación enviada a tu Nequi',
                '1. Revisa tu app Nequi',
                '2. Busca la notificación de pago',
                '3. Verifica el monto: $' + total.toLocaleString('es-CO'),
                '4. Aprueba el pago con tu clave',
                '5. ¡Listo! Recibirás confirmación'
            ] : [
                '1. Abre tu app Nequi',
                '2. Ve a "Enviar Plata"',
                '3. Ingresa el número: 310 491 5876',
                '4. Monto exacto: $' + total.toLocaleString('es-CO'),
                '5. En concepto escribe: ' + referencia,
                '6. Toma captura del comprobante',
                '7. Envíala por WhatsApp al 313 521 2887'
            ],
            whatsappLink: `https://wa.me/573135212887?text=${encodeURIComponent(
                `Hola! 👋\n\nAcabo de hacer un pago por Nequi:\n\n💰 Monto: $${total.toLocaleString('es-CO')}\n📝 Referencia: ${referencia}\n\n📸 Te envío el comprobante de pago.`
            )}`
        };

        console.log('✅ Transacción Nequi creada:', transaccion.id, `(Push: ${pushExitoso})`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                transaccion: transaccion,
                pushEnviado: pushExitoso,
                mensaje: pushExitoso ? 
                    'Notificación enviada a Nequi exitosamente' : 
                    'Transacción creada - Sigue las instrucciones manuales'
            })
        };

    } catch (error) {
        console.error('❌ Error creando transacción Nequi:', error);
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
