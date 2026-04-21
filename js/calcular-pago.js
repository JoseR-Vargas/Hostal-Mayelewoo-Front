/**
 * Calcular Pago Electricidad - Hostal Mayelewoo
 * Paso 1: precio kWh desde factura. Paso 2: selección de residente y cálculo del total.
 * Principios: DRY, SOLID, YAGNI
 */

// ─── Utilidades de entrada numérica ──────────────────────────────────────────

class NumberInputService {
    static normalize(value) {
        return (value || '').trim().replace(',', '.');
    }

    static parsePositive(value) {
        const n = parseFloat(NumberInputService.normalize(value));
        return isFinite(n) && n > 0 ? n : NaN;
    }

    static parseMontoFactura(value) {
        const normalized = CurrencyFormatter.normalize(value);
        const n = parseFloat(normalized);
        return isFinite(n) && n > 0 ? n : NaN;
    }

    static formatMontoInput(value) {
        let v = value.replace(/[^0-9,]/g, '');
        const commaIdx = v.indexOf(',');
        let intPart, decPart;
        if (commaIdx !== -1) {
            intPart = v.slice(0, commaIdx);
            decPart = ',' + v.slice(commaIdx + 1).replace(/[^0-9]/g, '');
        } else {
            intPart = v;
            decPart = '';
        }
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return intPart + decPart;
    }
}

// ─── State ────────────────────────────────────────────────────────────────────

class CalcState {
    constructor() {
        this.precioKwh = null;
        this.allResidents = [];
        this.selectedResident = null;
        this.residentsLoaded = false;
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
    }

    setPrecioKwh(value)   { this.precioKwh = value; }
    getPrecioKwh()        { return this.precioKwh; }
    hasPrecioKwh()        { return this.precioKwh !== null && isFinite(this.precioKwh); }

    reset() {
        this.precioKwh = null;
        this.clearSelectedResident();
    }

    setResidents(records) { this.allResidents = records; this.residentsLoaded = true; }
    getResidents()        { return this.allResidents; }
    setSelectedResident(r) { this.selectedResident = r; }
    getSelectedResident() { return this.selectedResident; }
    clearSelectedResident() { this.selectedResident = null; }

    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        else if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    }

    getMonthLabel() {
        const label = new Date(this.currentYear, this.currentMonth)
            .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    }
}

const calcState = new CalcState();

// ─── ApiService ───────────────────────────────────────────────────────────────

class CalcApiService {
    static async fetchCalculos() {
        const token = sessionStorage.getItem(CONFIG.STORAGE_KEY);
        if (!token) throw new Error('No autenticado');
        const data = await APIClient.getJSON('/calculos-medidor');
        return data.data || [];
    }
}

// ─── DomainLogic ─────────────────────────────────────────────────────────────

