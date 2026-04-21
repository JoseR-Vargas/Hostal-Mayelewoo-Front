/**
 * Calculadora de Medidor - Hostal Mayelewoo
 * Principios: DRY, SOLID, YAGNI
 */

// ─── State ────────────────────────────────────────────────────────────────────

class MeterState {
    constructor() {
        this.form             = document.getElementById('calculatorForm');
        this.submitBtn        = document.getElementById('submitBtn');
        this.modal            = document.getElementById('resultModal');
        this.calculationPreview = document.getElementById('calculationPreview');
    }

    loadSavedPersonalData() {
        try {
            const last = JSON.parse(localStorage.getItem('lastMeterSubmission') || 'null');
            if (!last) return;
            if (last.nombre)    document.getElementById('nombre').value    = last.nombre;
            if (last.apellido)  document.getElementById('apellido').value  = last.apellido;
            if (last.dni)       document.getElementById('dni').value       = last.dni;
            if (last.habitacion) document.getElementById('habitacion').value = last.habitacion;
        } catch (_) { /* ignore corrupt localStorage */ }
    }

    savePersonalData(data) {
        try {
            localStorage.setItem('lastMeterSubmission', JSON.stringify({
                nombre: data.nombre, apellido: data.apellido,
                dni: data.dni, habitacion: data.habitacion
            }));
        } catch (_) { /* ignore quota errors */ }
    }
}

// ─── MeterDomain ─────────────────────────────────────────────────────────────

class MeterDomain {
    static normalizeMeasurement(value) {
        if (!value) return value;
        value = value.trim();
        if (value.includes('.') || value.includes(',')) return value.replace(',', '.');
        if (/^\d+$/.test(value) && value.length > 1) {
            return value.slice(0, -1) + '.' + value.slice(-1);
        }
        return value;
    }

    static validateFormat(value) {
        return /^\d+[.,]\d+$/.test((value || '').trim());
    }

    static getFormValues() {
        const anteriorRaw = MeterDomain.normalizeMeasurement(document.getElementById('medicionAnterior').value);
        const actualRaw   = MeterDomain.normalizeMeasurement(document.getElementById('medicionActual').value);
        const anterior = parseFloat(anteriorRaw);
        const actual   = parseFloat(actualRaw);
        const consumo  = actual - anterior;

        return {
            nombre:           document.getElementById('nombre').value.trim(),
            apellido:         document.getElementById('apellido').value.trim(),
            dni:              document.getElementById('dni').value,
            habitacion:       document.getElementById('habitacion').value.trim(),
            medicionAnterior: anterior,
            medicionActual:   actual,
            consumoCalculado: consumo,
            montoTotal:       consumo * CONFIG.PRICE_PER_KWH,
            precioKWH:        CONFIG.PRICE_PER_KWH,
            fotoAnterior:     document.getElementById('fotoAnterior').files[0],
            fotoActual:       document.getElementById('fotoActual').files[0],
            fechaRegistro:    new Date().toISOString(),
            timestamp:        Date.now()
        };
    }

    static validate() {
        const errors = [];
        const required = ['nombre', 'apellido', 'dni', 'habitacion', 'medicionAnterior', 'medicionActual'];

        for (const id of required) {
            const value = document.getElementById(id).value.trim();
            if (!value) { errors.push({ id, msg: 'Este campo es requerido' }); continue; }
            if (id === 'medicionAnterior' || id === 'medicionActual') {
                if (!MeterDomain.validateFormat(value)) {
                    errors.push({ id, msg: 'Formato requerido: número con punto o coma decimal (Ej: 408.7 o 0035,3)' });
                }
            }
        }

        const dni = document.getElementById('dni').value;
        if (dni && (dni.length < 7 || dni.length > 8)) {
            errors.push({ id: 'dni', msg: 'Ingresá un DNI válido (7-8 dígitos)' });
        }

        const anteriorVal = MeterDomain.normalizeMeasurement(document.getElementById('medicionAnterior').value);
        const actualVal   = MeterDomain.normalizeMeasurement(document.getElementById('medicionActual').value);
        const anterior = parseFloat(anteriorVal) || 0;
        const actual   = parseFloat(actualVal) || 0;
        if (actual > 0 && anterior > 0 && actual <= anterior) {
            errors.push({ id: 'medicionActual', msg: 'La medición actual debe ser mayor a la anterior' });
        }

        if (!document.getElementById('fotoAnterior').files[0]) {
            errors.push({ id: 'fotoAnteriorGroup', msg: 'Debe cargar la foto del medidor del mes anterior', isPhotoGroup: true });
        }
        if (!document.getElementById('fotoActual').files[0]) {
            errors.push({ id: 'fotoActualGroup', msg: 'Debe cargar la foto del medidor del mes actual', isPhotoGroup: true });
        }

        return errors;
    }
}

