// === SISTEMA DE NOTIFICACIONES EN TIEMPO REAL ===
// Gestiona el centro de notificaciones, badge counter y notificaciones foreground

// ========== ESTADO GLOBAL DE NOTIFICACIONES ==========
let notificaciones = [];
let notificacionesNoLeidas = 0;

// Exportar funciones globales INMEDIATAMENTE (antes de DOMContentLoaded)
// Esto asegura que firebase-config.js pueda usarlas
window.agregarNotificacionAlCentro = agregarNotificacionAlCentro;
window.actualizarContadorNotificaciones = actualizarContadorNotificaciones;
window.marcarComoLeida = marcarComoLeida;
window.marcarTodasLeidas = marcarTodasLeidas;
window.eliminarNotificacion = eliminarNotificacion;
window.limpiarNotificaciones = limpiarNotificaciones;
window.abrirNotificacion = abrirNotificacion;
window.alternarCentroNotificaciones = alternarCentroNotificaciones;

console.log('✅ Funciones de notificaciones exportadas globalmente');

// Cargar notificaciones guardadas al iniciar
function cargarNotificacionesGuardadas() {
    try {
        const guardadas = localStorage.getItem('notificaciones');
        if (guardadas) {
            notificaciones = JSON.parse(guardadas);
            // Contar no leídas
            notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
            actualizarContadorNotificaciones();
            renderizarListaNotificaciones();
        }
    } catch (error) {
        console.error('❌ Error cargando notificaciones:', error);
        notificaciones = [];
    }
}

// Guardar notificaciones en localStorage
function guardarNotificaciones() {
    try {
        localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
    } catch (error) {
        console.error('❌ Error guardando notificaciones:', error);
    }
}

// ========== AGREGAR NOTIFICACIÓN AL CENTRO ==========
function agregarNotificacionAlCentro(notificacion) {
    console.log('📥 Agregando notificación al centro:', notificacion);

    const nuevaNotif = {
        id: Date.now() + Math.random(),
        titulo: notificacion.titulo || notificacion.title || 'Notificación',
        mensaje: notificacion.mensaje || notificacion.body || '',
        tipo: notificacion.tipo || 'general',
        fecha: new Date().toISOString(),
        leida: false,
        icono: notificacion.icono || notificacion.icon || '🔔',
        url: notificacion.url || null,
        data: notificacion.data || {}
    };

    // Agregar al inicio del array
    notificaciones.unshift(nuevaNotif);

    // Limitar a las últimas 50 notificaciones
    if (notificaciones.length > 50) {
        notificaciones = notificaciones.slice(0, 50);
    }

    // Incrementar contador de no leídas
    notificacionesNoLeidas++;

    // Actualizar UI
    actualizarContadorNotificaciones();
    renderizarListaNotificaciones();
    guardarNotificaciones();

    // Mostrar badge animado
    animarBadgeNotificacion();

    console.log(`✅ Notificación agregada. Total: ${notificaciones.length}, No leídas: ${notificacionesNoLeidas}`);
}

// ========== ACTUALIZAR CONTADOR DE NOTIFICACIONES ==========
function actualizarContadorNotificaciones() {
    const contador = document.getElementById('contadorNotif');
    if (contador) {
        if (notificacionesNoLeidas > 0) {
            contador.textContent = notificacionesNoLeidas > 99 ? '99+' : notificacionesNoLeidas;
            contador.style.display = 'flex';
        } else {
            contador.style.display = 'none';
        }
    }
}

// ========== ANIMAR BADGE AL RECIBIR NOTIFICACIÓN ==========
function animarBadgeNotificacion() {
    const btnNotif = document.getElementById('btnCentroNotif');
    if (btnNotif) {
        btnNotif.classList.add('notif-pulse');
        setTimeout(() => {
            btnNotif.classList.remove('notif-pulse');
        }, 1000);
    }
}