class ResidentLogic {
    static filterByMonth(records, month, year) {
        return records.filter(r => {
            const d = new Date(r.fechaRegistro);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    static deduplicateByHabitacion(records) {
        const map = new Map();
        for (const r of records) {
            const existing = map.get(r.habitacion);
            if (!existing || new Date(r.fechaRegistro) > new Date(existing.fechaRegistro)) {
                map.set(r.habitacion, r);
            }
        }
        return Array.from(map.values());
    }

    static sortByHabitacion(records) {
        return [...records].sort((a, b) => a.habitacion.localeCompare(b.habitacion));
    }

    static getResidentsForMonth(allRecords, month, year) {
        return ResidentLogic.sortByHabitacion(
            ResidentLogic.deduplicateByHabitacion(
                ResidentLogic.filterByMonth(allRecords, month, year)
            )
        );
    }

    static findByHabitacion(residents, habitacion) {
        return residents.find(r => r.habitacion === habitacion) || null;
    }
}

class ElectricityCalculator {
    static calcularPrecioKwh(montoFactura, totalKwhFactura) {
        return montoFactura / totalKwhFactura;
    }

    static calcularTotalAPagar(consumoKwh, precioKwh) {
        return consumoKwh * precioKwh;
    }
}

// ─── UIService ────────────────────────────────────────────────────────────────

class CalcUIService {
    static getInputValue(id) {
        return document.getElementById(id)?.value ?? '';
    }

    static setReadonlyField(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    static clearReadonlyField(id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    }

    static showFieldError(inputId, message) {
        FormValidator.showError(inputId, message);
    }

    static clearFieldError(inputId) {
        FormValidator.clearError(inputId);
    }

    static clearAllErrors() {
        document.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
    }

    static setButtonProcessing(buttonId, isProcessing) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.classList.toggle('processing', isProcessing);
        btn.disabled = isProcessing;
    }

    static showStep2() {
        const el = document.getElementById('step2Section');
        if (el) el.style.display = '';
    }

    static setResidentesLoading(isLoading) {
        const loading   = document.getElementById('residentesLoading');
        const tableWrap = document.getElementById('residentesTableContainer');
        const errorWrap = document.getElementById('residentesError');
        const emptyWrap = document.getElementById('residentesEmpty');
        if (loading) loading.style.display = isLoading ? '' : 'none';
        if (isLoading) {
            if (tableWrap) tableWrap.style.display = 'none';
            if (errorWrap) errorWrap.style.display = 'none';
            if (emptyWrap) emptyWrap.style.display = 'none';
        }
    }

    static showResidentesError(msg) {
        const errorWrap = document.getElementById('residentesError');
        const errorMsg  = document.getElementById('residentesErrorMsg');
        const tableWrap = document.getElementById('residentesTableContainer');
        const emptyWrap = document.getElementById('residentesEmpty');
        if (errorMsg)  errorMsg.textContent    = msg;
        if (errorWrap) errorWrap.style.display = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyWrap) emptyWrap.style.display = 'none';
    }

    static hideResidentesError() {
        const errorWrap = document.getElementById('residentesError');
        if (errorWrap) errorWrap.style.display = 'none';
    }

    static renderResidentesMonthLabel(label) {
        const el = document.getElementById('residentesMonthLabel');
        if (el) el.textContent = label;
    }

    static buildResidentRow(r) {
        return `<tr id="fila-${Sanitizer.escapeHtml(r.habitacion)}">
            <td>${Sanitizer.escapeHtml(r.nombre)}</td>
            <td>${Sanitizer.escapeHtml(r.apellido)}</td>
            <td>${Sanitizer.escapeHtml(r.habitacion)}</td>
            <td>${r.consumoCalculado.toFixed(1)} kWh</td>
            <td>
                <button type="button" class="cta-button"
                    style="padding:0.5rem 1rem;font-size:0.85rem;animation:none;"
                    data-habitacion="${Sanitizer.escapeHtml(r.habitacion)}"
                    onclick="seleccionarResidente(this.getAttribute('data-habitacion'))">
                    Seleccionar
                </button>
            </td>
        </tr>`;
    }

    static renderResidentTable(residents) {
        const tableWrap = document.getElementById('residentesTableContainer');
        const tbody     = document.getElementById('residentesTableBody');
        const emptyWrap = document.getElementById('residentesEmpty');
        if (!tableWrap || !tbody || !emptyWrap) return;

        if (residents.length === 0) {
            tableWrap.style.display = 'none';
            emptyWrap.style.display = '';
            return;
        }

        emptyWrap.style.display = 'none';
        tbody.innerHTML = residents.map(r => CalcUIService.buildResidentRow(r)).join('');
        tableWrap.style.display = '';
    }

    static highlightSelectedRow(habitacion) {
        const tbody = document.getElementById('residentesTableBody');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.style.backgroundColor = '';
            tr.style.borderLeft = '';
        });
        const row = document.getElementById(`fila-${habitacion}`);
        if (row) {
            row.style.backgroundColor = 'rgba(43, 108, 176, 0.1)';
            row.style.borderLeft = '3px solid var(--color-primary)';
        }
    }

    static renderSelectedResident(resident, total, precioKwh) {
        const set = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        set('residenteNombreDisplay', `${Sanitizer.escapeHtml(resident.nombre)} ${Sanitizer.escapeHtml(resident.apellido)}`);
        set('residenteHabitacionDisplay', `Habitación: ${Sanitizer.escapeHtml(resident.habitacion)}`);
        set('residenteConsumoDisplay', `${resident.consumoCalculado.toFixed(1)} kWh`);
        set('residentePrecioKwhDisplay', `$${CurrencyFormatter.format(precioKwh)}`);
        set('residenteTotalDisplay', `$${CurrencyFormatter.format(total)}`);
        const card = document.getElementById('residenteSeleccionado');
        if (card) card.style.display = '';
    }

