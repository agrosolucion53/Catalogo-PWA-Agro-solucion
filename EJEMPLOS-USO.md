# 🧪 Ejemplos de Uso y Testing

## 📝 Cómo Usar las Funciones Corregidas

### 1. Sistema de Reseñas con Fechas Seguras

#### Ejemplo de Uso en el Frontend

```javascript
// El sistema ahora maneja automáticamente cualquier formato de fecha
// No necesitas preocuparte por validaciones adicionales

// Ejemplo 1: Cargar reseñas
const sistemaResenas = new SistemaResenas();
// Las fechas se convierten automáticamente de forma segura

// Ejemplo 2: Renderizar reseña individual
// Las funciones convertirFechaSegura, formatearFecha y formatearFechaISO
// se encargan de todo internamente
```

#### Casos que Ahora Funcionan Correctamente

```javascript
// ✅ Caso 1: Firestore Timestamp normal
{
  createdAt: {
    seconds: 1700000000,
    nanoseconds: 123456789
  }
}
// Resultado: "26 nov 2023" (o la fecha correspondiente)

// ✅ Caso 2: Timestamp null
{
  createdAt: null
}
// Resultado: Fecha actual ("26 nov 2025")

// ✅ Caso 3: Timestamp undefined
{
  // createdAt no existe
}
// Resultado: Fecha actual

// ✅ Caso 4: Objeto Date
{
  createdAt: new Date('2025-11-26')
}
// Resultado: "26 nov 2025"

// ✅ Caso 5: Timestamp numérico
{
  createdAt: 1700000000000
}
// Resultado: "14 nov 2023"

// ✅ Caso 6: String ISO
{
  createdAt: "2025-11-26T10:00:00Z"
}
// Resultado: "26 nov 2025"

// ✅ Caso 7: Valor inválido (antes causaba RangeError)
{
  createdAt: "fecha-invalida"
}
// Resultado: Fecha actual + warning en consola
```

---

### 2. Integración con Wompi

#### Crear una Transacción

```javascript
// Frontend (script.js)
async function procesarPagoWompi(datosCarrito) {
    try {
        const response = await fetch('/.netlify/functions/crear-transaccion-wompi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                monto: 14990,
                moneda: 'COP',
                referencia: 'ORD-' + Date.now(),
                email: 'cliente@ejemplo.com',
                nombre: 'Juan Pérez',
                telefono: '3001234567',
                productos: [
                    { id: 1, nombre: 'Producto 1', cantidad: 2 }
                ]
            })
        });

        const resultado = await response.json();

        if (resultado.exito) {
            // Redirigir al widget de Wompi
            window.location.href = resultado.checkout_url;
        } else {
            // Mostrar error descriptivo
            console.error('Error:', resultado.error);
            alert(resultado.detalles?.join('\n') || resultado.error);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Error conectando con el servidor. Intenta de nuevo.');
    }
}
```

#### Respuestas Esperadas

**✅ Éxito - Variables Configuradas Correctamente:**
```json
{
  "exito": true,
  "referencia": "ORD-1700000000000",
  "checkout_url": "https://checkout.wompi.co/p/?public-key=pub_test_xxx&...",
  "transaccion": {
    "reference": "ORD-1700000000000",
    "amount_in_cents": 1499000,
    "currency": "COP",
    "customer_email": "cliente@ejemplo.com",
    "signature": "a1b2c3d4e5f6...",
    "timestamp": "2025-11-26T10:00:00.000Z"
  }
}
```

**❌ Error - Variables No Configuradas:**
```json
{
  "error": "Servidor no configurado correctamente",
  "detalles": [
    "WOMPI_INTEGRITY_SECRET no configurada - Requerida para Nequi y otros medios de pago"
  ],
  "ayuda": "Configure las variables de entorno en Netlify: Site Settings > Environment Variables"
}
```

**❌ Error - Datos Inválidos:**
```json
{
  "error": "Datos inválidos",
  "detalles": [
    "monto debe ser un número positivo",
    "email es requerido y debe ser válido"
  ]
}
```

---

#### Verificar Estado de Transacción

```javascript
// Frontend
async function verificarPago(transactionId) {
    try {
        const response = await fetch(
            `/.netlify/functions/verificar-pago-wompi?id=${transactionId}`
        );

        const resultado = await response.json();

        if (resultado.exito) {
            const estado = resultado.data.status;
            
            switch (estado) {
                case 'APPROVED':
                    console.log('✅ Pago aprobado');
                    // Mostrar mensaje de éxito
                    break;
                case 'DECLINED':
                    console.log('❌ Pago rechazado');
                    // Mostrar mensaje de rechazo
                    break;
                case 'PENDING':
                    console.log('⏳ Pago pendiente');
                    // Mostrar estado pendiente
                    break;
                case 'VOIDED':
                    console.log('🚫 Pago anulado');
                    break;
                default:
                    console.log('❓ Estado desconocido:', estado);
            }
            
            return resultado.data;
        } else {
            console.error('Error:', resultado.error);
            alert(resultado.mensaje || resultado.error);
        }
    } catch (error) {
        console.error('Error de red:', error);
        alert('Error verificando el pago. Intenta de nuevo.');
    }
}

// Uso en confirmacion-pago.html
const urlParams = new URLSearchParams(window.location.search);
const transactionId = urlParams.get('id');

if (transactionId) {
    verificarPago(transactionId);
}
```

