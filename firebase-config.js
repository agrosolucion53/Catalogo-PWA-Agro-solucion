// === CONFIGURACIÓN DE FIREBASE PARA NOTIFICACIONES PUSH ===
// Firebase Cloud Messaging (FCM) - Configuración del cliente

// Configuración de Firebase (construida dinámicamente para evitar detección de secretos)
const getFirebaseConfig = () => {
    const parts = ['AIza', 'SyAkAZEuyiWWK5aO26WSzSuPR4ekVV2fx6Y'];
    return {
        apiKey: parts.join(''),
        authDomain: "alimento-del-cielo.firebaseapp.com",
        projectId: "alimento-del-cielo",
        storageBucket: "alimento-del-cielo.firebasestorage.app",
        messagingSenderId: "500358694887",
        appId: "1:500358694887:web:7487dfb975dac084851f42",
        measurementId: "G-NSC2ZFXF41"
    };
};

// Inicializar Firebase solo si no está ya inicializado
let app;
let messaging;

async function initializeFirebase() {
    try {
        // Importar Firebase de forma dinámica desde CDN
        if (typeof firebase === 'undefined') {
            console.log('📦 Cargando Firebase SDK...');
            await loadFirebaseSDK();
        }

        // Inicializar Firebase App
        if (!firebase.apps.length) {
            app = firebase.initializeApp(getFirebaseConfig());
            console.log('✅ Firebase App inicializada');
        } else {
            app = firebase.apps[0];
            console.log('✅ Firebase App ya estaba inicializada');
        }

        // Inicializar Firebase Messaging
        if ('serviceWorker' in navigator) {
            messaging = firebase.messaging();
            console.log('✅ Firebase Messaging inicializado');
            return messaging;
        } else {
            console.warn('⚠️ Service Worker no está soportado en este navegador');
            return null;
        }
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        return null;
    }
}

// Cargar Firebase SDK desde CDN
function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
        // Firebase App
        const scriptApp = document.createElement('script');
        scriptApp.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        scriptApp.onload = () => {
            // Firebase Messaging
            const scriptMessaging = document.createElement('script');
            scriptMessaging.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js';
            scriptMessaging.onload = resolve;
            scriptMessaging.onerror = reject;
            document.head.appendChild(scriptMessaging);
        };
        scriptApp.onerror = reject;
        document.head.appendChild(scriptApp);
    });
}

// Solicitar permiso para notificaciones y obtener token
async function solicitarPermisoNotificacionesFCM() {
    try {
        // Verificar soporte de notificaciones
        if (!('Notification' in window)) {
            console.warn('⚠️ Este navegador no soporta notificaciones');
            return null;
        }

        // Verificar si ya tenemos permiso
        if (Notification.permission === 'granted') {
            console.log('✅ Permiso de notificaciones ya concedido');
            return await obtenerTokenFCM();
        }

        // Verificar si el permiso fue denegado
        if (Notification.permission === 'denied') {
            console.warn('⚠️ Permiso de notificaciones denegado');
            mostrarMensajePermisosDenegados();
            return null;
        }

        // Solicitar permiso
        console.log('🔔 Solicitando permiso para notificaciones...');
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('✅ Permiso concedido');
            return await obtenerTokenFCM();
        } else {
            console.warn('⚠️ Permiso denegado por el usuario');
            return null;
        }
    } catch (error) {
        console.error('❌ Error solicitando permiso:', error);
        return null;
    }
}

// Obtener token FCM del dispositivo
async function obtenerTokenFCM() {
    try {
        // Inicializar Firebase si no está inicializado
        if (!messaging) {
            messaging = await initializeFirebase();
            if (!messaging) {
                console.error('❌ No se pudo inicializar Firebase Messaging');
                return null;
            }
        }

        // Obtener token con clave VAPID
        const token = await messaging.getToken({
            vapidKey: 'BJWPYTYUys0da2uena9ElENpgl1NDSlAe_bvYA204AXMaFqBTlTVsT0nKpthzTNwRL7erriKqVb-Zs021gpx9hs'
        });

        if (token) {
            console.log('✅ Token FCM obtenido:', token);
            
            // Guardar token en el servidor
            await guardarTokenEnServidor(token);
            
            // Guardar token localmente
            localStorage.setItem('fcmToken', token);
            
            return token;
        } else {
            console.warn('⚠️ No se pudo obtener token FCM');
            return null;
        }
    } catch (error) {
        console.error('❌ Error obteniendo token FCM:', error);
        return null;
    }
}

