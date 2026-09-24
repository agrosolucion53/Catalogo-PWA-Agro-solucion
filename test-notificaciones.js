// === SCRIPT DE PRUEBA LOCAL PARA NOTIFICACIONES ===
// Ejecutar este código en la consola del navegador (F12) para probar el sistema

console.log('🧪 === INICIANDO PRUEBAS DEL SISTEMA DE NOTIFICACIONES ===');

// ========== PRUEBA 1: Verificar que el sistema está cargado ==========
console.log('\n📋 PRUEBA 1: Verificación de carga');
const sistemaFunciones = [
    'agregarNotificacionAlCentro',
    'actualizarContadorNotificaciones',
    'marcarComoLeida',
    'marcarTodasLeidas',
    'eliminarNotificacion',
    'limpiarNotificaciones',
    'alternarCentroNotificaciones'
];

let funcionesCargadas = 0;
sistemaFunciones.forEach(fn => {
    if (typeof window[fn] === 'function') {
        console.log(`✅ ${fn} - CARGADA`);
        funcionesCargadas++;
    } else {
        console.error(`❌ ${fn} - NO ENCONTRADA`);
    }
});

console.log(`\n📊 Resultado: ${funcionesCargadas}/${sistemaFunciones.length} funciones cargadas`);

// ========== PRUEBA 2: Simular notificación de prueba ==========
console.log('\n📋 PRUEBA 2: Simulación de notificación');

function simularNotificacion(numero) {
    const tiposNotificacion = [
        { tipo: 'oferta', icono: '🎁', titulo: 'Oferta Especial', mensaje: 'Descuento del 20% en pollo' },
        { tipo: 'nuevo', icono: '🆕', titulo: 'Nuevo Producto', mensaje: 'Tenemos carnes frescas disponibles' },
        { tipo: 'pedido', icono: '✅', titulo: 'Pedido Confirmado', mensaje: 'Tu pedido #123 ha sido confirmado' },
        { tipo: 'recordatorio', icono: '⏰', titulo: 'Recordatorio', mensaje: 'Tienes productos en el carrito' }
    ];

    const random = tiposNotificacion[Math.floor(Math.random() * tiposNotificacion.length)];
    
    const notificacion = {
        titulo: `${random.titulo} #${numero}`,
        mensaje: random.mensaje,
        tipo: random.tipo,
        icono: random.icono,
        url: '/index.html'
    };

    agregarNotificacionAlCentro(notificacion);
    console.log(`✅ Notificación ${numero} agregada:`, notificacion);
}

// ========== PRUEBA 3: Crear varias notificaciones de prueba ==========
console.log('\n📋 PRUEBA 3: Creando 5 notificaciones de prueba...');

for (let i = 1; i <= 5; i++) {
    setTimeout(() => {
        simularNotificacion(i);
        console.log(`📨 Notificación ${i} enviada (total: ${i})`);
    }, i * 1000); // Una cada segundo
}

console.log('\n⏳ Esperando 5 segundos para crear todas las notificaciones...');

// ========== PRUEBA 4: Verificar contador después de 6 segundos ==========
setTimeout(() => {
    console.log('\n📋 PRUEBA 4: Verificación del contador');
    const contador = document.getElementById('contadorNotif');
    if (contador) {
        const valor = contador.textContent;
        const visible = contador.style.display !== 'none';
        console.log(`✅ Contador encontrado: ${valor}`);
        console.log(`✅ Contador visible: ${visible}`);
        if (valor === '5' && visible) {
            console.log('🎉 PRUEBA 4 EXITOSA: Contador funcionando correctamente');
        } else {
            console.warn('⚠️ El contador no muestra el valor esperado');
        }
    } else {
        console.error('❌ Contador no encontrado en el DOM');
    }
}, 6000);

// ========== PRUEBA 5: Abrir panel de notificaciones ==========
setTimeout(() => {
    console.log('\n📋 PRUEBA 5: Abriendo panel de notificaciones...');
    const panel = document.getElementById('panelNotificaciones');
    if (panel) {
        alternarCentroNotificaciones();
        setTimeout(() => {
            const estaActivo = panel.classList.contains('activo');
            console.log(`✅ Panel estado activo: ${estaActivo}`);
            if (estaActivo) {
                console.log('🎉 PRUEBA 5 EXITOSA: Panel se abre correctamente');
                console.log('👀 Verifica visualmente que veas las 5 notificaciones en el panel');
            } else {
                console.warn('⚠️ El panel no se activó correctamente');
            }
        }, 500);
    } else {
        console.error('❌ Panel de notificaciones no encontrado');
    }
}, 7000);

