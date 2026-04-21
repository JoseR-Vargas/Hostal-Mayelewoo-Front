/**
 * Dashboard Calculator - Hostal Mayelewoo
 * Principios: DRY, SOLID, YAGNI
 */

const ENDPOINTS = {
    CALCULOS: '/calculos-medidor',
    FOTO_ANTERIOR: id => `/calculos-medidor/${id}/foto-anterior`,
    FOTO_ACTUAL: id => `/calculos-medidor/${id}/foto-actual`,
};

// ─── State ────────────────────────────────────────────────────────────────────

class AppState {
    constructor() {
        this.allCalculos = [];
        this.filteredCalculos = [];
        this.currentFilter = { habitacion: '', dni: '' };
        const now = new Date();
        this.currentMonth = now.getMonth();
        this.currentYear = now.getFullYear();
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

    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        else if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
        this.applyFilters();
    }

    getMonthLabel() {
        const label = new Date(this.currentYear, this.currentMonth)
            .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    applyFilters() {
        this.filteredCalculos = this.allCalculos.filter(calculo => {
            const fecha = new Date(calculo.fechaRegistro);
            const matchMonth = fecha.getMonth() === this.currentMonth && fecha.getFullYear() === this.currentYear;
            const matchHabitacion = !this.currentFilter.habitacion ||
                calculo.habitacion === this.currentFilter.habitacion;
            const matchDNI = !this.currentFilter.dni ||
                calculo.dni.includes(this.currentFilter.dni);
            return matchMonth && matchHabitacion && matchDNI;
        });
    }

    getFilteredCalculos() { return this.filteredCalculos; }
    getAllCalculos() { return this.allCalculos; }
}

const appState = new AppState();

// ─── ApiService ───────────────────────────────────────────────────────────────

class ApiService {
    static async fetchCalculos() {
        const data = await APIClient.getJSON(ENDPOINTS.CALCULOS);
        return data.data || [];
    }

    static getFotoUrl(id, tipo) {
        return `${CONFIG.API_BASE_URL}${tipo === 'anterior' ? ENDPOINTS.FOTO_ANTERIOR(id) : ENDPOINTS.FOTO_ACTUAL(id)}`;
    }
}

// ─── UIService ────────────────────────────────────────────────────────────────

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
        const totalConsumo = calculos.reduce((sum, c) => sum + c.consumoCalculado, 0);
        const promedio = calculos.length > 0 ? totalConsumo / calculos.length : 0;

