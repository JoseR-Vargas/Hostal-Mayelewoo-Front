/**
 * Configuración del Frontend - Hostal Mayelewoo
 */

const CONFIG = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    PRICE_PER_KWH: 439.26,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // ms
    REQUEST_TIMEOUT: 30000, // 30 segundos

    API_BASE_URL: (() => {
        const { hostname, protocol } = window.location;
        const params = new URLSearchParams(window.location.search);
        const backendOverride = params.get('backend');
        if (backendOverride === 'local') {
            return `${protocol}//localhost:3000/api`;
        }
        if (backendOverride && /^https?:\/\//i.test(backendOverride)) {
            return backendOverride.replace(/\/$/, '') + '/api';
        }
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:3000/api`;
        }
        return 'https://hostal-mayelewoo-backend.vercel.app/api';
    })(),
    STORAGE_KEY: 'mayelewoo_admin_token',
    ADMIN_DASHBOARD: 'dashboard.html',
};