    static clearSelectedResident() {
        const card  = document.getElementById('residenteSeleccionado');
        const tbody = document.getElementById('residentesTableBody');
        if (card) card.style.display = 'none';
        if (tbody) tbody.querySelectorAll('tr').forEach(tr => {
            tr.style.backgroundColor = '';
            tr.style.borderLeft = '';
        });
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class CalcularPagoController {
    static init() {
        requireAuth();
        this.setupDecimalInputs();
    }

    static setupDecimalInputs() {
        const montoInput = document.getElementById('montoFactura');
        if (montoInput) {
            montoInput.addEventListener('input', e => {
                const cursor = e.target.selectionStart;
                const prevLen = e.target.value.length;
                e.target.value = NumberInputService.formatMontoInput(e.target.value);
                const diff = e.target.value.length - prevLen;
                e.target.setSelectionRange(cursor + diff, cursor + diff);
            });
        }

        const kwhInput = document.getElementById('totalKwhFactura');
        if (kwhInput) {
            kwhInput.addEventListener('input', e => {
                let v = e.target.value.replace(/[^0-9.,]/g, '');
                const separators = v.match(/[.,]/g);
                if (separators && separators.length > 1) {
                    const firstIdx = v.search(/[.,]/);
                    v = v.slice(0, firstIdx + 1) + v.slice(firstIdx + 1).replace(/[.,]/g, '');
                }
                e.target.value = v;
            });
        }
    }

    static async handleCalcularPrecioKwh() {
        CalcUIService.clearAllErrors();
        CalcUIService.clearReadonlyField('precioKwh');
        calcState.reset();

        const monto    = NumberInputService.parseMontoFactura(CalcUIService.getInputValue('montoFactura'));
        const totalKwh = NumberInputService.parsePositive(CalcUIService.getInputValue('totalKwhFactura'));

        let valid = true;
        if (isNaN(monto)) {
            CalcUIService.showFieldError('montoFactura', 'Ingresá un monto válido mayor a cero');
            valid = false;
        }
        if (isNaN(totalKwh)) {
            CalcUIService.showFieldError('totalKwhFactura', 'Ingresá los kWh totales de la factura (mayor a cero)');
            valid = false;
        }
        if (!valid) return;

        CalcUIService.setButtonProcessing('btnCalcularPrecio', true);
        const precio = ElectricityCalculator.calcularPrecioKwh(monto, totalKwh);
        calcState.setPrecioKwh(precio);
        CalcUIService.setReadonlyField('precioKwh', CurrencyFormatter.format(precio));
        CalcUIService.setButtonProcessing('btnCalcularPrecio', false);
        CalcUIService.showStep2();
        await CalcularPagoController.loadResidents();
    }

    static async loadResidents() {
        CalcUIService.setResidentesLoading(true);
        CalcUIService.hideResidentesError();
        CalcUIService.clearSelectedResident();
        calcState.clearSelectedResident();

        try {
            const records = await CalcApiService.fetchCalculos();
            calcState.setResidents(records);
            CalcularPagoController.renderResidentesForCurrentMonth();
        } catch (err) {
            console.error('Error al cargar residentes:', err);
            const msg = err.message === 'No autenticado'
                ? 'No estás autenticado. Por favor, iniciá sesión nuevamente.'
                : 'No se pudo cargar la lista de residentes. Verificá tu conexión e intentá de nuevo.';
            CalcUIService.showResidentesError(msg);
        } finally {
            CalcUIService.setResidentesLoading(false);
        }
    }

    static renderResidentesForCurrentMonth() {
        const residents = ResidentLogic.getResidentsForMonth(
            calcState.getResidents(),
            calcState.currentMonth,
            calcState.currentYear
        );
        CalcUIService.renderResidentesMonthLabel(calcState.getMonthLabel());
        CalcUIService.renderResidentTable(residents);
        CalcUIService.clearSelectedResident();
        calcState.clearSelectedResident();
    }

    static handleCambiarMesResidentes(delta) {
        calcState.changeMonth(delta);
        CalcularPagoController.renderResidentesForCurrentMonth();
    }

    static handleSeleccionarResidente(habitacion) {
        if (!calcState.hasPrecioKwh()) return;
        const residents = ResidentLogic.getResidentsForMonth(
            calcState.getResidents(),
            calcState.currentMonth,
            calcState.currentYear
        );
        const resident = ResidentLogic.findByHabitacion(residents, habitacion);
        if (!resident) return;

        calcState.setSelectedResident(resident);
        const total = ElectricityCalculator.calcularTotalAPagar(
            resident.consumoCalculado,
            calcState.getPrecioKwh()
        );
        CalcUIService.highlightSelectedRow(habitacion);
        CalcUIService.renderSelectedResident(resident, total, calcState.getPrecioKwh());
    }
}

// ─── Global bridges ───────────────────────────────────────────────────────────

function calcularPrecioKwh() { CalcularPagoController.handleCalcularPrecioKwh(); }
function seleccionarResidente(habitacion) { CalcularPagoController.handleSeleccionarResidente(habitacion); }
function cambiarMesResidentes(delta) { CalcularPagoController.handleCambiarMesResidentes(delta); }

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    CalcularPagoController.init();
});
