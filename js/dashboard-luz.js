/**
 * DASHBOARD CONTADORES DE LUZ - HOSTAL MAYELEWOO
 * Gestión y visualización de datos de medidores
 * Aplicando principios: DRY, SOLID, YAGNI
 * Mobile-first y 100% responsive
 * Iterando sobre código existente sin reescribir
 */

class DashboardContadoresLuz {
    constructor() {
        this.metricsContainer = document.getElementById('metricsLuz');
        this.tableBody = document.getElementById('contadorLuzTableBody');
        this.apiBaseUrl = '/api/contadores-luz'; // Backend NestJS endpoint
        
        this.initializeDashboard();
    }

    /**
     * Inicializa el dashboard (DRY - reutiliza patrón de inicialización)
     */
    async initializeDashboard() {
        try {
            await this.loadMetrics();
            await this.loadContadorData();
            this.setupResponsiveHandlers();
        } catch (error) {
            console.error('Error inicializando dashboard:', error);
            this.showError('Error al cargar los datos del dashboard');
        }
    }

    /**
     * Carga métricas de contadores (SOLID - Single Responsibility)
     */
    async loadMetrics() {
        try {
            // TODO: Reemplazar con llamada real al backend
            const mockMetrics = await this.fetchMetricsFromAPI();
            this.renderMetrics(mockMetrics);
        } catch (error) {
            console.error('Error cargando métricas:', error);
        }
    }

