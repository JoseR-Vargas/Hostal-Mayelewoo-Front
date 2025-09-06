// Verificar autenticación antes de cargar el dashboard
if (!requireAuth()) {
	// La función requireAuth ya redirecciona si no está autenticado
	throw new Error('Acceso no autorizado');
}

// Reutiliza estilos/UX existentes (SOLID/DRY): solo lógica específica del dashboard
const DASHBOARD_CONFIG = {
	apiBaseUrl: resolveApiBaseUrl()
};

function resolveApiBaseUrl() {
	const { hostname, protocol } = window.location;
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return `${protocol}//${hostname}:3000`;
	}
	// En producción, usar el backend desplegado en Render
	return 'https://mayelewoo-back.onrender.com';
}

async function fetchVouchers() {
	const url = DASHBOARD_CONFIG.apiBaseUrl
		? `${DASHBOARD_CONFIG.apiBaseUrl}/vouchers`
		: '/api/vouchers';
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch (_) {
		// Fallback a localStorage para entorno local/offline
		const key = 'pendingVouchers';
		return JSON.parse(localStorage.getItem(key) || '[]');
	}
}

function formatMoney(m) {
	return m;
}

function createVoucherCard(voucher) {
	const div = document.createElement('div');
	div.className = 'room-card';
	div.style.display = 'grid';
	div.style.gridTemplateColumns = '1fr';
	div.style.gap = '0.5rem';

	const title = document.createElement('h4');
	title.className = 'room-title';
	title.textContent = `${voucher.nombre || ''} ${voucher.apellido || ''}`.trim() || 'Sin nombre';
	div.appendChild(title);

	const rows = [
		['DNI', voucher.dni],
		['Email', voucher.email],
		['Ref 4 dígitos', voucher.ref4],
		['Hab/Apto', voucher.hab],
		['Monto', formatMoney(voucher.monto)],
		['Fecha/Hora', voucher.timestamp || voucher.createdAt || '—']
	];

	rows.forEach(([label, value]) => {
		const p = document.createElement('p');
		p.className = 'room-description';
		p.textContent = `${label}: ${value ?? '—'}`;
		div.appendChild(p);
	});

	// Archivos: si vienen del backend, puede ser array de objetos con url
	if (voucher.files && Array.isArray(voucher.files) && voucher.files.length) {
		const list = document.createElement('ul');
		list.className = 'room-features';
		voucher.files.forEach((f, idx) => {
			const li = document.createElement('li');
			const a = document.createElement('a');
			a.textContent = f.name || `Archivo ${idx + 1}`;
			a.href = f.url || '#';
			a.download = f.name || '';
			a.target = f.url ? '_blank' : '_self';
			a.rel = 'noopener';
			li.appendChild(a);
			list.appendChild(li);
		});
		div.appendChild(list);
	}

	return div;
}

async function renderDashboard() {
	const container = document.getElementById('voucherList');

	let vouchers = await fetchVouchers();
	if (!vouchers || vouchers.length === 0) {
		vouchers = getMockVouchers();
	}

	// Métricas
	renderMetrics(vouchers);

	// Tabla
	renderTable(vouchers);
}

document.addEventListener('DOMContentLoaded', renderDashboard);

function getMockVouchers() {
	return [{
		nombre: 'María',
		apellido: 'Pérez',
		dni: '30123456',
		email: 'maria.perez@example.com',
		ref4: '1234',
		hab: 'Apto 2B',
		monto: '45000',
		timestamp: new Date().toISOString(),
		files: [
			{ name: 'comprobante.jpg', url: 'img/mayelewo1.jpeg' }
		]
	}];
}

function renderMetrics(vouchers) {
	const metrics = document.getElementById('metrics');
	if (!metrics) return;
	const today = new Date().toISOString().slice(0, 10);
	const todayCount = vouchers.filter(v => (v.timestamp || '').slice(0, 10) === today).length;

	metrics.innerHTML = '';
	metrics.appendChild(metricCard('Comprobantes cargados', todayCount));
}

function metricCard(title, value) {
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

function renderTable(vouchers) {
	const tbody = document.getElementById('voucherTableBody');
	if (!tbody) return;
	tbody.innerHTML = '';
	for (const v of vouchers) {
		const tr = document.createElement('tr');
		appendCell(tr, `${v.nombre || ''} ${v.apellido || ''}`.trim(), 'Nombre');
		appendCell(tr, v.dni || '—', 'DNI');
		appendCell(tr, v.email || '—', 'Email');
		appendCell(tr, v.ref4 || '—', 'Ref 4');
		appendCell(tr, v.hab || '—', 'Hab/Apto');
		appendCell(tr, formatMoney(v.monto || '—'), 'Monto');
		appendCell(tr, v.timestamp || v.createdAt || '—', 'Fecha/Hora');
		const filesTd = document.createElement('td');
		filesTd.setAttribute('data-label', 'Archivos');
		if (Array.isArray(v.files) && v.files.length) {
			const frag = document.createDocumentFragment();
			v.files.forEach((f, idx) => {
				const a = document.createElement('a');
				a.textContent = f.name || `Archivo ${idx + 1}`;
				a.href = f.url || '#';
				a.download = f.name || '';
				a.target = f.url ? '_blank' : '_self';
				a.rel = 'noopener';
				frag.appendChild(a);
				frag.appendChild(document.createTextNode(' '));
			});
			filesTd.appendChild(frag);
		} else {
			filesTd.textContent = '—';
		}
		tr.appendChild(filesTd);
		tbody.appendChild(tr);
	}
}

function appendCell(tr, text, label) {
	const td = document.createElement('td');
	td.textContent = text;
	td.setAttribute('data-label', label);
	tr.appendChild(td);
}


