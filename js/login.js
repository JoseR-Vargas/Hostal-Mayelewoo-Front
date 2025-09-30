// Configuración de la aplicación
const CONFIG = {
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
        // En producción, usar el backend desplegado en Render
        return 'https://mayelewoo-back.onrender.com/api';
    })(),
    STORAGE_KEY: 'mayelewoo_admin_token',
    ADMIN_DASHBOARD: 'dashboard.html'
};

// Clase para manejar autenticación
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Verificar si ya está logueado
        if (this.isAuthenticated() && this.isOnLoginPage()) {
            this.redirectToDashboard();
            return;
        }

        this.setupLoginForm();
    }

    isOnLoginPage() {
        return window.location.pathname.includes('login.html');
    }

    setupLoginForm() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', this.handleLogin.bind(this));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = this.getFormData();
        const validation = this.validateForm(formData);
        
        if (!validation.isValid) {
            this.showError(validation.message);
            return;
        }

        this.setLoading(true);
        this.hideError();

        try {
            const response = await this.authenticate(formData);
            
            if (response.success) {
                this.saveToken(response.token);
                this.redirectToDashboard();
            } else {
                this.showError(response.message || 'Credenciales incorrectas');
            }
        } catch (error) {
            console.error('Error de autenticación:', error);
            this.showError('Error de conexión. Intenta nuevamente.');
        } finally {
            this.setLoading(false);
        }
    }

    getFormData() {
        return {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };
    }

    validateForm({ email, password }) {
        if (!email || !password) {
            return {
                isValid: false,
                message: 'Todos los campos son obligatorios'
            };
        }

        if (!this.isValidEmail(email)) {
            return {
                isValid: false,
                message: 'Por favor ingresa un email válido'
            };
        }

        if (password.length < 6) {
            return {
                isValid: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            };
        }

        return { isValid: true };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async authenticate(credentials) {
        try {
            console.log('🔐 Intentando autenticar con:', credentials.email);
            console.log('🔗 URL del backend:', `${CONFIG.API_BASE_URL}/auth/login`);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });

            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            const data = await response.json();
            console.log('📊 Datos recibidos:', data);

            if (response.ok && data.success) {
                console.log('✅ Login exitoso');
                return {
                    success: true,
                    token: data.access_token,
                    user: data.user
                };
            } else {
                console.log('❌ Login falló:', data.message);
                return {
                    success: false,
                    message: data.message || 'Error de autenticación'
                };
            }
        } catch (error) {
            console.error('🚨 Error en la autenticación:', error);
            console.error('🔍 Tipo de error:', error.name);
            console.error('💬 Mensaje:', error.message);
            
            let errorMessage = 'Error de conexión con el servidor';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
            } else if (error.name === 'SyntaxError') {
                errorMessage = 'Respuesta inválida del servidor';
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    // Simulación temporal hasta conectar con backend
    mockAuthentication({ email, password }) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Credenciales hardcodeadas temporalmente
                if (email === 'admin@mayelewoo.com' && password === 'admin123') {
                    resolve({
                        success: true,
                        token: 'mock_jwt_token_' + Date.now(),
                        user: { email, role: 'admin' }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Email o contraseña incorrectos'
                    });
                }
            }, 1000); // Simular delay de red
        });
    }

    // Método preparado para integración con backend
    async callAuthAPI(credentials) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    saveToken(token) {
        sessionStorage.setItem(CONFIG.STORAGE_KEY, token);
    }

    getToken() {
        return sessionStorage.getItem(CONFIG.STORAGE_KEY);
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    logout() {
        sessionStorage.removeItem(CONFIG.STORAGE_KEY);
        window.location.href = 'login.html';
    }

    redirectToDashboard() {
        window.location.href = CONFIG.ADMIN_DASHBOARD;
    }

    setLoading(isLoading) {
        const btn = document.getElementById('loginBtn');
        const spinner = btn.querySelector('.loading-spinner');
        const text = btn.querySelector('span');

        if (isLoading) {
            btn.disabled = true;
            spinner.style.display = 'inline-block';
            text.textContent = 'Iniciando sesión...';
        } else {
            btn.disabled = false;
            spinner.style.display = 'none';
            text.textContent = 'Iniciar Sesión';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('loginError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    hideError() {
        const errorElement = document.getElementById('loginError');
        errorElement.style.display = 'none';
    }
}

// Función global para verificar autenticación en otras páginas
function requireAuth() {
    const token = sessionStorage.getItem(CONFIG.STORAGE_KEY);
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Función global para logout
function logout() {
    const auth = new AuthManager();
    auth.logout();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