    /**
     * Simula fetch de métricas (YAGNI - solo lo necesario por ahora)
     */
    async fetchMetricsFromAPI() {
        // Simular datos hasta conectar con NestJS + MongoDB
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    totalLecturas: 45,
                    lecturasPendientes: 12,
                    promedioConsumo: 85.4,
                    ultimaLectura: '2024-08-30'
                });
            }, 500);
        });
    }

    /**
     * Renderiza métricas en cards (DRY - reutiliza estructura de métricas)
     */
    renderMetrics(metrics) {
        const metricsConfig = [
            { key: 'totalLecturas', title: 'Total Lecturas', icon: '📊' },
            { key: 'lecturasPendientes', title: 'Pendientes', icon: '⏳' },
            { key: 'promedioConsumo', title: 'Promedio kWh', icon: '⚡', suffix: ' kWh' },
            { key: 'ultimaLectura', title: 'Última Lectura', icon: '📅' }
        ];

        this.metricsContainer.innerHTML = metricsConfig.map(config => `
            <div class="metric-card">
                <div class="metric-title">
                    ${config.icon} ${config.title}
                </div>
                <div class="metric-value">
                    ${metrics[config.key]}${config.suffix || ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Carga datos de contadores (SOLID - separación de responsabilidades)
     */
    async loadContadorData() {
        try {
            // TODO: Reemplazar con llamada real al backend
            const mockData = await this.fetchContadorDataFromAPI();
            this.renderContadorTable(mockData);
        } catch (error) {
            console.error('Error cargando datos de contadores:', error);
        }
    }

    /**
     * Simula fetch de datos de contadores
     */
    async fetchContadorDataFromAPI() {
        // Simular datos hasta conectar con backend
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        _id: '1',
                        nombre: 'Juan',
                        apellido: 'Pérez',
                        dni: '12345678',
                        numeroMedicion: '1234.5',
                        nroApartamento: 'A101',
                        timestamp: '2024-08-30T10:30:00Z',
                        fotoMedidor: 'foto1.jpg'
                    },
                    {
                        _id: '2',
                        nombre: 'María',
                        apellido: 'García',
                        dni: '87654321',
                        numeroMedicion: '2567.8',
                        nroApartamento: 'B205',
                        timestamp: '2024-08-30T09:15:00Z',
                        fotoMedidor: 'foto2.jpg'
                    }
                ]);
            }, 700);
        });
    }

    /**
     * Renderiza tabla de contadores (DRY - reutiliza estructura de tabla)
     */
    renderContadorTable(data) {
        if (!data || data.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        No hay lecturas registradas
                    </td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = data.map(item => `
            <tr>
                <td data-label="Nombre">${item.nombre} ${item.apellido}</td>
                <td data-label="DNI">${item.dni}</td>
                <td data-label="Medición">${item.numeroMedicion} kWh</td>
                <td data-label="Hab/Apto">${item.nroApartamento}</td>
                <td data-label="Fecha/Hora">${this.formatDateTime(item.timestamp)}</td>
                <td data-label="Foto">
                    ${item.fotoMedidor ? 
                        `<button onclick="window.dashboardLuz.viewPhoto('${item._id}')" 
                                class="btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                            Ver Foto
                        </button>` : 
                        '<span style="color: var(--text-secondary);">Sin foto</span>'
                    }
                </td>
            </tr>
        `).join('');
    }

    /**
     * Formatea fecha y hora (DRY - función utilitaria reutilizable)
     */
    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return new Intl.DateTimeFormat('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * Muestra foto del medidor (SOLID - función específica)
     */
    viewPhoto(id) {
        // TODO: Implementar visualización de foto desde MongoDB GridFS
        this.showMessage('Función de visualización de fotos en desarrollo', 'info');
    }

    /**
     * Configurar handlers responsive (Mobile-first)
     */
    setupResponsiveHandlers() {
        // Auto-refresh cada 30 segundos en mobile para datos actualizados
        if (window.innerWidth <= 768) {
            this.autoRefreshInterval = setInterval(() => {
                this.loadMetrics();
                this.loadContadorData();
            }, 30000);
        }

        // Cleanup al cambiar de página
        window.addEventListener('beforeunload', () => {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
            }
        });
    }

    /**
     * Sistema de notificaciones (DRY - reutiliza del FormHandler)
     */
    showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message-notification');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-notification ${type}`;
        messageDiv.innerHTML = `
            <p>${message}</p>
            <button onclick="this.parentElement.remove()" aria-label="Cerrar">&times;</button>
        `;

        const colors = {
            'info': '#3b82f6',
            'error': '#ef4444',
            'success': '#10b981'
        };

        Object.assign(messageDiv.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            zIndex: '10000',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backgroundColor: colors[type] || colors.info,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px'
        });

        messageDiv.querySelector('button').style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            margin: 0;
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

    /**
     * Método de conveniencia para mostrar errores
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Refrescar datos manualmente
     */
    async refreshData() {
        try {
            await this.loadMetrics();
            await this.loadContadorData();
            this.showMessage('Datos actualizados correctamente', 'success');
        } catch (error) {
            this.showError('Error al actualizar los datos');
        }
    }
}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Instancia global para acceso desde onclick handlers
    window.dashboardLuz = new DashboardContadoresLuz();
});

// Optimización mobile (DRY - reutiliza patrón de mobile optimization)
document.addEventListener('DOMContentLoaded', () => {
    // Prevenir zoom en iOS en elementos del dashboard
    const interactiveElements = document.querySelectorAll('button, .metric-card, .data-table td');
    
    interactiveElements.forEach(element => {
        element.addEventListener('touchstart', (e) => {
            if (window.innerWidth < 768) {
                e.target.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 100);
            }
        });
    });
});

/**
 * Funciones de utilidad para el backend (Ready para NestJS + MongoDB)
 */
class ContadorLuzAPI {
    static async fetchContadores() {
        // TODO: Implementar conexión real con NestJS
        const response = await fetch('/api/contadores-luz');
        return response.json();
    }

    static async fetchMetrics() {
        // TODO: Implementar métricas agregadas desde MongoDB
        const response = await fetch('/api/contadores-luz/metrics');
        return response.json();
    }

    static async getPhoto(id) {
        // TODO: Implementar descarga de foto desde GridFS
        const response = await fetch(`/api/contadores-luz/${id}/photo`);
        return response.blob();
    }
}