**✅ Respuesta Exitosa:**
```json
{
  "exito": true,
  "data": {
    "id": "12345-67890-ABCDE",
    "reference": "ORD-1700000000000",
    "status": "APPROVED",
    "amount_in_cents": 1499000,
    "currency": "COP",
    "customer_email": "cliente@ejemplo.com",
    "created_at": "2025-11-26T10:00:00.000Z"
  },
  "mensaje": "Transacción consultada exitosamente",
  "timestamp": "2025-11-26T10:05:00.000Z"
}
```

**❌ Error - ID Inválido:**
```json
{
  "error": "ID de transacción inválido",
  "mensaje": "Debes proporcionar el parámetro ?id=TRANSACTION_ID con un ID válido"
}
```

**❌ Error - Transacción No Encontrada:**
```json
{
  "error": "Transacción no encontrada",
  "id": "ID-INEXISTENTE",
  "mensaje": "La transacción solicitada no existe o no está disponible"
}
```

---

## 🧪 Script de Testing

### Test Completo de Fechas

```javascript
// test-fechas-seguras.js
// Copiar en consola del navegador para probar

console.log('🧪 Iniciando tests de conversión de fechas...\n');

const sistemaResenas = new SistemaResenas();

// Test 1: Firestore Timestamp válido
console.group('Test 1: Firestore Timestamp válido');
const test1 = sistemaResenas.convertirFechaSegura({
    seconds: 1700000000,
    nanoseconds: 0
});
console.log('Resultado:', test1);
console.log('Válido:', !isNaN(test1.getTime()));
console.groupEnd();

// Test 2: Null
console.group('Test 2: Fecha null');
const test2 = sistemaResenas.convertirFechaSegura(null);
console.log('Resultado:', test2);
console.log('Válido:', !isNaN(test2.getTime()));
console.groupEnd();

// Test 3: Undefined
console.group('Test 3: Fecha undefined');
const test3 = sistemaResenas.convertirFechaSegura(undefined);
console.log('Resultado:', test3);
console.log('Válido:', !isNaN(test3.getTime()));
console.groupEnd();

// Test 4: Objeto Date
console.group('Test 4: Objeto Date');
const test4 = sistemaResenas.convertirFechaSegura(new Date('2025-11-26'));
console.log('Resultado:', test4);
console.log('Válido:', !isNaN(test4.getTime()));
console.groupEnd();

// Test 5: Timestamp numérico
console.group('Test 5: Timestamp numérico');
const test5 = sistemaResenas.convertirFechaSegura(1700000000000);
console.log('Resultado:', test5);
console.log('Válido:', !isNaN(test5.getTime()));
console.groupEnd();

// Test 6: String ISO
console.group('Test 6: String ISO');
const test6 = sistemaResenas.convertirFechaSegura("2025-11-26T10:00:00Z");
console.log('Resultado:', test6);
console.log('Válido:', !isNaN(test6.getTime()));
console.groupEnd();

// Test 7: Valor inválido
console.group('Test 7: Valor inválido');
const test7 = sistemaResenas.convertirFechaSegura("fecha-invalida");
console.log('Resultado:', test7);
console.log('Válido:', !isNaN(test7.getTime()));
console.log('Nota: Debería mostrar warning en consola');
console.groupEnd();

// Test 8: Formato localizado
console.group('Test 8: Formato localizado');
const test8 = sistemaResenas.formatearFecha({ seconds: 1700000000 });
console.log('Resultado:', test8);
console.log('Formato esperado: "DD MMM YYYY"');
console.groupEnd();

// Test 9: Formato ISO
console.group('Test 9: Formato ISO');
const test9 = sistemaResenas.formatearFechaISO({ seconds: 1700000000 });
console.log('Resultado:', test9);
console.log('Formato esperado: ISO 8601');
console.groupEnd();

console.log('\n✅ Tests completados');
```

### Test de Integración Wompi (Backend)

