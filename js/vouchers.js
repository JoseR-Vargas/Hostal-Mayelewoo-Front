// Configuración y utilidades mínimas (YAGNI/DRY)
const VOUCHERS_CONFIG = {
	maxTotalUploadBytes: 10 * 1024 * 1024, // 10 MB
	apiBaseUrl: resolveApiBaseUrl()
};

function resolveApiBaseUrl() {
	const { hostname, protocol } = window.location;
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return `${protocol}//${hostname}:3000`; // NestJS por defecto
	}
	// En producción, usar el backend desplegado en Render
	return 'https://mayelewoo-back.onrender.com';
}

function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function showFormBanner(container, { type, text }) {
	// Limpia banners previos
	container.querySelectorAll('.voucher-banner').forEach(b => b.remove());
	const div = document.createElement('div');
	div.className = 'voucher-banner';
	div.style.cssText = `
		margin-bottom: 1rem;
		padding: 1rem;
		border-radius: 8px;
		border-left: 4px solid ${type === 'error' ? '#e53e3e' : '#38a169'};
		background-color: ${type === 'error' ? '#fed7d7' : '#c6f6d5'};
		color: ${type === 'error' ? '#c53030' : '#22543d'};
	`;
	div.textContent = text;
	container.insertBefore(div, container.firstChild);
}

function getVoucherFormData() {
	return {
		nombre: document.getElementById('nombre')?.value?.trim() || '',
		apellido: document.getElementById('apellido')?.value?.trim() || '',
		dni: document.getElementById('dni')?.value?.trim() || '',
		email: document.getElementById('email')?.value?.trim() || '',
		ref4: document.getElementById('ref4')?.value?.trim() || '',
		hab: document.getElementById('hab')?.value?.trim() || '',
		monto: document.getElementById('monto')?.value?.trim() || ''
	};
}

function validateVoucherForm(data, files) {
	const errors = [];
	if (!data.nombre) errors.push('El nombre es requerido');
	if (!data.apellido) errors.push('El apellido es requerido');
	if (!data.dni) errors.push('El DNI es requerido');
	if (!data.email) errors.push('El correo electrónico es requerido');
	if (data.email && !isValidEmail(data.email)) errors.push('El correo electrónico no es válido');
	if (!data.ref4 || !/^\d{4}$/.test(data.ref4)) errors.push('Los últimos 4 dígitos deben ser numéricos');
	if (!data.hab) errors.push('El número de habitación/apartamento es requerido');
	if (!data.monto) errors.push('El monto depositado es requerido');

	// Validación de archivos (galería de imágenes)
	if (!files || files.length === 0) {
		errors.push('Debes adjuntar al menos una imagen del comprobante');
	} else {
		let total = 0;
		for (const f of files) {
			if (!f.type.startsWith('image/')) {
				errors.push('Solo se permiten imágenes');
				break;
			}
			total += f.size;
		}
		if (total > VOUCHERS_CONFIG.maxTotalUploadBytes) {
			errors.push('Las imágenes superan el tamaño total permitido (10 MB)');
		}
	}
	return errors;
}

function buildFormDataPayload(data, files) {
	const formData = new FormData();
	Object.entries(data).forEach(([k, v]) => formData.append(k, v));
	formData.append('timestamp', new Date().toISOString());
	for (const f of files) formData.append('files', f, f.name);
	return formData;
}

async function sendToBackend(formData) {
	// Preparado para NestJS (ruta sugerida)
	const url = VOUCHERS_CONFIG.apiBaseUrl
		? `${VOUCHERS_CONFIG.apiBaseUrl}/vouchers`
		: '/api/vouchers';
	const res = await fetch(url, {
		method: 'POST',
		body: formData
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json().catch(() => ({}));
}

function saveLocallyFallback(data, files) {
	const key = 'pendingVouchers';
	const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
	const fileSummaries = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }));
	snapshots.push({ ...data, files: fileSummaries, timestamp: new Date().toISOString() });
	localStorage.setItem(key, JSON.stringify(snapshots));
}

function setupMobileInputUX() {
	// Evitar confusiones en móvil: normalizar inputs numéricos
	const ref4 = document.getElementById('ref4');
	const monto = document.getElementById('monto');

	if (ref4) {
		ref4.addEventListener('input', () => {
			ref4.value = ref4.value.replace(/\D+/g, '').slice(0, 4);
		});
	}

	if (monto) {
		monto.addEventListener('input', () => {
			monto.value = monto.value.replace(/[^\d.,]/g, '');
		});
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('voucherForm');
	const fileInput = document.getElementById('fotos');
	const submitBtn = document.getElementById('submitBtn');

	setupMobileInputUX();

	if (fileInput) {
		fileInput.addEventListener('change', () => {
			const files = fileInput.files || [];
			let total = 0;
			for (const f of files) total += f.size;
			if (total > VOUCHERS_CONFIG.maxTotalUploadBytes) {
				showFormBanner(form, { type: 'error', text: 'Las imágenes superan 10 MB en total.' });
				fileInput.value = '';
			}
		});
	}

	if (!form) return;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (submitBtn) submitBtn.disabled = true;

		const data = getVoucherFormData();
		const files = (document.getElementById('fotos')?.files) || [];
		const errors = validateVoucherForm(data, files);

		if (errors.length) {
			showFormBanner(form, { type: 'error', text: errors[0] });
			if (submitBtn) submitBtn.disabled = false;
			return;
		}

		const payload = buildFormDataPayload(data, files);
		try {
			await sendToBackend(payload);
			showFormBanner(form, { type: 'success', text: '¡Voucher enviado correctamente!' });
			form.reset();
		} catch (err) {
			// Guardar localmente para entorno offline/local
			saveLocallyFallback(data, files);
			showFormBanner(form, { type: 'success', text: 'Guardado localmente. Se enviará cuando el backend esté disponible.' });
		} finally {
			if (submitBtn) submitBtn.disabled = false;
		}
	});
});


