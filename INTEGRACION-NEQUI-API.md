# 🔍 Guía de Implementación - API Nequi Push to Pay

## 📖 Resumen de la Integración

La integración con Nequi permite enviar notificaciones push directamente a la app del cliente para que apruebe el pago sin necesidad de ingresar datos manualmente.

---

## 🔐 Autenticación

### Endpoint para obtener token:
```
POST https://api.nequi.com.co/oauth/token
```

### Body:
```json
{
  "grant_type": "client_credentials",
  "client_id": "TU_CLIENT_ID",
  "client_secret": "TU_CLIENT_SECRET"
}
```

### Respuesta exitosa:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## 💸 Envío de Notificación de Pago (Push to Pay)

### Endpoint:
```
POST https://api.nequi.com.co/payments/v2/-services-paymentservice-unregisteredpayment
```

### Headers:
```
Content-Type: application/json
Authorization: Bearer {access_token}
x-api-key: {tu_api_key}
```

### Body de la solicitud:
```json
{
  "RequestMessage": {
    "RequestHeader": {
      "Channel": "PNP04-C001",
      "RequestDate": "2025-12-19T10:30:00.000Z",
      "MessageID": "NEQ-1734604200000",
      "ClientID": "TU_CLIENT_ID",
      "Destination": {
        "ServiceName": "PaymentsService",
        "ServiceOperation": "unregisteredPayment",
        "ServiceRegion": "C001",
        "ServiceVersion": "1.0.0"
      }
    },
    "RequestBody": {
      "any": {
        "unregisteredPaymentRQ": {
          "phoneNumber": "3001234567",
          "code": "3104915876",
          "value": "25000",
          "reference1": "REF-1734604200000",
          "reference2": "AGRO SOLUCION",
          "reference3": "Empanadas x2, Deditos x1"
        }
      }
    }
  }
}
```

### Parámetros:
- `phoneNumber`: Celular del cliente (debe estar registrado en Nequi)
- `code`: Número de Nequi del negocio (3104915876)
- `value`: Monto a cobrar (string, sin puntos ni comas)
- `reference1`: Referencia única de la transacción
- `reference2`: Nombre del negocio
- `reference3`: Descripción del pedido (máx 3 productos)

---

## ✅ Respuestas de la API

### Respuesta exitosa (Push enviado):
```json
{
  "ResponseMessage": {
    "ResponseHeader": {
      "Status": {
        "StatusCode": "0",
        "StatusDesc": "Exitoso"
      }
    },
    "ResponseBody": {
      "any": {
        "unregisteredPaymentRS": {
          "statusCode": "0",
          "statusDesc": "Notificación enviada exitosamente",
          "transactionId": "1234567890",
          "trnId": "987654321"
        }
      }
    }
  }
}
```

### Respuesta con error - Usuario no registrado:
```json
{
  "ResponseMessage": {
    "ResponseHeader": {
      "Status": {
        "StatusCode": "4",
        "StatusDesc": "Usuario no encontrado"
      }
    },
    "ResponseBody": {
      "any": {
        "unregisteredPaymentRS": {
          "statusCode": "4",
          "statusDesc": "El número de teléfono no está registrado en Nequi"
        }
      }
    }
  }
}
```

### Respuesta con error - Monto inválido:
```json
{
  "ResponseMessage": {
    "ResponseHeader": {
      "Status": {
        "StatusCode": "2",
        "StatusDesc": "Monto inválido"
      }
    },
    "ResponseBody": {
      "any": {
        "unregisteredPaymentRS": {
          "statusCode": "2",
          "statusDesc": "El monto debe ser mayor a 1000 pesos"
        }
      }
    }
  }
}
```

---

## 🔔 Estados de Transacción

| Código | Descripción | Acción |
|--------|-------------|--------|
| 0 o 00 | Exitoso | Notificación enviada correctamente |
| 2 | Monto inválido | Verificar que el monto sea mayor a $1.000 |
| 4 | Usuario no encontrado | El número no está registrado en Nequi |
| 5 | Timeout | Reintentar después de 30 segundos |
| 10 | Transacción rechazada | Cliente rechazó el pago |
| 99 | Error general | Revisar logs y credenciales |