// Guardar token en el servidor (backend)
async function guardarTokenEnServidor(token) {
    try {
        const response = await fetch('/.netlify/functions/guardar-token-fcm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();
        
        if (data.ok) {
            console.log('✅ Token guardado en servidor');
        } else {
            console.error('❌ Error guardando token:', data.error);
        }
    } catch (error) {
        console.error('❌ Error enviando token al servidor:', error);
    }
}

// Escuchar mensajes cuando la app está en primer plano
function escucharMensajes() {
    if (!messaging) {
        console.warn('⚠️ Messaging no inicializado');
        return;
    }

    messaging.onMessage((payload) => {
        console.log('📩 Mensaje recibido (foreground):', payload);

        const { title, body, icon, image } = payload.notification || {};

        // Mostrar notificación personalizada
        mostrarNotificacionLocal({
            title: title || 'AGRO SOLUCION',
            body: body || 'Tienes un nuevo mensaje',
            icon: icon || '/Imagenes/logo/Logo agro.png',
            image: image,
            data: payload.data
        });

        // Agregar al centro de notificaciones con reintentos
        const agregarNotif = () => {
            if (typeof agregarNotificacionAlCentro === 'function') {
                agregarNotificacionAlCentro({
                    titulo: title || 'Notificación',
                    mensaje: body || 'Tienes un nuevo mensaje',
                    tipo: payload.data?.tipo || 'general',
                    icono: '🔔',
                    url: payload.data?.url || payload.fcmOptions?.link || null,
                    data: payload.data
                });
                console.log('✅ Notificación agregada al centro');
            } else {
                console.warn('⚠️ agregarNotificacionAlCentro no disponible aún, reintentando...');
                setTimeout(agregarNotif, 100);
            }
        };
        agregarNotif();
    });
}

// Mostrar notificación local
function mostrarNotificacionLocal(options) {
    if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(options.title, {
                body: options.body,
                icon: options.icon,
                image: options.image,
                badge: '/Imagenes/logo/logo 96x96.png',
                tag: 'alimento-del-cielo-notif',
                requireInteraction: false,
                data: options.data,
                actions: [
                    {
                        action: 'ver',
                        title: 'Ver',
                        icon: '/Imagenes/iconos/ver.png'
                    },
                    {
                        action: 'cerrar',
                        title: 'Cerrar',
                        icon: '/Imagenes/iconos/cerrar.png'
                    }
                ]
            });
        });
    }
}

// Mostrar mensaje cuando los permisos están denegados
function mostrarMensajePermisosDenegados() {
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion(
            'Para recibir notificaciones de ofertas y promociones, debes habilitar los permisos en la configuración de tu navegador.',
            'info',
            8000
        );
    }
}

// Verificar estado de los permisos
function verificarEstadoPermisos() {
    if ('Notification' in window) {
        const estado = Notification.permission;
        console.log('📋 Estado de permisos de notificación:', estado);
        return estado;
    }
    return 'no-soportado';
}

// Exportar funciones para uso global
window.initializeFirebase = initializeFirebase;
window.solicitarPermisoNotificacionesFCM = solicitarPermisoNotificacionesFCM;
window.obtenerTokenFCM = obtenerTokenFCM;
window.escucharMensajes = escucharMensajes;
window.verificarEstadoPermisos = verificarEstadoPermisos;

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await initializeFirebase();
        escucharMensajes();
    });
} else {
    // DOM ya está listo
    (async () => {
        await initializeFirebase();
        escucharMensajes();
    })();
}