        document.getElementById('metricsCalculator').innerHTML = `
            <div class="metric-card">
                <h4 class="metric-title">Total Registros</h4>
                <p class="metric-value">${calculos.length}</p>
            </div>
            <div class="metric-card">
                <h4 class="metric-title">Consumo Total</h4>
                <p class="metric-value">${totalConsumo.toFixed(1)} kWh</p>
            </div>
            <div class="metric-card">
                <h4 class="metric-title">Promedio Consumo</h4>
                <p class="metric-value">${promedio.toFixed(1)} kWh</p>
            </div>
        `;
    }

    static renderTable(calculos) {
        const tbody = document.getElementById('calculatorTableBody');
        if (calculos.length === 0) { this.showNoData(); return; }
        this.hideNoData();
        tbody.innerHTML = calculos.map(c => UIService.createTableRow(c)).join('');
    }

    static createTableRow(calculo) {
        const fecha = DateFormatter.toLocalDate(calculo.fechaRegistro);
        const hasFotoAnterior = calculo.fotoAnteriorData?.filename;
        const hasFotoActual = calculo.fotoActualData?.filename;

        return `
            <tr>
                <td>${Sanitizer.escapeHtml(calculo.nombre)}</td>
                <td>${Sanitizer.escapeHtml(calculo.apellido)}</td>
                <td>${Sanitizer.escapeHtml(calculo.dni)}</td>
                <td>${Sanitizer.escapeHtml(calculo.habitacion)}</td>
                <td>${calculo.medicionAnterior.toFixed(1)}</td>
                <td>${calculo.medicionActual.toFixed(1)}</td>
                <td class="consumo-cell">${calculo.consumoCalculado.toFixed(1)}</td>
                <td>${fecha}</td>
                <td>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        ${hasFotoAnterior
                            ? `<img src="${ApiService.getFotoUrl(calculo._id, 'anterior')}"
                                    alt="Medición Anterior"
                                    class="foto-medidor-preview"
                                    onclick="openImageModal('${calculo._id}', 'anterior', 'Medición Anterior - ${Sanitizer.escapeHtml(calculo.habitacion)}')"
                                    onerror="this.src='';this.classList.add('imagen-error');this.alt='Error al cargar'">`
                            : '<span class="sin-foto">Sin foto ant.</span>'
                        }
                        ${hasFotoActual
                            ? `<img src="${ApiService.getFotoUrl(calculo._id, 'actual')}"
                                    alt="Medición Actual"
                                    class="foto-medidor-preview"
                                    onclick="openImageModal('${calculo._id}', 'actual', 'Medición Actual - ${Sanitizer.escapeHtml(calculo.habitacion)}')"
                                    onerror="this.src='';this.classList.add('imagen-error');this.alt='Error al cargar'">`
                            : '<span class="sin-foto">Sin foto act.</span>'
                        }
                    </div>
                </td>
            </tr>
        `;
    }

    static renderMonthLabel(label) {
        const el = document.getElementById('currentMonthLabel');
        if (el) el.textContent = label;
    }

    static populateHabitacionFilter(calculos) {
        const select = document.getElementById('filterHabitacion');
        if (!select) return;
        const habitaciones = [...new Set(calculos.map(c => c.habitacion))].sort();
        select.innerHTML = '<option value="">Todas las habitaciones</option>' +
            habitaciones.map(h => `<option value="${Sanitizer.escapeHtml(h)}">${Sanitizer.escapeHtml(h)}</option>`).join('');
    }
}

// ─── ImageModalController ─────────────────────────────────────────────────────

class ImageModalController {
    static open(calculoId, tipo, title) {
        const modal = document.getElementById('imageModal');
        document.getElementById('imageModalTitle').textContent = title;
        document.getElementById('modalImage').src = ApiService.getFotoUrl(calculoId, tipo);
        modal.classList.add('show');
        document.addEventListener('keydown', ImageModalController.handleEscKey);
    }

    static close() {
        document.getElementById('imageModal').classList.remove('show');
        document.removeEventListener('keydown', ImageModalController.handleEscKey);
    }

    static handleEscKey(e) {
        if (e.key === 'Escape') ImageModalController.close();
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class DashboardController {
    static async init() {
        requireAuth();
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
            Notifier.error('Error al cargar los datos. Por favor, intentá nuevamente.');
        } finally {
            UIService.hideLoading();
        }
    }

    static render() {
        const calculos = appState.getFilteredCalculos();
        UIService.renderMetrics(calculos);
        UIService.renderTable(calculos);
        UIService.renderMonthLabel(appState.getMonthLabel());
        UIService.populateHabitacionFilter(appState.getAllCalculos());
    }

    static setupEventListeners() {
        const filterHabitacion = document.getElementById('filterHabitacion');
        if (filterHabitacion) {
            filterHabitacion.addEventListener('change', e => {
                appState.setFilter('habitacion', e.target.value);
                this.render();
            });
        }

        const searchDNI = document.getElementById('searchDNI');
        if (searchDNI) {
            searchDNI.addEventListener('input', e => {
                appState.setFilter('dni', e.target.value.trim());
                this.render();
            });
        }

        const imageModal = document.getElementById('imageModal');
        if (imageModal) {
            imageModal.addEventListener('click', e => {
                if (e.target.id === 'imageModal') ImageModalController.close();
            });
        }
    }
}

// ─── Global bridges ───────────────────────────────────────────────────────────

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

function changeMonth(delta) {
    appState.changeMonth(delta);
    DashboardController.render();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    DashboardController.init();
});
