/**
 * Contadores de Luz - Hostal Mayelewoo
 * Principios: DRY, SOLID, YAGNI
 */

// ─── State ────────────────────────────────────────────────────────────────────

class ContadorState {
    constructor() {
        this.form       = document.getElementById('contadorForm');
        this.submitBtn  = document.getElementById('submitBtn');
        this.fotoInput  = document.getElementById('fotoMedidor');
        this.timestamp  = document.getElementById('timestamp');
    }
}

// ─── DomainLogic ─────────────────────────────────────────────────────────────

class ContadorDomain {
    static validate(formEl) {
        const required = [
            { id: 'nombre',          name: 'Nombre' },
            { id: 'apellido',        name: 'Apellido' },
            { id: 'dni',             name: 'DNI' },
            { id: 'numeroMedicion',  name: 'Número de medición' },
            { id: 'nroApartamento',  name: 'Número de apartamento' },
            { id: 'fotoMedidor',     name: 'Foto del medidor' }
        ];

        for (const field of required) {
            const el = document.getElementById(field.id);
            if (!el.value.trim()) {
                return { ok: false, message: `El campo ${field.name} es requerido.`, focusId: field.id };
            }
        }

        const dni = document.getElementById('dni').value;
        if (dni.length < 7 || dni.length > 8) {
            return { ok: false, message: 'El DNI debe tener entre 7 y 8 dígitos.', focusId: 'dni' };
        }

        const medicion = document.getElementById('numeroMedicion').value;
        if (!/^\d+(\.\d+)?$/.test(medicion)) {
            return { ok: false, message: 'El número de medición debe ser un valor numérico válido.', focusId: 'numeroMedicion' };
        }

        return { ok: true };
    }

    static buildFormData() {
        const formData = new FormData();
        formData.append('dni',            document.getElementById('dni').value.trim());
        formData.append('nombre',         document.getElementById('nombre').value.trim());
        formData.append('apellidos',      document.getElementById('apellido').value.trim());
        formData.append('nroApartamento', document.getElementById('nroApartamento').value.trim());
        formData.append('numeroMedicion', document.getElementById('numeroMedicion').value.trim());
        formData.append('fechaLectura',   new Date().toISOString());
        formData.append('timestamp',      new Date().toISOString());

        const observaciones = document.getElementById('observaciones');
        if (observaciones?.value.trim()) {
            formData.append('observaciones', observaciones.value.trim());
        }

        const fotoInput = document.getElementById('fotoMedidor');
        if (fotoInput.files?.[0]) {
            formData.append('fotoMedidor', fotoInput.files[0]);
        }

        return formData;
    }
}

// ─── ApiService ───────────────────────────────────────────────────────────────

class ContadorApiService {
    static async submit(formData) {
        return APIClient.postForm('/contadores', formData);
    }
}

// ─── UIService ────────────────────────────────────────────────────────────────

class ContadorUIService {
    static setLoading(submitBtn, loading) {
        submitBtn.disabled    = loading;
        submitBtn.textContent = loading ? 'Enviando...' : 'Enviar Medición';
        submitBtn.style.opacity = loading ? '0.7' : '1';
    }

    static showMessage(submitBtn, message, type) {
        document.querySelector('.message-notification')?.remove();

        const div = document.createElement('div');
        div.className = `app-notification app-notification--${type === 'error' ? 'error' : 'success'}`;
        div.textContent = message;
        submitBtn.parentNode.insertBefore(div, submitBtn.nextSibling);

        setTimeout(() => { div.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
        setTimeout(() => { div.remove(); }, 5000);
    }

    static showPhotoPreview(file, fotoInput) {
        let preview = document.getElementById('imagePreview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'imagePreview';
            preview.className = 'image-preview';
            fotoInput.parentNode.appendChild(preview);
        }
        FileUploadHandler.preview(file, preview);
    }

    static resetForm(form, fotoInput, timestamp) {
        form.reset();
        timestamp.value = new Date().toISOString();
        document.getElementById('imagePreview')?.remove();
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class ContadorController {
    constructor() {
        this.state = new ContadorState();
        this.state.timestamp.value = new Date().toISOString();
        this.setupInputValidations();
        this.bindEvents();
    }

    setupInputValidations() {
        const dniInput = document.getElementById('dni');
        dniInput.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
        });

        const medicionInput = document.getElementById('numeroMedicion');
        medicionInput.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/[^0-9.]/g, '');
            const parts = e.target.value.split('.');
            if (parts.length > 2) {
                e.target.value = parts[0] + '.' + parts.slice(1).join('');
            }
        });
    }

    bindEvents() {
        this.state.form.addEventListener('submit', e => this.handleSubmit(e));
        this.state.fotoInput.addEventListener('change', e => this.handleFileUpload(e));
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const error = FileUploadHandler.validate(file);
        if (error) {
            ContadorUIService.showMessage(this.state.submitBtn, error, 'error');
            event.target.value = '';
            return;
        }

        ContadorUIService.showPhotoPreview(file, this.state.fotoInput);
    }

    async handleSubmit(event) {
        event.preventDefault();

        const validation = ContadorDomain.validate(this.state.form);
        if (!validation.ok) {
            ContadorUIService.showMessage(this.state.submitBtn, validation.message, 'error');
            document.getElementById(validation.focusId)?.focus();
            return;
        }

        ContadorUIService.setLoading(this.state.submitBtn, true);

        try {
            const formData = ContadorDomain.buildFormData();
            await ContadorApiService.submit(formData);
            ContadorUIService.showMessage(this.state.submitBtn, '¡Medición registrada exitosamente!', 'success');
            ContadorUIService.resetForm(this.state.form, this.state.fotoInput, this.state.timestamp);
        } catch (error) {
            console.error('Error al enviar medición:', error);
            ContadorUIService.showMessage(this.state.submitBtn, 'Error al enviar la medición. Por favor intentá nuevamente.', 'error');
        } finally {
            ContadorUIService.setLoading(this.state.submitBtn, false);
        }
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    new ContadorController();
});
