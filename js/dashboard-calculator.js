/**
 * Dashboard Calculator - Hostal Mayelewoo
 * Gestión de cálculos de consumo eléctrico
 * Principios: DRY, SOLID, YAGNI
 * Diseño: 50% Mobile / 50% Desktop
 */

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================
const API_BASE_URL = 'http://localhost:3000';
const ENDPOINTS = {
    CALCULOS: '/api/calculos-medidor',
    FOTO_ANTERIOR: (id) => `/api/calculos-medidor/${id}/foto-anterior`,
    FOTO_ACTUAL: (id) => `/api/calculos-medidor/${id}/foto-actual`,
};

// ============================================
// ESTADO DE LA APLICACIÓN (Single Source of Truth)
// ============================================
class AppState {
    constructor() {
        this.allCalculos = [];
        this.filteredCalculos = [];
        this.currentFilter = {
            habitacion: '',
            dni: ''
        };
    }

    setCalculos(calculos) {
        this.allCalculos = calculos;
        this.applyFilters();
    }

    setFilter(type, value) {
        this.currentFilter[type] = value;
        this.applyFilters();
    }

    clearFilters() {
        this.currentFilter = { habitacion: '', dni: '' };
        this.applyFilters();
    }

    applyFilters() {
        this.filteredCalculos = this.allCalculos.filter(calculo => {
            const matchHabitacion = !this.currentFilter.habitacion || 
                                  calculo.habitacion === this.currentFilter.habitacion;
            const matchDNI = !this.currentFilter.dni || 
                           calculo.dni.includes(this.currentFilter.dni);
            return matchHabitacion && matchDNI;
        });
    }

    getFilteredCalculos() {
        return this.filteredCalculos;
    }

    getAllCalculos() {
        return this.allCalculos;
    }
}

const appState = new AppState();

