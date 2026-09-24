// === SISTEMA DE SINCRONIZACIÓN DE NOTIFICACIONES ===
// Gestiona la comunicación entre Service Worker y Main Thread
// Asegura que TODAS las notificaciones se reflejen en el centro

/**
 * Configuración del sistema de sincronización
 */
const SYNC_CONFIG = {
    storageKey: 'notificaciones_pendientes_sync',
    lastSyncKey: 'ultima_sincronizacion',
    syncInterval: 5 * 60 * 1000, // 5 minutos
    maxRetries: 3,
    retryDelay: 2000
};

/**
 * Inicializar sistema de sincronización
 */
function inicializarSincronizacionNotificaciones() {
    console.log('🔄 Inicializando sistema de sincronización de notificaciones...');
    
    // 1. Escuchar mensajes del Service Worker
    setupServiceWorkerListener();
    
    // 2. Sincronizar notificaciones perdidas al cargar
    sincronizarNotificacionesPerdidas();
    
    // 3. Sincronización periódica
    setInterval(() => {
        if (navigator.onLine) {
            sincronizarNotificacionesPerdidas();
        }
    }, SYNC_CONFIG.syncInterval);
    
    // 4. Sincronizar cuando se recupera conexión
    window.addEventListener('online', () => {
        console.log('🌐 Conexión restaurada, sincronizando notificaciones...');
        sincronizarNotificacionesPerdidas();
    });
    
    console.log('✅ Sistema de sincronización activado');
}

/**
 * Configurar listener para mensajes del Service Worker
 */
function setupServiceWorkerListener() {
    if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker no soportado');
        return;
    }
    
    navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Mensaje recibido del Service Worker:', event.data);
        
        const { type, data } = event.data;
        
        switch (type) {
            case 'NOTIFICATION_CLICKED':
                handleNotificationClicked(data);
                break;
                
            case 'NOTIFICATION_RECEIVED':
                handleNotificationReceived(data);
                break;
                
            case 'BACKGROUND_NOTIFICATION':
                handleBackgroundNotification(data);
                break;
                
            default:
                console.log('⚠️ Tipo de mensaje desconocido:', type);
        }
    });
    
    console.log('✅ Service Worker listener configurado');
}

/**
 * Manejar clic en notificación
 */
function handleNotificationClicked(data) {
    console.log('👆 Usuario hizo clic en notificación:', data);
    
    // Agregar al centro si no existe
    if (typeof agregarNotificacionAlCentro === 'function') {
        agregarNotificacionAlCentro({
            titulo: data.title || data.titulo || 'Notificación',
            mensaje: data.body || data.mensaje || '',
            tipo: data.tipo || 'general',
            icono: data.icon || data.icono || '🔔',
            url: data.url || null,
            data: data.data || data
        });
    }
    
    // Abrir centro de notificaciones
    if (typeof alternarCentroNotificaciones === 'function') {
        setTimeout(() => alternarCentroNotificaciones(), 300);
    }
    
    // Navegar a URL si existe
    if (data.url && data.url !== '/') {
        setTimeout(() => {
            window.location.href = data.url;
        }, 500);
    }
}

/**
 * Manejar notificación recibida en foreground
 */
function handleNotificationReceived(data) {
    console.log('📬 Notificación recibida en foreground:', data);
    
    if (typeof agregarNotificacionAlCentro === 'function') {
        agregarNotificacionAlCentro({
            titulo: data.title || data.titulo || 'Notificación',
            mensaje: data.body || data.mensaje || '',
            tipo: data.tipo || 'general',
            icono: data.icon || data.icono || '🔔',
            url: data.url || null,
            data: data.data || data
        });
    }
}

/**
 * Manejar notificación recibida en background
 */
function handleBackgroundNotification(data) {
    console.log('🌙 Notificación background sincronizada:', data);
    
    // Guardar para procesar cuando se abra la app
    guardarNotificacionPendiente(data);
    
    // Si la app está activa, agregar inmediatamente
    if (document.visibilityState === 'visible') {
        if (typeof agregarNotificacionAlCentro === 'function') {
            agregarNotificacionAlCentro({
                titulo: data.title || data.titulo || 'Notificación',
                mensaje: data.body || data.mensaje || '',
                tipo: data.tipo || 'general',
                icono: data.icon || data.icono || '🔔',
                url: data.url || null,
                data: data.data || data
            });
        }
    }
}

/**
 * Guardar notificación pendiente para sincronización
 */
function guardarNotificacionPendiente(data) {
    try {
        const pendientes = JSON.parse(localStorage.getItem(SYNC_CONFIG.storageKey) || '[]');
        
        pendientes.push({
            ...data,
            receivedAt: Date.now(),
            synced: false
        });
        
        // Mantener solo las últimas 100
        if (pendientes.length > 100) {
            pendientes.splice(0, pendientes.length - 100);
        }
        
        localStorage.setItem(SYNC_CONFIG.storageKey, JSON.stringify(pendientes));
        console.log(`💾 Notificación guardada. Total pendientes: ${pendientes.length}`);
        
    } catch (error) {
        console.error('❌ Error guardando notificación pendiente:', error);
    }
}

/**
 * Sincronizar notificaciones perdidas
 */
