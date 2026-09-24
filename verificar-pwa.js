/**
 * SCRIPT DE VERIFICACIÓN E INICIALIZACIÓN
 * Ejecutar en la consola del navegador para verificar el estado de la PWA
 */

(async function verificarEstadoPWA() {
    console.log('🔍 VERIFICANDO ESTADO DE LA PWA...\n');
    
    const resultados = {
        errores: [],
        advertencias: [],
        exitos: []
    };
    
    // ============================================
    // 1. VERIFICAR SERVICE WORKER
    // ============================================
    console.log('1️⃣ Verificando Service Worker...');
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            
            if (registrations.length > 0) {
                registrations.forEach((reg, index) => {
                    console.log(`   ✅ SW ${index + 1}: ${reg.active ? 'Activo' : 'Inactivo'}`);
                    console.log(`      Scope: ${reg.scope}`);
                });
                resultados.exitos.push('Service Worker registrado correctamente');
            } else {
                resultados.advertencias.push('No hay Service Workers registrados');
                console.log('   ⚠️ No hay Service Workers registrados');
            }
        } else {
            resultados.errores.push('Service Worker no soportado en este navegador');
            console.log('   ❌ Service Worker no soportado');
        }
    } catch (error) {
        resultados.errores.push(`Error verificando SW: ${error.message}`);
        console.error('   ❌ Error:', error);
    }
    
    // ============================================
    // 2. VERIFICAR CACHE
    // ============================================
    console.log('\n2️⃣ Verificando Cache...');
    try {
        const cacheNames = await caches.keys();
        
        if (cacheNames.length > 0) {
            console.log(`   ✅ ${cacheNames.length} cache(s) encontrado(s):`);
            for (const name of cacheNames) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                console.log(`      - ${name}: ${keys.length} recursos`);
            }
            resultados.exitos.push(`${cacheNames.length} cache(s) activos`);
        } else {
            resultados.advertencias.push('No hay caches creados');
            console.log('   ⚠️ No hay caches creados aún');
        }
    } catch (error) {
        resultados.errores.push(`Error verificando cache: ${error.message}`);
        console.error('   ❌ Error:', error);
    }
    
    // ============================================
    // 3. VERIFICAR WINDOW.ALIMENTODELCIELO
    // ============================================
    console.log('\n3️⃣ Verificando API Global...');
    if (typeof window.AlimentoDelCielo !== 'undefined') {
        console.log('   ✅ window.AlimentoDelCielo está disponible');
        
        const api = window.AlimentoDelCielo;
        
        // Verificar funciones principales
        const funciones = [
            'agregarProducto',
            'removerProducto',
            'limpiarCarrito',
            'obtenerCarrito',
            'obtenerProductos',
            'formatearPrecio',
            'mostrarNotificacion'
        ];
        
        funciones.forEach(fn => {
            if (typeof api[fn] === 'function') {
                console.log(`      ✓ ${fn}`);
            } else {
                console.log(`      ✗ ${fn} (no disponible)`);
                resultados.advertencias.push(`Función ${fn} no disponible`);
            }
        });
        
        // Verificar analytics
        if (api.analytics && typeof api.analytics.track === 'function') {
            console.log('      ✓ analytics.track');
            resultados.exitos.push('Sistema de analytics configurado correctamente');
        } else {
            console.log('      ✗ analytics.track (no disponible)');
            resultados.errores.push('Sistema de analytics no está configurado correctamente');
        }
        
        resultados.exitos.push('API global disponible');
    } else {
        resultados.errores.push('window.AlimentoDelCielo no está definido');
        console.log('   ❌ window.AlimentoDelCielo no está definido');
    }
    
    // ============================================
    // 4. VERIFICAR SISTEMA DE RESEÑAS
    // ============================================
    console.log('\n4️⃣ Verificando Sistema de Reseñas...');
    if (typeof window.sistemaResenas !== 'undefined') {
        console.log('   ✅ Sistema de reseñas inicializado');
        
        // Verificar métodos
        const metodos = [
            'enviarResenaAlServidor',
            'obtenerResenasPublicas',
            'sincronizarResenasPendientes',
            'trackEvent'
        ];
        
        metodos.forEach(metodo => {
            if (typeof window.sistemaResenas[metodo] === 'function') {
                console.log(`      ✓ ${metodo}`);
            } else {
                console.log(`      ✗ ${metodo} (no disponible)`);
            }
        });
        
        resultados.exitos.push('Sistema de reseñas operativo');
    } else {
        resultados.advertencias.push('Sistema de reseñas no inicializado (puede ser normal si no estás en esa página)');
        console.log('   ⚠️ Sistema de reseñas no inicializado');
    }
    
    // ============================================
    // 5. VERIFICAR ALMACENAMIENTO LOCAL
    // ============================================
    console.log('\n5️⃣ Verificando Almacenamiento...');
    try {
        // LocalStorage
        const lsSize = Object.keys(localStorage).length;
        console.log(`   ✅ LocalStorage: ${lsSize} elementos`);
        
        // Verificar carrito
        const carrito = localStorage.getItem('carritoAlimentoDelCielo');
        if (carrito) {
            const items = JSON.parse(carrito);
            console.log(`      - Carrito: ${items.length} producto(s)`);
        } else {
            console.log('      - Carrito: vacío');
        }
        
        resultados.exitos.push('Almacenamiento local funcionando');
    } catch (error) {
        resultados.errores.push(`Error con almacenamiento: ${error.message}`);
        console.error('   ❌ Error:', error);
    }
    
    // ============================================
    // 6. VERIFICAR CONEXIÓN
    // ============================================
    console.log('\n6️⃣ Verificando Conectividad...');
    if (navigator.onLine) {
        console.log('   ✅ Conexión a internet: ACTIVA');
        resultados.exitos.push('Conexión a internet activa');
    } else {
        console.log('   ⚠️ Conexión a internet: OFFLINE');
        resultados.advertencias.push('Aplicación en modo offline');
    }
    
    // ============================================
    // 7. VERIFICAR MANIFEST
    // ============================================
    console.log('\n7️⃣ Verificando Manifest...');
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
        console.log(`   ✅ Manifest encontrado: ${manifestLink.href}`);
        resultados.exitos.push('Manifest configurado');
    } else {
        resultados.errores.push('Manifest no encontrado');
        console.log('   ❌ Manifest no encontrado');
    }
    
    // ============================================
    // 8. VERIFICAR ERRORES EN CONSOLA
    // ============================================
    console.log('\n8️⃣ Revisando errores conocidos...');
    
    const erroresConocidos = [
        'chrome-extension',
        'grammarly',
        'analytics.track is not a function',
        'Failed to execute'
    ];
    
    console.log('   ℹ️ Si ves errores relacionados con:');
    erroresConocidos.forEach(error => {
        console.log(`      - "${error}" → Ya están manejados, puedes ignorarlos`);
    });
    
    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE VERIFICACIÓN');
    console.log('='.repeat(50));
    
    if (resultados.exitos.length > 0) {
        console.log(`\n✅ ÉXITOS (${resultados.exitos.length}):`);
        resultados.exitos.forEach(exito => console.log(`   ✓ ${exito}`));
    }
    
    if (resultados.advertencias.length > 0) {
        console.log(`\n⚠️ ADVERTENCIAS (${resultados.advertencias.length}):`);
        resultados.advertencias.forEach(adv => console.log(`   • ${adv}`));
    }
    
    if (resultados.errores.length > 0) {
        console.log(`\n❌ ERRORES (${resultados.errores.length}):`);
        resultados.errores.forEach(error => console.log(`   ✗ ${error}`));
    }
    
    // Calcular puntuación
    const total = resultados.exitos.length + resultados.advertencias.length + resultados.errores.length;
    const puntuacion = Math.round((resultados.exitos.length / total) * 100);
    
    console.log(`\n🎯 PUNTUACIÓN: ${puntuacion}%`);
    
    if (puntuacion >= 80) {
        console.log('🎉 ¡Excelente! La PWA está funcionando correctamente.');
    } else if (puntuacion >= 60) {
        console.log('👍 Bien. Hay algunos aspectos que revisar.');
    } else {
        console.log('⚠️ Atención. Se requieren correcciones.');
    }
    
    console.log('\n💡 ACCIONES SUGERIDAS:');
    if (resultados.errores.length > 0) {
        console.log('   1. Revisar errores en consola');
        console.log('   2. Ejecutar limpieza: window.location.href = "/limpiar-cache.html"');
        console.log('   3. Recargar la página: location.reload()');
    } else if (resultados.advertencias.length > 0) {
        console.log('   - Las advertencias son normales en ciertas situaciones');
        console.log('   - Todo parece estar funcionando correctamente');
    } else {
        console.log('   ✨ ¡No se requieren acciones! Todo está perfecto.');
    }
    
    console.log('\n' + '='.repeat(50));
    
    return {
        puntuacion,
        ...resultados
    };
})();