// ============================================
// SERVICIO DE API (Abstracción de llamadas HTTP)
// ============================================
class ApiService {
    static async fetchCalculos() {
        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.CALCULOS}`);
            if (!response.ok) throw new Error('Error al obtener cálculos');
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error en fetchCalculos:', error);
            throw error;
        }
    }

    static getFotoUrl(id, tipo) {
        return tipo === 'anterior' 
            ? `${API_BASE_URL}${ENDPOINTS.FOTO_ANTERIOR(id)}`
            : `${API_BASE_URL}${ENDPOINTS.FOTO_ACTUAL(id)}`;
    }
}

// ============================================
// SERVICIO DE UI (Responsabilidad única: Renderizado)
// ============================================
class UIService {
    static showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    static hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    static showNoData() {
        document.getElementById('noDataMessage').style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
    }

    static hideNoData() {
        document.getElementById('noDataMessage').style.display = 'none';
        document.querySelector('.table-container').style.display = 'block';
    }

    static renderMetrics(calculos) {
        const totalRegistros = calculos.length;
        const totalConsumo = calculos.reduce((sum, c) => sum + c.consumoCalculado, 0);
        const totalMonto = calculos.reduce((sum, c) => sum + c.montoTotal, 0);
        const promedioConsumo = totalRegistros > 0 ? (totalConsumo / totalRegistros).toFixed(2) : 0;

        const metricsHTML = `
            <div class="metric-card">
                <h4 class="metric-title">Total Registros</h4>
                <p class="metric-value">${totalRegistros}</p>
            </div>
            <div class="metric-card">
                <h4 class="metric-title">Consumo Total</h4>
                <p class="metric-value">${totalConsumo.toFixed(2)} kWh</p>
            </div>
            <div class="metric-card">
                <h4 class="metric-title">Monto Total</h4>
                <p class="metric-value">$${totalMonto.toFixed(2)}</p>
            </div>
            <div class="metric-card">
                <h4 class="metric-title">Promedio Consumo</h4>
                <p class="metric-value">${promedioConsumo} kWh</p>
            </div>
        `;

        document.getElementById('metricsCalculator').innerHTML = metricsHTML;
    }

    static renderTable(calculos) {
        const tbody = document.getElementById('calculatorTableBody');
        
        if (calculos.length === 0) {
            this.showNoData();
            return;
        }

        this.hideNoData();

        const rows = calculos.map(calculo => this.createTableRow(calculo)).join('');
        tbody.innerHTML = rows;
    }

    static createTableRow(calculo) {
        const fecha = new Date(calculo.fechaRegistro).toLocaleDateString('es-AR');
        const hasFotoAnterior = calculo.fotoAnteriorData && calculo.fotoAnteriorData.filename;
        const hasFotoActual = calculo.fotoActualData && calculo.fotoActualData.filename;

        return `
            <tr>
                <td>${this.escapeHtml(calculo.nombre)}</td>
                <td>${this.escapeHtml(calculo.apellido)}</td>
                <td>${this.escapeHtml(calculo.dni)}</td>
                <td>${this.escapeHtml(calculo.habitacion)}</td>
                <td>${calculo.medicionAnterior.toFixed(2)}</td>
                <td>${calculo.medicionActual.toFixed(2)}</td>
                <td class="consumo-cell">${calculo.consumoCalculado.toFixed(2)}</td>
                <td><strong>$${calculo.montoTotal.toFixed(2)}</strong></td>
                <td>${fecha}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${hasFotoAnterior ? 
                            `<img src="${ApiService.getFotoUrl(calculo._id, 'anterior')}" 
                                  alt="Medición Anterior" 
                                  class="foto-medidor-preview" 
                                  onclick="openImageModal('${calculo._id}', 'anterior', 'Medición Anterior - ${calculo.habitacion}')"
                                  onerror="this.src=''; this.classList.add('imagen-error'); this.alt='Error al cargar'">` 
                            : '<span class="sin-foto">Sin foto ant.</span>'
                        }
                        ${hasFotoActual ? 
                            `<img src="${ApiService.getFotoUrl(calculo._id, 'actual')}" 
                                  alt="Medición Actual" 
                                  class="foto-medidor-preview" 
                                  onclick="openImageModal('${calculo._id}', 'actual', 'Medición Actual - ${calculo.habitacion}')"
                                  onerror="this.src=''; this.classList.add('imagen-error'); this.alt='Error al cargar'">` 
                            : '<span class="sin-foto">Sin foto act.</span>'
                        }
                    </div>
                </td>
            </tr>
        `;
    }

    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    static populateHabitacionFilter(calculos) {
        const select = document.getElementById('filterHabitacion');
        if (!select) return; // Elemento no existe en el DOM
        
        const habitaciones = [...new Set(calculos.map(c => c.habitacion))].sort();
        const options = habitaciones.map(hab => 
            `<option value="${hab}">${hab}</option>`
        ).join('');
        
        select.innerHTML = '<option value="">Todas las habitaciones</option>' + options;
    }
}

// ============================================
// CONTROLADOR DE MODAL DE IMAGEN
// ============================================
class ImageModalController {
    static open(calculoId, tipo, title) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('imageModalTitle');
        
        modalTitle.textContent = title;
        modalImage.src = ApiService.getFotoUrl(calculoId, tipo);
        modal.classList.add('show');
        
        // Cerrar con ESC
        document.addEventListener('keydown', this.handleEscKey);
    }

    static close() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('show');
        document.removeEventListener('keydown', this.handleEscKey);
    }

    static handleEscKey(e) {
        if (e.key === 'Escape') {
            ImageModalController.close();
        }
    }
}

// ============================================
// CONTROLADOR PRINCIPAL
// ============================================
class DashboardController {
    static async init() {
        await this.loadData();
        this.setupEventListeners();
    }

    static async loadData() {
        UIService.showLoading();
        try {
            const calculos = await ApiService.fetchCalculos();
            appState.setCalculos(calculos);
            this.render();
        } catch (error) {
            console.error('Error cargando datos:', error);
            alert('Error al cargar los datos. Por favor, intente nuevamente.');
        } finally {
            UIService.hideLoading();
        }
    }

    static render() {
        const calculos = appState.getFilteredCalculos();
        UIService.renderMetrics(calculos);
        UIService.renderTable(calculos);
        UIService.populateHabitacionFilter(appState.getAllCalculos());
    }

    static setupEventListeners() {
        // Filtro de habitación
        const filterHabitacion = document.getElementById('filterHabitacion');
        if (filterHabitacion) {
            filterHabitacion.addEventListener('change', (e) => {
                appState.setFilter('habitacion', e.target.value);
                this.render();
            });
        }

        // Búsqueda por DNI
        const searchDNI = document.getElementById('searchDNI');
        if (searchDNI) {
            searchDNI.addEventListener('input', (e) => {
                appState.setFilter('dni', e.target.value.trim());
                this.render();
            });
        }

        // Cerrar modal al hacer click fuera
        const imageModal = document.getElementById('imageModal');
        if (imageModal) {
            imageModal.addEventListener('click', (e) => {
                if (e.target.id === 'imageModal') {
                    ImageModalController.close();
                }
            });
        }
    }
}

// ============================================
// FUNCIONES GLOBALES (Interfaz para HTML)
// ============================================
function clearFilters() {
    appState.clearFilters();
    
    const filterHabitacion = document.getElementById('filterHabitacion');
    if (filterHabitacion) filterHabitacion.value = '';
    
    const searchDNI = document.getElementById('searchDNI');
    if (searchDNI) searchDNI.value = '';
    
    DashboardController.render();
}

function openImageModal(calculoId, tipo, title) {
    ImageModalController.open(calculoId, tipo, title);
}

function closeImageModal() {
    ImageModalController.close();
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    DashboardController.init();
});