// ─── MeterApiService ──────────────────────────────────────────────────────────

class MeterApiService {
    static async submit(data) {
        const formData = new FormData();
        const fields = ['nombre', 'apellido', 'dni', 'habitacion', 'fechaRegistro'];
        fields.forEach(k => formData.append(k, data[k]));
        ['medicionAnterior', 'medicionActual', 'consumoCalculado', 'montoTotal', 'precioKWH', 'timestamp']
            .forEach(k => formData.append(k, String(data[k])));
        if (data.fotoAnterior) formData.append('fotoAnterior', data.fotoAnterior);
        if (data.fotoActual)   formData.append('fotoActual', data.fotoActual);

        const res = await APIClient.postForm('/calculos-medidor', formData);
        return res.json();
    }
}

// ─── MeterUIService ───────────────────────────────────────────────────────────

class MeterUIService {
    static showFieldError(fieldId, message) {
        const el = document.getElementById(fieldId);
        const group = el?.closest('.form-group') || el;
        if (!group) return;
        group.classList.add('error');
        const errEl = group.querySelector('.error-message');
        if (errEl) errEl.textContent = message;
    }

    static showPhotoGroupError(groupId, message) {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.classList.add('error');
        let errEl = group.querySelector('.error-message');
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'error-message';
            group.appendChild(errEl);
        }
        errEl.textContent = message;
        errEl.style.display = 'block';
    }

    static clearAllErrors() {
        document.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
    }

    static handlePhotoUpload(file, previewId, groupId) {
        const error = FileUploadHandler.validate(file);
        if (error) {
            MeterUIService.showPhotoGroupError(groupId, error);
            return false;
        }

        const preview = document.getElementById(previewId);
        const group   = document.getElementById(groupId);
        const reader  = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            group.classList.add('has-photo');
            group.classList.remove('error');
            const errEl = group.querySelector('.error-message');
            if (errEl) errEl.style.display = 'none';
        };
        reader.readAsDataURL(file);
        return true;
    }

    static updatePreview(calculationPreview) {
        const anteriorVal = MeterDomain.normalizeMeasurement(document.getElementById('medicionAnterior').value);
        const actualVal   = MeterDomain.normalizeMeasurement(document.getElementById('medicionActual').value);
        const anterior = parseFloat(anteriorVal) || 0;
        const actual   = parseFloat(actualVal) || 0;

        if (anterior > 0 && actual > anterior) {
            const consumo = actual - anterior;
            document.getElementById('consumoCalculado').textContent = `${consumo.toFixed(1)} kWh`;
            calculationPreview.classList.add('show');
        } else {
            calculationPreview.classList.remove('show');
        }
    }

    static setSubmitting(submitBtn, isSubmitting) {
        submitBtn.classList.toggle('processing', isSubmitting);
        submitBtn.textContent = isSubmitting ? 'Procesando...' : 'Enviar';
        submitBtn.disabled    = isSubmitting;
    }

    static showSuccessModal(modal, consumo) {
        document.getElementById('modalAmount').textContent = `${consumo.toFixed(1)} kWh`;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    static closeModal(modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    static resetForm(form, calculationPreview) {
        form.reset();
        calculationPreview.classList.remove('show');

        ['fotoAnteriorPreview', 'fotoActualPreview'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        ['fotoAnteriorGroup', 'fotoActualGroup'].forEach(id => {
            document.getElementById(id).classList.remove('has-photo');
        });

        document.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class MeterController {
    constructor() {
        this.state = new MeterState();
        this.state.loadSavedPersonalData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const { form, calculationPreview } = this.state;

        form.addEventListener('submit', e => this.handleSubmit(e));

        ['medicionAnterior', 'medicionActual'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', e => {
                let v = e.target.value.replace(/[^0-9.,]/g, '');
                const seps = v.match(/[.,]/g);
                if (seps && seps.length > 1) {
                    const first = v.search(/[.,]/);
                    v = v.slice(0, first + 1) + v.slice(first + 1).replace(/[.,]/g, '');
                }
                e.target.value = v;
                MeterUIService.updatePreview(calculationPreview);
            });
            input.addEventListener('blur', e => {
                const value = e.target.value;
                const group = input.closest('.form-group');
                if (value) {
                    if (!MeterDomain.validateFormat(value)) {
                        MeterUIService.showFieldError(id, 'Formato requerido: número con punto o coma decimal (Ej: 408.7 o 0035,3)');
                    } else {
                        e.target.value = MeterDomain.normalizeMeasurement(value);
                        group.classList.remove('error');
                        MeterUIService.updatePreview(calculationPreview);
                    }
                } else {
                    group.classList.remove('error');
                }
            });
        });

        document.getElementById('medicionActual').addEventListener('blur', () => {
            MeterUIService.updatePreview(calculationPreview);
        });

        document.getElementById('dni').addEventListener('input', e => {
            const v = e.target.value;
            const group = e.target.closest('.form-group');
            if (v && (v.length < 7 || v.length > 8 || isNaN(v))) {
                MeterUIService.showFieldError('dni', 'Ingresá un DNI válido (7-8 dígitos)');
            } else {
                group.classList.remove('error');
            }
        });

        document.getElementById('fotoAnterior').addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) MeterUIService.handlePhotoUpload(file, 'fotoAnteriorPreview', 'fotoAnteriorGroup');
        });
        document.getElementById('fotoActual').addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) MeterUIService.handlePhotoUpload(file, 'fotoActualPreview', 'fotoActualGroup');
        });
    }

    async handleSubmit(event) {
        event.preventDefault();

        MeterUIService.clearAllErrors();

        const errors = MeterDomain.validate();
        if (errors.length) {
            errors.forEach(({ id, msg, isPhotoGroup }) => {
                if (isPhotoGroup) MeterUIService.showPhotoGroupError(id, msg);
                else MeterUIService.showFieldError(id, msg);
            });
            return;
        }

        const { submitBtn, modal } = this.state;
        MeterUIService.setSubmitting(submitBtn, true);

        try {
            const data = MeterDomain.getFormValues();
            const result = await MeterApiService.submit(data);

            if (result.success) {
                this.state.savePersonalData(data);
                MeterUIService.showSuccessModal(modal, data.consumoCalculado);
                MeterUIService.resetForm(this.state.form, this.state.calculationPreview);
            } else {
                throw new Error(result.message || 'Error al procesar los datos');
            }
        } catch (error) {
            console.error('Error al enviar formulario:', error);
            Notifier.error('Error al procesar los datos. Por favor intentá nuevamente.');
        } finally {
            MeterUIService.setSubmitting(submitBtn, false);
        }
    }

    openCamera(inputId) {
        const input = document.getElementById(inputId);
        input.setAttribute('capture', 'environment');
        input.click();
    }

    openGallery(inputId) {
        const input = document.getElementById(inputId);
        input.removeAttribute('capture');
        input.click();
    }

    closeModal() {
        MeterUIService.closeModal(this.state.modal);
    }
}

// ─── Global bridges ───────────────────────────────────────────────────────────

function openCamera(inputId)  { calculator.openCamera(inputId); }
function openGallery(inputId) { calculator.openGallery(inputId); }
function closeModal()         { calculator.closeModal(); }

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new MeterController();
});