async function sincronizarNotificacionesPerdidas() {
    try {
        console.log('🔄 Sincronizando notificaciones perdidas...');
        
        // 1. Procesar notificaciones pendientes locales
        await procesarNotificacionesPendientes();
        
        // 2. Obtener notificaciones del servidor (Firestore)
        await obtenerNotificacionesServidor();
        
        // 3. Actualizar timestamp de última sincronización
        localStorage.setItem(SYNC_CONFIG.lastSyncKey, Date.now().toString());
        
        console.log('✅ Sincronización completada');
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
    }
}

/**
 * Procesar notificaciones pendientes guardadas localmente
 */
async function procesarNotificacionesPendientes() {
    try {
        const pendientes = JSON.parse(localStorage.getItem(SYNC_CONFIG.storageKey) || '[]');
        
        if (pendientes.length === 0) {
            console.log('✅ No hay notificaciones pendientes locales');
            return;
        }
        
        console.log(`📋 Procesando ${pendientes.length} notificaciones pendientes...`);
        
        const noSincronizadas = pendientes.filter(n => !n.synced);
        
        for (const notif of noSincronizadas) {
            if (typeof agregarNotificacionAlCentro === 'function') {
                agregarNotificacionAlCentro({
                    titulo: notif.title || notif.titulo || 'Notificación',
                    mensaje: notif.body || notif.mensaje || '',
                    tipo: notif.tipo || 'general',
                    icono: notif.icon || notif.icono || '🔔',
                    url: notif.url || null,
                    data: notif.data || notif
                });
                
                // Marcar como sincronizada
                notif.synced = true;
            }
        }
        
        // Guardar estado actualizado
        localStorage.setItem(SYNC_CONFIG.storageKey, JSON.stringify(pendientes));
        
        console.log(`✅ ${noSincronizadas.length} notificaciones sincronizadas`);
        
    } catch (error) {
        console.error('❌ Error procesando notificaciones pendientes:', error);
    }
}

/**
 * Obtener notificaciones del servidor (Firestore vía Netlify Functions)
 */
async function obtenerNotificacionesServidor() {
    try {
        const ultimaSincronizacion = localStorage.getItem(SYNC_CONFIG.lastSyncKey);
        const desde = ultimaSincronizacion ? parseInt(ultimaSincronizacion) : Date.now() - (24 * 60 * 60 * 1000); // Últimas 24 horas
        
        console.log(`📡 Consultando notificaciones desde: ${new Date(desde).toLocaleString()}`);
        
        const response = await fetch(`/.netlify/functions/obtener-notificaciones?desde=${desde}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.notificaciones && Array.isArray(data.notificaciones)) {
            console.log(`📬 ${data.notificaciones.length} notificaciones recibidas del servidor`);
            
            data.notificaciones.forEach(notif => {
                if (typeof agregarNotificacionAlCentro === 'function') {
                    agregarNotificacionAlCentro({
                        titulo: notif.titulo || notif.title || 'Notificación',
                        mensaje: notif.mensaje || notif.body || '',
                        tipo: notif.tipo || 'general',
                        icono: notif.icono || notif.icon || '🔔',
                        url: notif.url || null,
                        data: notif.data || notif
                    });
                }
            });
        } else {
            console.log('✅ No hay nuevas notificaciones del servidor');
        }
        
    } catch (error) {
        // No es crítico si falla - las notificaciones locales aún funcionan
        console.warn('⚠️ No se pudieron obtener notificaciones del servidor:', error.message);
    }
}

/**
 * Limpiar notificaciones antiguas pendientes
 */
function limpiarNotificacionesAntiguas() {
    try {
        const pendientes = JSON.parse(localStorage.getItem(SYNC_CONFIG.storageKey) || '[]');
        const ahora = Date.now();
        const unaSemana = 7 * 24 * 60 * 60 * 1000;
        
        const filtradas = pendientes.filter(n => {
            const edad = ahora - (n.receivedAt || 0);
            return edad < unaSemana;
        });
        
        if (filtradas.length < pendientes.length) {
            localStorage.setItem(SYNC_CONFIG.storageKey, JSON.stringify(filtradas));
            console.log(`🧹 ${pendientes.length - filtradas.length} notificaciones antiguas eliminadas`);
        }
        
    } catch (error) {
        console.error('❌ Error limpiando notificaciones antiguas:', error);
    }
}

/**
 * Obtener estadísticas de sincronización
 */
function obtenerEstadisticasSync() {
    try {
        const pendientes = JSON.parse(localStorage.getItem(SYNC_CONFIG.storageKey) || '[]');
        const sincronizadas = pendientes.filter(n => n.synced).length;
        const noSincronizadas = pendientes.length - sincronizadas;
        const ultimaSync = localStorage.getItem(SYNC_CONFIG.lastSyncKey);
        
        return {
            total: pendientes.length,
            sincronizadas,
            noSincronizadas,
            ultimaSincronizacion: ultimaSync ? new Date(parseInt(ultimaSync)) : null
        };
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return null;
    }
}

// Exportar funciones globales
window.inicializarSincronizacionNotificaciones = inicializarSincronizacionNotificaciones;
window.sincronizarNotificacionesPerdidas = sincronizarNotificacionesPerdidas;
window.obtenerEstadisticasSync = obtenerEstadisticasSync;
window.limpiarNotificacionesAntiguas = limpiarNotificacionesAntiguas;

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarSincronizacionNotificaciones);
} else {
    inicializarSincronizacionNotificaciones();
}

console.log('✅ Módulo de sincronización de notificaciones cargado');
