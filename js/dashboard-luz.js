if (!requireAuth()) throw new Error('Acceso no autorizado');

// ─── State ────────────────────────────────────────────────────────────────────

class MedicionesState {
    constructor() {
        this.mediciones = [];
    }
}

const medicionesState = new MedicionesState();

// ─── ApiService ───────────────────────────────────────────────────────────────

class MedicionesApiService {
    static async fetchMediciones() {
        const res = await APIClient.request('/contadores', { headers: APIClient.authHeaders });
        const data = await res.json();
        return data.data || [];
    }
}

// ─── UIService ────────────────────────────────────────────────────────────────

class MedicionesUIService {
    static showLoading(visible) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = visible ? 'flex' : 'none';
    }

    static renderMediciones(mediciones) {
        const tbody = document.getElementById('medicionesTableBody');
        const noData = document.getElementById('noDataMessage');

        if (!mediciones.length) {
            tbody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';
        const apiBase = CONFIG.API_BASE_URL.replace(/\/api$/, '');

        tbody.innerHTML = mediciones.map(m => {
            let foto = m.fotoMedidor;
            if (foto && foto.startsWith('/')) {
                foto = `${apiBase}${foto}`.replace(/([^:]\/)\/+/g, '$1');
            }
            const fotoCell = foto
                ? `<img src="${Sanitizer.escapeHtml(foto)}"
                         alt="Foto medidor ${Sanitizer.escapeHtml(m.habitacion)}"
                         class="foto-medidor-preview"
                         onclick="this.classList.toggle('foto-ampliada')"
                         title="Clic para ampliar"
                         loading="lazy"
                         onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=\\'sin-foto\\'>Imagen no disponible</span>')">`
                : '<span class="sin-foto">Sin foto</span>';

            return `
            <tr>
                <td>${Sanitizer.escapeHtml(m.habitacion)}</td>
                <td>${Sanitizer.escapeHtml(m.nombre)} ${Sanitizer.escapeHtml(m.apellidos || '')}</td>
                <td>${Sanitizer.escapeHtml(m.dni)}</td>
                <td>${Sanitizer.escapeHtml(String(m.numeroMedicion || m.lecturaActual || 'N/A'))}</td>
                <td>${fotoCell}</td>
                <td>${DateFormatter.toLocalDate(m.fechaLectura || m.createdAt)}</td>
            </tr>`;
        }).join('');
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class MedicionesController {
    static async init() {
        MedicionesUIService.showLoading(true);
        try {
            const mediciones = await MedicionesApiService.fetchMediciones();
            medicionesState.mediciones = mediciones;
            MedicionesUIService.renderMediciones(mediciones);
        } catch (error) {
            console.error('Error de conexión:', error);
            MedicionesUIService.renderMediciones([]);
        } finally {
            MedicionesUIService.showLoading(false);
        }
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    MedicionesController.init();
});
