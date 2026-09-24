# 🔧 Configuración de Wompi para Pagos

## Error: "signature: La firma es inválida"

Este error ocurre cuando la firma de integridad no coincide con los parámetros de la transacción. La causa más común es una configuración incorrecta de las variables de entorno.

## ✅ Solución: Configurar Variables de Entorno en Netlify

### 1. Obtener las credenciales de Wompi

Inicia sesión en tu cuenta de Wompi y obtén:

#### Para Modo Pruebas (Testing):
- **Public Key**: `pub_test_xxxxxxxxxx`
- **Private Key**: `prv_test_xxxxxxxxxx`
- **Integrity Secret**: `test_integrity_xxxxxxxxxx`

#### Para Modo Producción:
- **Public Key**: `pub_prod_xxxxxxxxxx`
- **Private Key**: `prv_prod_xxxxxxxxxx`
- **Integrity Secret**: `prod_integrity_xxxxxxxxxx`

### 2. Configurar en Netlify

1. Ve a tu sitio en Netlify Dashboard
2. Click en **Site settings**
3. Click en **Environment variables** (en el menú izquierdo)
4. Click en **Add a variable**
5. Agrega las siguientes variables:

```
Variable: WOMPI_PUBLIC_KEY
Value: pub_test_XXXXXXXXXX (o pub_prod_XXXXXXXXXX)

Variable: WOMPI_PRIVATE_KEY
Value: prv_test_XXXXXXXXXX (o prv_prod_XXXXXXXXXX)

Variable: WOMPI_INTEGRITY_SECRET
Value: test_integrity_XXXXXXXXXX (o prod_integrity_XXXXXXXXXX)
```

### 3. Verificar las Variables

**IMPORTANTE**: 
- ✅ `WOMPI_PUBLIC_KEY` debe comenzar con `pub_test_` o `pub_prod_`
- ✅ `WOMPI_PRIVATE_KEY` debe comenzar con `prv_test_` o `prv_prod_`
- ✅ `WOMPI_INTEGRITY_SECRET` debe ser `test_integrity_...` o `prod_integrity_...`
- ✅ Todas las claves deben ser del mismo entorno (test o prod)

### 4. Redesplegar el sitio

Después de configurar las variables de entorno:
1. Ve a **Deploys** en Netlify
2. Click en **Trigger deploy** > **Clear cache and deploy site**
3. Espera a que termine el despliegue

## 🔍 Cómo Funciona la Firma de Integridad

Wompi requiere una firma SHA256 para validar la integridad de la transacción:

```
firma = SHA256(referencia + monto_en_centavos + moneda + integrity_secret)
```

**Ejemplo:**
```
Referencia: ADC-1702507200000-abc123
Monto: 16990 (en pesos = 1699000 centavos)
Moneda: COP
Secret: test_integrity_secret123

String a firmar: "ADC-1702507200000-abc1231699000COPtest_integrity_secret123"
Firma SHA256: "a1b2c3d4e5f6..."
```

## 🐛 Debugging

Si sigues teniendo problemas:

1. **Revisa los logs de Netlify Functions**:
   - Ve a Functions > crear-transaccion-wompi
   - Revisa los logs en tiempo real

2. **Verifica que el formato de la firma sea correcto**:
   - Los logs mostrarán el string que se está firmando
   - Compara con la documentación de Wompi

3. **Asegúrate de usar las credenciales correctas**:
   - Test vs Producción
   - Verifica que no haya espacios extra
   - Verifica que no falte ningún carácter

## 📚 Documentación Oficial

- [Wompi - Checkout Widget](https://docs.wompi.co/docs/es/checkout-widget)
- [Wompi - Firma de Integridad](https://docs.wompi.co/docs/es/integridad-checkout)

## ⚠️ Notas Importantes

1. **Nunca** expongas tu `WOMPI_PRIVATE_KEY` o `WOMPI_INTEGRITY_SECRET` en el código frontend
2. Las claves deben configurarse **solo** como variables de entorno en Netlify
3. Para pagos con Nequi, **WOMPI_INTEGRITY_SECRET es obligatorio**
4. Usa modo `test` durante desarrollo y `prod` en producción

## ✅ Checklist Final

- [ ] Variables configuradas en Netlify (no en el código)
- [ ] Las 3 claves son del mismo entorno (test o prod)
- [ ] `WOMPI_PUBLIC_KEY` comienza con `pub_`
- [ ] `WOMPI_PRIVATE_KEY` comienza con `prv_`
- [ ] `WOMPI_INTEGRITY_SECRET` contiene `integrity`
- [ ] Sitio redesplegado después de agregar variables
- [ ] Probado con una transacción de prueba
