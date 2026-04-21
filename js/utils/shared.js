// ─── Sanitización HTML ────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const Sanitizer = {
    escapeHtml: text => String(text).replace(/[&<>"']/g, c => HTML_ESCAPE_MAP[c])
};

// ─── Formateo monetario (formato argentino: 15.000,50) ───────────────────────

const CurrencyFormatter = {
    format(amount) {
        const [int, dec] = Number(amount).toFixed(2).split('.');
        return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
    },
    normalize(value) {
        return String(value).trim().replace(/\./g, '').replace(',', '.');
    }
};

// ─── Formateo de fechas ───────────────────────────────────────────────────────

const DateFormatter = {
    toLocalDate: (iso, locale = 'es-AR') =>
        new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    monthLabel: (year, month) =>
        new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
};

// ─── Validación ───────────────────────────────────────────────────────────────

const Validators = {
    isEmail: email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    isFileSize: (file, maxBytes) => file.size <= maxBytes,
    isImageType: file => file.type.startsWith('image/')
};

// ─── Cliente API centralizado ─────────────────────────────────────────────────

const APIClient = {
    get authHeaders() {
        const token = sessionStorage.getItem(CONFIG.STORAGE_KEY);
        return token ? { Authorization: `Bearer ${token}` } : {};
    },

    async request(path, options = {}) {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
                ...options,
                signal: controller.signal
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } finally {
            clearTimeout(tid);
        }
    },

    async getJSON(path) {
        const res = await APIClient.request(path, { headers: APIClient.authHeaders });
        return res.json();
    },

    async postForm(path, formData) {
        return APIClient.request(path, {
            method: 'POST',
            headers: APIClient.authHeaders,
            body: formData
        });
    }
};

// ─── Manejo de errores de formulario ─────────────────────────────────────────

const FormValidator = {
    showError(fieldId, message) {
        const group = document.getElementById(fieldId)?.closest('.form-group');
        if (!group) return;
        group.classList.add('error');
        const err = group.querySelector('.error-message');
        if (err && message) err.textContent = message;
    },
    clearError(fieldId) {
        document.getElementById(fieldId)?.closest('.form-group')?.classList.remove('error');
    },
    clearAll(fieldIds) {
        fieldIds.forEach(id => FormValidator.clearError(id));
    }
};

// ─── Upload de imágenes ───────────────────────────────────────────────────────

const FileUploadHandler = {
    validate(file) {
        if (!Validators.isImageType(file)) return 'El archivo debe ser una imagen.';
        if (!Validators.isFileSize(file, CONFIG.MAX_FILE_SIZE)) return 'El archivo supera el límite permitido (5 MB).';
        return null;
    },

    preview(file, containerEl) {
        const reader = new FileReader();
        reader.onload = e => {
            containerEl.innerHTML =
                `<img src="${e.target.result}" alt="Vista previa" style="max-width:100%;border-radius:8px;margin-top:8px;">`;
        };
        reader.readAsDataURL(file);
    }
};

// ─── Notificaciones ───────────────────────────────────────────────────────────

const Notifier = {
    show(message, type = 'success', durationMs = 5000) {
        document.querySelector('.app-notification')?.remove();
        const div = document.createElement('div');
        div.className = `app-notification app-notification--${type}`;
        div.textContent = message;
        document.body.appendChild(div);
        if (durationMs > 0) setTimeout(() => div.remove(), durationMs);
        return div;
    },
    success: msg => Notifier.show(msg, 'success'),
    error: msg => Notifier.show(msg, 'error', 0)
};