```javascript
// test-wompi-integration.js
// Ejecutar con Node.js o en Netlify Dev

// Test 1: Crear transacción con datos válidos
async function testCrearTransaccion() {
    console.log('🧪 Test: Crear transacción...\n');
    
    const response = await fetch('http://localhost:8888/.netlify/functions/crear-transaccion-wompi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            monto: 14990,
            moneda: 'COP',
            referencia: 'TEST-' + Date.now(),
            email: 'test@ejemplo.com',
            nombre: 'Usuario Prueba',
            telefono: '3001234567'
        })
    });
    
    const resultado = await response.json();
    console.log('Status:', response.status);
    console.log('Resultado:', resultado);
    
    if (resultado.exito) {
        console.log('✅ Test pasado');
        return resultado.transaccion.reference;
    } else {
        console.log('❌ Test fallido:', resultado.error);
        return null;
    }
}

// Test 2: Verificar transacción
async function testVerificarTransaccion(transactionId) {
    console.log('\n🧪 Test: Verificar transacción...\n');
    
    const response = await fetch(
        `http://localhost:8888/.netlify/functions/verificar-pago-wompi?id=${transactionId}`
    );
    
    const resultado = await response.json();
    console.log('Status:', response.status);
    console.log('Resultado:', resultado);
    
    if (resultado.exito) {
        console.log('✅ Test pasado');
    } else {
        console.log('❌ Test fallido:', resultado.error);
    }
}

// Ejecutar tests
(async () => {
    const transactionId = await testCrearTransaccion();
    
    if (transactionId) {
        // Esperar un momento antes de verificar
        setTimeout(() => {
            testVerificarTransaccion(transactionId);
        }, 2000);
    }
})();
```

---

## 📋 Checklist de Verificación

### Antes de Deploy

- [ ] Variables de entorno configuradas en Netlify
  - [ ] WOMPI_PUBLIC_KEY
  - [ ] WOMPI_PRIVATE_KEY
  - [ ] WOMPI_INTEGRITY_SECRET
  - [ ] URL
  - [ ] NODE_ENV

- [ ] Código probado localmente
  - [ ] Sistema de reseñas carga sin errores
  - [ ] Fechas se muestran correctamente
  - [ ] No hay `RangeError` en consola

- [ ] Funciones serverless probadas
  - [ ] crear-transaccion-wompi responde correctamente
  - [ ] verificar-pago-wompi responde correctamente
  - [ ] Logs muestran información útil

### Después de Deploy

- [ ] Verificar logs en Netlify Functions
- [ ] Probar crear transacción desde frontend
- [ ] Verificar que el widget de Wompi abre
- [ ] Probar flujo completo de pago
- [ ] Verificar que las reseñas se muestran correctamente

---

## 🐛 Debugging

### Ver Logs en Tiempo Real

```bash
# Desarrollo local con Netlify CLI
netlify dev

# Ver logs de funciones
netlify functions:log crear-transaccion-wompi
netlify functions:log verificar-pago-wompi
```

### Logs Esperados

**✅ Logs Correctos - Crear Transacción:**
```
🔐 Firma generada para: { referencia: 'ORD-123', monto: 1499000, moneda: 'COP' }
✅ Transacción creada exitosamente: { referencia: 'ORD-123', monto: 1499000, email: 'test@ejemplo.com' }
```

**✅ Logs Correctos - Verificar Pago:**
```
🔍 Verificando transacción: 12345-67890-ABCDE
📥 Respuesta de Wompi: { id: '12345-67890-ABCDE', status: 'APPROVED', httpStatus: 200 }
✅ Transacción consultada exitosamente: { id: '12345-67890-ABCDE', status: 'APPROVED', reference: 'ORD-123' }
```

**❌ Logs de Error - Variables No Configuradas:**
```
❌ Errores de configuración: [ 'WOMPI_INTEGRITY_SECRET no configurada - Requerida para Nequi y otros medios de pago' ]
```

---

## 💡 Tips de Desarrollo

### 1. Usar Credenciales de Prueba

Siempre usa las credenciales de prueba (`pub_test_`, `prv_test_`) durante el desarrollo:

```bash
# Variables de entorno para desarrollo
WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxx
WOMPI_INTEGRITY_SECRET=test_integrity_xxxxxxxxxxxx
```

### 2. Tarjetas de Prueba Wompi

Para probar pagos en modo test, usa estas tarjetas:

| Tarjeta | Número | CVV | Resultado |
|---------|--------|-----|-----------|
| Visa aprobada | 4242424242424242 | 123 | APPROVED |
| Mastercard aprobada | 5555555555554444 | 123 | APPROVED |
| Visa declinada | 4000000000000002 | 123 | DECLINED |

### 3. Monitoreo de Fechas

Si quieres ver todas las conversiones de fechas en consola:

```javascript
// Agregar temporalmente en convertirFechaSegura()
console.log('🔍 Convirtiendo fecha:', fechaFirebase, '→', fechaResultado);
```

---

**📚 Documentación Completa:**
- Guía de configuración: `CONFIGURACION-NETLIFY-WOMPI.md`
- Resumen técnico: `RESUMEN-CORRECCIONES.md`
- Ejemplos de uso: Este archivo

**🎯 Estado:** Listo para testing y producción  
**Última actualización:** 26 de noviembre de 2025
