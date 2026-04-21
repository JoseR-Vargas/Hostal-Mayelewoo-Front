if (!requireAuth()) throw new Error('Acceso no autorizado');

// ─── State ────────────────────────────────────────────────────────────────────

class DashboardState {
    constructor() {
        this.allVouchers = [];
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
    }

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

    getFilteredVouchers() {
        return this.allVouchers.filter(v => {
            const dateStr = v.timestamp || v.createdAt || v.fechaHora;
            if (!dateStr) return false;
            const fecha = new Date(dateStr);
            return fecha.getMonth() === this.currentMonth && fecha.getFullYear() === this.currentYear;
        });
    }
}

const dashboardState = new DashboardState();

// ─── ApiService ───────────────────────────────────────────────────────────────

class DashboardApiService {
    static async fetchVouchers() {
        try {
            const res = await APIClient.request('/vouchers');
            const response = await res.json();
            return response.data || response;
        } catch (error) {
            console.error('Fetch error:', error);
            return JSON.parse(localStorage.getItem('pendingVouchers') || '[]');
        }
    }
}

// ─── UIService ────────────────────────────────────────────────────────────────

class DashboardUIService {
    static renderMetrics(vouchers) {
        const metrics = document.getElementById('metrics');
        if (!metrics) return;

        const today = new Date().toISOString().slice(0, 10);
        const todayCount = vouchers.filter(v =>
            (v.timestamp || v.createdAt || '').slice(0, 10) === today
        ).length;

        metrics.innerHTML = '';
        metrics.appendChild(DashboardUIService.metricCard('Total Comprobantes', vouchers.length));
        metrics.appendChild(DashboardUIService.metricCard('Cargados Hoy', todayCount));
    }

    static metricCard(title, value) {
        const div = document.createElement('div');
        div.className = 'metric-card';
        const t = document.createElement('div');
        t.className = 'metric-title';
        t.textContent = title;
        const v = document.createElement('div');
        v.className = 'metric-value';
        v.textContent = String(value);
        div.appendChild(t);
        div.appendChild(v);
        return div;
    }

    static renderTable(vouchers) {
        const tbody = document.getElementById('voucherTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const apiBase = CONFIG.API_BASE_URL.replace(/\/api$/, '');

        for (const v of vouchers) {
            // Normalizar archivos: backend puede devolver fotos como array de strings
            if ((!v.files || !v.files.length) && Array.isArray(v.fotos) && v.fotos.length) {
                v.files = v.fotos.map(f => ({
                    name: f,
                    url: `${apiBase}/uploads/vouchers/${f}`
                }));
            }

            const tr = document.createElement('tr');
            DashboardUIService.appendCell(tr, `${v.nombre || ''} ${v.apellido || ''}`.trim() || '—', 'Nombre');
            DashboardUIService.appendCell(tr, v.dni || '—', 'DNI');
            DashboardUIService.appendCell(tr, v.email || '—', 'Email');
            DashboardUIService.appendCell(tr, v.ref4 || '—', 'Ref 4');
            DashboardUIService.appendCell(tr, v.hab || '—', 'Hab/Apto');
            DashboardUIService.appendCell(tr, v.monto || '—', 'Monto');
            const rawDate = v.timestamp || v.createdAt || '';
            DashboardUIService.appendCell(
                tr,
                rawDate ? DateFormatter.toLocalDate(rawDate) : '—',
                'Fecha'
            );

            const filesTd = document.createElement('td');
            filesTd.setAttribute('data-label', 'Archivos');

            if (Array.isArray(v.files) && v.files.length) {
                const frag = document.createDocumentFragment();
                v.files.forEach((f, idx) => {
                    // Normalizar URL relativa
                    if (f.url && f.url.startsWith('/')) {
                        f.url = `${apiBase}${f.url}`;
                    }
                    const isImage = f.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
                    const safeName = Sanitizer.escapeHtml(f.name || `Archivo ${idx + 1}`);
                    const safeUrl = f.url || '#';

                    if (isImage && f.url) {
                        const wrap = document.createElement('div');
                        wrap.style.display = 'inline-block';
                        wrap.style.margin = '2px';

                        const img = document.createElement('img');
                        img.src = safeUrl;
                        img.alt = safeName;
                        img.title = 'Clic para ver completa';
                        img.loading = 'lazy';
                        img.style.cssText = 'width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #ccc;';
                        img.onclick = () => openImageModal(safeUrl, safeName);
                        img.onerror = function() {
                            this.style.display = 'none';
                            const a = document.createElement('a');
                            a.textContent = safeName;
                            a.href = safeUrl;
                            a.target = '_blank';
                            a.rel = 'noopener';
                            wrap.appendChild(a);
                        };
                        wrap.appendChild(img);
                        frag.appendChild(wrap);
                    } else {
                        const a = document.createElement('a');
                        a.textContent = safeName;
                        a.href = safeUrl;
                        a.download = f.name || '';
                        a.target = f.url ? '_blank' : '_self';
                        a.rel = 'noopener';
                        a.style.margin = '0 5px';
                        frag.appendChild(a);
                    }
                });
                filesTd.appendChild(frag);
            } else {
                filesTd.textContent = '—';
            }

            tr.appendChild(filesTd);
            tbody.appendChild(tr);
        }
    }

    static appendCell(tr, text, label) {
        const td = document.createElement('td');
        td.textContent = text;
        td.setAttribute('data-label', label);
        tr.appendChild(td);
    }

    static renderMonthLabel(label) {
        const el = document.getElementById('currentMonthLabel');
        if (el) el.textContent = label;
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class DashboardController {
    static async init() {
        let vouchers = await DashboardApiService.fetchVouchers();
        if (!Array.isArray(vouchers)) vouchers = [];
        dashboardState.allVouchers = vouchers;
        DashboardController.renderMonthView();
    }

    static renderMonthView() {
        const filtered = dashboardState.getFilteredVouchers();
        DashboardUIService.renderMonthLabel(dashboardState.getMonthLabel());
        DashboardUIService.renderMetrics(filtered);
        DashboardUIService.renderTable(filtered);
    }
}

// ─── Modal de imagen ──────────────────────────────────────────────────────────

class ImageModalController {
    static open(imageUrl, imageName) {
        const modal = document.getElementById('imageModal');
        document.getElementById('modalImage').src = imageUrl;
        document.getElementById('modalImageName').textContent = imageName || 'Imagen';
        modal.classList.add('show');
        modal.onclick = e => { if (e.target === modal) ImageModalController.close(); };
    }

    static close() {
        document.getElementById('imageModal').classList.remove('show');
    }
}

// ─── Global bridges ───────────────────────────────────────────────────────────

function changeMonth(delta) {
    dashboardState.changeMonth(delta);
    DashboardController.renderMonthView();
}

function openImageModal(url, name) {
    ImageModalController.open(url, name);
}

function closeImageModal() {
    ImageModalController.close();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    DashboardController.init();
});
