/**
 * Calcular Pago Electricidad - Hostal Mayelewoo
 * Calculadora del costo eléctrico por residente (solo lado cliente, sin llamadas API)
 * Principios: DRY, SOLID, YAGNI
 */

// ============================================
// UTILIDADES DE ENTRADA NUMÉRICA
// ============================================
class NumberInputService {
    /** Normaliza separador decimal: acepta ',' o '.' */
    static normalize(value) {
        return (value || '').trim().replace(',', '.');
    }

    /** Parsea un valor positivo (campos kWh). Devuelve NaN si inválido o <= 0. */
    static parsePositive(value) {
        const n = parseFloat(NumberInputService.normalize(value));
        return isFinite(n) && n > 0 ? n : NaN;
    }

    /**
     * Parsea el campo montoFactura con formato argentino de miles (puntos como separador).
     * Ej: "200.000,50" → 200000.50
     */
    static parseMontoFactura(value) {
        const normalized = (value || '').trim().replace(/\./g, '').replace(',', '.');
        const n = parseFloat(normalized);
        return isFinite(n) && n > 0 ? n : NaN;
    }

    /**
     * Formatea el entero de un monto con puntos de miles mientras el usuario escribe.
     * Ej: "200000,50" → "200.000,50"
     */
    static formatMontoInput(value) {
        // Solo dígitos y una coma (decimal)
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

// ============================================
// ESTADO DE LA CALCULADORA (Single Source of Truth)
// ============================================
class CalcState {
    constructor() {
        /** @type {number|null} */
        this.precioKwh = null;
    }

    setPrecioKwh(value) { this.precioKwh = value; }
    getPrecioKwh()      { return this.precioKwh; }
    hasPrecioKwh()      { return this.precioKwh !== null && isFinite(this.precioKwh); }
    reset()             { this.precioKwh = null; }
}

const calcState = new CalcState();

// ============================================
// LÓGICA DE NEGOCIO (pura, sin acceso al DOM)
// ============================================
class ElectricityCalculator {
    /** precio_kWh = monto_factura / total_kWh_factura */
    static calcularPrecioKwh(montoFactura, totalKwhFactura) {
        return montoFactura / totalKwhFactura;
    }

    /** total_a_pagar = consumo_kWh × precio_kWh */
    static calcularTotalAPagar(consumoKwh, precioKwh) {
        return consumoKwh * precioKwh;
    }
}

// ============================================
// SERVICIO DE UI (responsabilidad única: DOM)
// ============================================
class UIService {
    static getInputValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
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
        const input = document.getElementById(inputId);
        if (!input) return;
        const group = input.closest('.form-group');
        if (!group) return;
        group.classList.add('error');
        const errEl = group.querySelector('.error-message');
        if (errEl && message) errEl.textContent = message;
    }

    static clearFieldError(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const group = input.closest('.form-group');
        if (group) group.classList.remove('error');
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

    /**
     * Formatea un número con convención argentina: miles con '.', decimal con ','
     * Ej: 17614.333 → "17.614,33"
     */
    static formatMoney(amount) {
        const [intPart, decPart] = amount.toFixed(2).split('.');
        const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${withThousands},${decPart}`;
    }
}

// ============================================
// CONTROLADOR PRINCIPAL
// ============================================
class CalcularPagoController {
    static init() {
        requireAuth();
        this.setupDecimalInputs();
    }

    /** Configura los inputs numéricos: formato de miles para montoFactura, decimal simple para el resto */
    static setupDecimalInputs() {
        // montoFactura: formato argentino con puntos de miles (200.000,50)
        const montoInput = document.getElementById('montoFactura');
        if (montoInput) {
            montoInput.addEventListener('input', (e) => {
                const cursor = e.target.selectionStart;
                const prevLen = e.target.value.length;
                e.target.value = NumberInputService.formatMontoInput(e.target.value);
                // Ajusta cursor considerando los puntos insertados/eliminados
                const diff = e.target.value.length - prevLen;
                e.target.setSelectionRange(cursor + diff, cursor + diff);
            });
        }

        // totalKwhFactura y consumoKwh: solo un separador decimal (. o ,)
        ['totalKwhFactura', 'consumoKwh'].forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('input', (e) => {
                let v = e.target.value.replace(/[^0-9.,]/g, '');
                const separators = v.match(/[.,]/g);
                if (separators && separators.length > 1) {
                    const firstIdx = v.search(/[.,]/);
                    v = v.slice(0, firstIdx + 1) + v.slice(firstIdx + 1).replace(/[.,]/g, '');
                }
                e.target.value = v;
            });
        });
    }

    /** "Calcular Precio kWh": valida monto + totalKwh, calcula y muestra precio_kWh */
    static handleCalcularPrecioKwh() {
        UIService.clearAllErrors();
        UIService.clearReadonlyField('precioKwh');
        calcState.reset();

        const monto   = NumberInputService.parseMontoFactura(UIService.getInputValue('montoFactura'));
        const totalKwh = NumberInputService.parsePositive(UIService.getInputValue('totalKwhFactura'));

        let valid = true;
        if (isNaN(monto)) {
            UIService.showFieldError('montoFactura', 'Ingresá un monto válido mayor a cero');
            valid = false;
        }
        if (isNaN(totalKwh)) {
            UIService.showFieldError('totalKwhFactura', 'Ingresá los kWh totales de la factura (mayor a cero)');
            valid = false;
        }
        if (!valid) return;

        UIService.setButtonProcessing('btnCalcularPrecio', true);

        const precio = ElectricityCalculator.calcularPrecioKwh(monto, totalKwh);
        calcState.setPrecioKwh(precio);

        UIService.setReadonlyField('precioKwh', UIService.formatMoney(precio));
        UIService.setButtonProcessing('btnCalcularPrecio', false);
    }

    /** "Calcular Total a Pagar": requiere precio_kWh previo, valida consumo y muestra total */
    static handleCalcularTotal() {
        UIService.clearFieldError('consumoKwh');
        UIService.clearReadonlyField('totalAPagar');

        if (!calcState.hasPrecioKwh()) {
            alert('Primero calculá el Precio kWh ingresando el monto y los kWh totales de la factura.');
            return;
        }

        const consumo = NumberInputService.parsePositive(UIService.getInputValue('consumoKwh'));
        if (isNaN(consumo)) {
            UIService.showFieldError('consumoKwh', 'Ingresá el consumo del residente (mayor a cero)');
            return;
        }

        UIService.setButtonProcessing('btnCalcularTotal', true);

        const total = ElectricityCalculator.calcularTotalAPagar(consumo, calcState.getPrecioKwh());
        UIService.setReadonlyField('totalAPagar', UIService.formatMoney(total));

        UIService.setButtonProcessing('btnCalcularTotal', false);
    }
}

// ============================================
// FUNCIONES GLOBALES (interfaz para onclick en HTML)
// ============================================
function calcularPrecioKwh() {
    CalcularPagoController.handleCalcularPrecioKwh();
}

function calcularTotal() {
    CalcularPagoController.handleCalcularTotal();
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    CalcularPagoController.init();
});
