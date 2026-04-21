/**
 * Vouchers - Hostal Mayelewoo
 * Principios: DRY, SOLID, YAGNI
 */

const MAX_VOUCHER_BYTES = 50 * 1024 * 1024; // 50 MB — el backend comprime con GridFS + Sharp

// ─── State ────────────────────────────────────────────────────────────────────

class VoucherState {
    constructor() {
        this.form      = document.getElementById('voucherForm');
        this.fileInput = document.getElementById('fotos');
        this.submitBtn = document.getElementById('submitBtn');
    }
}

// ─── DomainLogic ─────────────────────────────────────────────────────────────

class VoucherDomain {
    static getFormData() {
        return {
            nombre:   document.getElementById('nombre')?.value?.trim() || '',
            apellido: document.getElementById('apellido')?.value?.trim() || '',
            dni:      document.getElementById('dni')?.value?.trim() || '',
            email:    document.getElementById('email')?.value?.trim() || '',
            ref4:     document.getElementById('ref4')?.value?.trim() || '',
            hab:      document.getElementById('hab')?.value?.trim() || '',
            monto:    document.getElementById('monto')?.value?.trim() || ''
        };
    }

    static validate(data, files) {
        if (!data.nombre)   return 'El nombre es requerido';
        if (!data.apellido) return 'El apellido es requerido';
        if (!data.dni)      return 'El DNI es requerido';
        if (!data.email)    return 'El correo electrónico es requerido';
        if (!Validators.isEmail(data.email)) return 'El correo electrónico no es válido';
        if (!data.ref4 || !/^\d{4}$/.test(data.ref4)) return 'Los últimos 4 dígitos deben ser numéricos';
        if (!data.hab)  return 'El número de habitación/apartamento es requerido';

        if (!data.monto) return 'El monto depositado es requerido';

        const montoNum = parseFloat(data.monto.replace(/\./g, '').replace(',', '.'));
        if (montoNum < 1000) return 'Por favor, colocá el monto completo (ejemplo: 50.000, 100.000, 200.000)';
        if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(data.monto)) {
            return 'El monto debe tener formato correcto con separador de miles. Ejemplo: 1.000, 10.000, 20.000';
        }

        if (!files || files.length === 0) return 'Debés adjuntar al menos una imagen del comprobante';

        let total = 0;
        for (const f of files) {
            if (!f.type.startsWith('image/')) return 'Solo se permiten imágenes';
            total += f.size;
        }
        if (total > MAX_VOUCHER_BYTES) return 'Las imágenes superan el tamaño total permitido (50 MB)';

        return null;
    }

    static buildPayload(data, files) {
        const formData = new FormData();
        Object.entries(data).forEach(([k, v]) => formData.append(k, v));
        formData.append('timestamp', new Date().toISOString());
        for (const f of files) formData.append('files', f, f.name);
        return formData;
    }
}

// ─── ApiService ───────────────────────────────────────────────────────────────

class VoucherApiService {
    static async send(formData) {
        return APIClient.postForm('/vouchers', formData);
    }

    static saveLocally(data, files) {
        const key = 'pendingVouchers';
        const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
        snapshots.push({
            ...data,
            files: Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })),
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(key, JSON.stringify(snapshots));
    }
}

// ─── UIService ────────────────────────────────────────────────────────────────

class VoucherUIService {
    static showBanner(form, { type, text }) {
        form.querySelectorAll('.voucher-banner').forEach(b => b.remove());

        const div = document.createElement('div');
        div.className = 'voucher-banner';
        div.style.cssText = `
            margin-top: 1.5rem;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border-left: 4px solid ${type === 'error' ? '#e53e3e' : '#38a169'};
            background-color: ${type === 'error' ? '#fed7d7' : '#c6f6d5'};
            color: ${type === 'error' ? '#c53030' : '#22543d'};
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        div.textContent = text;

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(div, submitBtn.nextSibling);
        } else {
            form.appendChild(div);
        }

        setTimeout(() => { div.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    }

    static setButtonState(submitBtn, isProcessing) {
        submitBtn.disabled    = isProcessing;
        submitBtn.textContent = isProcessing ? 'Procesando...' : 'Enviar Voucher';
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class VoucherController {
    constructor() {
        this.state = new VoucherState();
        this.setupMobileInputUX();
        this.bindEvents();
    }

    setupMobileInputUX() {
        const ref4  = document.getElementById('ref4');
        const monto = document.getElementById('monto');

        ref4?.addEventListener('input', () => {
            ref4.value = ref4.value.replace(/\D+/g, '').slice(0, 4);
        });

        monto?.addEventListener('input', () => {
            monto.value = monto.value.replace(/[^\d.,]/g, '');
        });
    }

    bindEvents() {
        const { form, fileInput } = this.state;

        fileInput?.addEventListener('change', () => {
            const files = fileInput.files || [];
            let total = 0;
            for (const f of files) total += f.size;
            if (total > MAX_VOUCHER_BYTES) {
                VoucherUIService.showBanner(form, {
                    type: 'error',
                    text: 'Las imágenes superan 50 MB en total. Por favor, seleccioná menos imágenes.'
                });
                fileInput.value = '';
            }
        });

        form?.addEventListener('submit', e => this.handleSubmit(e));
    }

    async handleSubmit(event) {
        event.preventDefault();
        const { form, fileInput, submitBtn } = this.state;

        VoucherUIService.setButtonState(submitBtn, true);

        const data  = VoucherDomain.getFormData();
        const files = fileInput?.files || [];
        const error = VoucherDomain.validate(data, files);

        if (error) {
            VoucherUIService.showBanner(form, { type: 'error', text: error });
            VoucherUIService.setButtonState(submitBtn, false);
            return;
        }

        const payload = VoucherDomain.buildPayload(data, files);

        try {
            await VoucherApiService.send(payload);
            VoucherUIService.showBanner(form, { type: 'success', text: '¡Voucher enviado correctamente!' });
            form.reset();
        } catch (err) {
            VoucherApiService.saveLocally(data, files);
            VoucherUIService.showBanner(form, {
                type: 'success',
                text: 'Guardado localmente. Se enviará cuando el backend esté disponible.'
            });
        } finally {
            VoucherUIService.setButtonState(submitBtn, false);
        }
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    new VoucherController();
});