// ========== RENDERIZAR LISTA DE NOTIFICACIONES ==========
function renderizarListaNotificaciones() {
    const listaNotif = document.getElementById('listaNotificaciones');
    const notifVacias = document.getElementById('notificacionesVacias');
    const btnMarcarLeidas = document.querySelector('.btn-marcar-leidas');
    const btnLimpiar = document.querySelector('.btn-limpiar-notificaciones');

    if (!listaNotif || !notifVacias) return;

    if (notificaciones.length === 0) {
        // No hay notificaciones
        listaNotif.style.display = 'none';
        notifVacias.style.display = 'flex';
        if (btnMarcarLeidas) btnMarcarLeidas.style.display = 'none';
        if (btnLimpiar) btnLimpiar.style.display = 'none';
    } else {
        // Hay notificaciones
        listaNotif.style.display = 'block';
        notifVacias.style.display = 'none';
        if (btnMarcarLeidas) btnMarcarLeidas.style.display = notificacionesNoLeidas > 0 ? 'block' : 'none';
        if (btnLimpiar) btnLimpiar.style.display = 'block';

        // Renderizar cada notificación
        listaNotif.innerHTML = notificaciones.map(notif => `
            <div class="notificacion-item ${notif.leida ? 'leida' : 'no-leida'}" data-id="${notif.id}">
                <div class="notif-icono">${notif.icono}</div>
                <div class="notif-contenido">
                    <div class="notif-header">
                        <h4>${notif.titulo}</h4>
                        <span class="notif-fecha">${formatearFechaNotificacion(notif.fecha)}</span>
                    </div>
                    <p class="notif-mensaje">${notif.mensaje}</p>
                    ${notif.url ? `<button class="btn-ver-notif" onclick="abrirNotificacion('${notif.id}', '${notif.url}')">Ver más →</button>` : ''}
                </div>
                <div class="notif-acciones">
                    ${!notif.leida ? `<button class="btn-marcar-leida" onclick="marcarComoLeida('${notif.id}')" title="Marcar como leída">✓</button>` : ''}
                    <button class="btn-eliminar-notif" onclick="eliminarNotificacion('${notif.id}')" title="Eliminar">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

// ========== FORMATEAR FECHA DE NOTIFICACIÓN ==========
function formatearFechaNotificacion(fechaISO) {
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diferencia = ahora - fecha;

    // Menos de 1 minuto
    if (diferencia < 60000) {
        return 'Ahora mismo';
    }

    // Menos de 1 hora
    if (diferencia < 3600000) {
        const minutos = Math.floor(diferencia / 60000);
        return `Hace ${minutos} min`;
    }

    // Menos de 24 horas
    if (diferencia < 86400000) {
        const horas = Math.floor(diferencia / 3600000);
        return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    }

    // Más de 24 horas
    const dias = Math.floor(diferencia / 86400000);
    if (dias < 7) {
        return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    }

    // Formato completo
    return fecha.toLocaleDateString('es-CO', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ========== MARCAR NOTIFICACIÓN COMO LEÍDA ==========
function marcarComoLeida(id) {
    const notif = notificaciones.find(n => n.id == id);
    if (notif && !notif.leida) {
        notif.leida = true;
        notificacionesNoLeidas--;
        actualizarContadorNotificaciones();
        renderizarListaNotificaciones();
        guardarNotificaciones();
    }
}

// ========== MARCAR TODAS COMO LEÍDAS ==========
function marcarTodasLeidas() {
    notificaciones.forEach(n => n.leida = true);
    notificacionesNoLeidas = 0;
    actualizarContadorNotificaciones();
    renderizarListaNotificaciones();
    guardarNotificaciones();
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion('✅ Todas las notificaciones marcadas como leídas', 'exito');
    }
}

// ========== ELIMINAR NOTIFICACIÓN ==========
function eliminarNotificacion(id) {
    const index = notificaciones.findIndex(n => n.id == id);
    if (index !== -1) {
        const notif = notificaciones[index];
        if (!notif.leida) {
            notificacionesNoLeidas--;
        }
        notificaciones.splice(index, 1);
        actualizarContadorNotificaciones();
        renderizarListaNotificaciones();
        guardarNotificaciones();
    }
}

// ========== LIMPIAR TODAS LAS NOTIFICACIONES ==========
function limpiarNotificaciones() {
    if (notificaciones.length === 0) return;

    if (confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) {
        notificaciones = [];
        notificacionesNoLeidas = 0;
        actualizarContadorNotificaciones();
        renderizarListaNotificaciones();
        guardarNotificaciones();
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('🗑️ Todas las notificaciones eliminadas', 'info');
        }
    }
}

// ========== ABRIR NOTIFICACIÓN ==========
function abrirNotificacion(id, url) {
    // Marcar como leída
    marcarComoLeida(id);

    // Cerrar panel de notificaciones
    if (typeof alternarCentroNotificaciones === 'function') {
        alternarCentroNotificaciones();
    }

    // Abrir URL si existe
    if (url && url !== 'null') {
        window.location.href = url;
    }
}

// ========== ALTERNAR CENTRO DE NOTIFICACIONES ==========
function alternarCentroNotificaciones() {
    const panel = document.getElementById('panelNotificaciones');
    if (!panel) return;

    const estaVisible = panel.classList.contains('activo');

    if (estaVisible) {
        // Cerrar panel
        panel.classList.remove('activo');
        document.body.style.overflow = '';
    } else {
        // Abrir panel
        panel.classList.add('activo');
        document.body.style.overflow = 'hidden';

        // Marcar notificaciones como vistas (no leídas, pero vistas)
        renderizarListaNotificaciones();
    }
}

// ========== INICIALIZACIÓN ==========
// Cargar notificaciones al iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cargarNotificacionesGuardadas();
        console.log('✅ Sistema de notificaciones inicializado');
    });
} else {
    // El DOM ya está listo
    cargarNotificacionesGuardadas();
    console.log('✅ Sistema de notificaciones inicializado');
}