---

## 🧪 Ambiente de Pruebas (Sandbox)

Nequi proporciona un ambiente de pruebas:

### URL Sandbox:
```
https://sandbox.nequi.com.co
```

### Números de prueba:
```
3001111111 - Siempre aprueba
3002222222 - Siempre rechaza
3003333333 - Timeout
```

---

## 📊 Flujo Completo

```
1. Cliente elige "Pagar por Nequi"
   ↓
2. Ingresa su número de celular
   ↓
3. Sistema obtiene token OAuth
   ↓
4. Sistema envía solicitud de pago push
   ↓
5a. [EXITOSO] Cliente recibe notificación
    ↓
    Cliente aprueba en la app
    ↓
    Pago completado
    
5b. [ERROR] No se puede enviar
    ↓
    Mostrar instrucciones manuales
    ↓
    Cliente paga manualmente
```

---

## 🛡️ Mejores Prácticas

### 1. Manejo de Errores
```javascript
try {
    // Enviar push
    const response = await enviarPushNequi(datos);
    
    if (response.statusCode === '0' || response.statusCode === '00') {
        // Exitoso
        mostrarNotificacionExitosa();
    } else {
        // Error conocido
        mostrarInstruccionesManuales();
    }
} catch (error) {
    // Error de red o servidor
    console.error('Error:', error);
    mostrarInstruccionesManuales();
}
```

### 2. Validación de Teléfono
```javascript
function validarTelefonoNequi(numero) {
    // Debe ser 10 dígitos
    // Debe empezar con 3
    // Solo números
    return /^3\d{9}$/.test(numero);
}
```

### 3. Timeout y Reintentos
```javascript
// No hacer más de 1 intento
// Si falla, mostrar instrucciones manuales
// No saturar la API
```

### 4. Seguridad
- ✅ Nunca exponer credenciales en el frontend
- ✅ Usar variables de entorno
- ✅ Validar datos en el backend
- ✅ Logs de auditoría

---

## 🎯 Casos de Uso Comunes

### Caso 1: Cliente nuevo (primera compra)
```
✅ Solicitar teléfono
✅ Enviar push
✅ Si funciona: Guardar teléfono para próxima vez
✅ Si falla: Instrucciones manuales + guardar preferencia
```

### Caso 2: Cliente recurrente
```
✅ Ya tiene teléfono guardado (con permiso)
✅ Enviar push directamente
✅ Opción de cambiar número
```

### Caso 3: Push no llega
```
⚠️ Esperar 30 segundos
⚠️ Mostrar opción "No recibí notificación"
⚠️ Cambiar a instrucciones manuales
⚠️ Enviar link de WhatsApp
```

---

## 📝 Logs Importantes

### ¿Qué registrar?
```javascript
console.log('📱 Intento push Nequi', {
    telefono: '300*******', // Censurado
    monto: total,
    referencia: ref,
    timestamp: new Date().toISOString()
});

console.log('✅ Push enviado', {
    transactionId: response.transactionId,
    statusCode: response.statusCode
});

console.error('❌ Error push', {
    error: error.message,
    statusCode: response?.statusCode,
    fallback: 'instrucciones_manuales'
});
```

---

## 🔗 Enlaces Útiles

- [Documentación Nequi](https://docs.nequi.com.co/)
- [Portal Desarrolladores](https://developers.nequi.com.co/)
- [Soporte Técnico](https://soporte.nequi.com.co/)
- [Status de Servicios](https://status.nequi.com.co/)

---

## ⚡ Quick Start

1. Solicitar afiliación a Nequi Empresarial
2. Recibir credenciales
3. Configurar variables de entorno en Netlify
4. Desplegar código actualizado
5. ¡Listo! El sistema funcionará automáticamente

---

**Nota**: Sin credenciales, el sistema funciona en modo manual (instrucciones), lo cual también es una excelente experiencia de usuario.