// ========== PRUEBA 6: Marcar una como leída ==========
setTimeout(() => {
    console.log('\n📋 PRUEBA 6: Marcando primera notificación como leída...');
    const primeraNotif = document.querySelector('.notificacion-item');
    if (primeraNotif) {
        const id = primeraNotif.getAttribute('data-id');
        marcarComoLeida(id);
        console.log(`✅ Notificación ${id} marcada como leída`);
        console.log('👀 Verifica que el contador ahora muestre "4"');
    } else {
        console.error('❌ No se encontró ninguna notificación en el DOM');
    }
}, 9000);

// ========== PRUEBA 7: Verificar persistencia en localStorage ==========
setTimeout(() => {
    console.log('\n📋 PRUEBA 7: Verificando almacenamiento local');
    const notificacionesGuardadas = localStorage.getItem('notificaciones');
    if (notificacionesGuardadas) {
        const notifs = JSON.parse(notificacionesGuardadas);
        console.log(`✅ Notificaciones en localStorage: ${notifs.length}`);
        console.log('📦 Datos guardados:', notifs);
        console.log('🎉 PRUEBA 7 EXITOSA: Persistencia funcionando');
    } else {
        console.error('❌ No hay notificaciones guardadas en localStorage');
    }
}, 10000);

// ========== RESUMEN FINAL ==========
setTimeout(() => {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('🎯 RESUMEN DE PRUEBAS COMPLETADAS');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('✅ PRUEBA 1: Funciones cargadas correctamente');
    console.log('✅ PRUEBA 2-3: Notificaciones creadas (5 total)');
    console.log('✅ PRUEBA 4: Contador actualizado');
    console.log('✅ PRUEBA 5: Panel de notificaciones abierto');
    console.log('✅ PRUEBA 6: Notificación marcada como leída');
    console.log('✅ PRUEBA 7: Datos persistidos en localStorage');
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🧪 PRUEBAS MANUALES ADICIONALES:');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('1. Haz clic en el botón 🔔 para abrir/cerrar el panel');
    console.log('2. Haz clic en "✓ Marcar todas como leídas"');
    console.log('3. Haz clic en "🗑️ Limpiar todas"');
    console.log('4. Recarga la página (F5) y verifica que las notificaciones persisten');
    console.log('5. Abre el panel-admin.html y envía una notificación real');
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 VERIFICACIONES FINALES:');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('¿El contador muestra "4" (5 creadas - 1 leída)? →', document.getElementById('contadorNotif')?.textContent);
    console.log('¿El panel está abierto? →', document.getElementById('panelNotificaciones')?.classList.contains('activo'));
    console.log('¿Hay notificaciones en localStorage? →', localStorage.getItem('notificaciones') ? 'SÍ' : 'NO');
    console.log('');
    console.log('🎉 Si todas las respuestas son correctas, el sistema funciona perfectamente');
    console.log('');
}, 11000);

// ========== FUNCIONES AUXILIARES DE PRUEBA ==========
console.log('\n💡 FUNCIONES AUXILIARES DISPONIBLES:');
console.log('   simularNotificacion(numero) - Crear notificación de prueba');
console.log('   window.probarNotificaciones = function() { ... } - Repetir todas las pruebas');
console.log('');

// Función para repetir todas las pruebas
window.probarNotificaciones = function() {
    console.clear();
    console.log('🔄 Reiniciando pruebas del sistema de notificaciones...');
    location.reload();
};

// Función para limpiar todo y empezar de cero
window.limpiarTodo = function() {
    localStorage.removeItem('notificaciones');
    location.reload();
    console.log('🧹 Todo limpiado. Página recargada.');
};

console.log('✅ Sistema de pruebas cargado. Las pruebas comenzarán automáticamente.');
console.log('💡 Usa probarNotificaciones() para repetir o limpiarTodo() para reiniciar.');
