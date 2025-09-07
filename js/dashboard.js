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
		? `${DASHBOARD_CONFIG.apiBaseUrl}/api/vouchers`
		: '/api/vouchers';
	
	console.log('Fetching vouchers from:', url);
	
	try {
		const res = await fetch(url);
		console.log('Response status:', res.status, res.ok);
		
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const response = await res.json();
		console.log('API Response:', response);
		
		// La API devuelve { success: true, data: [...] }
		return response.data || response;
	} catch (error) {
		console.error('Fetch error:', error);
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
	console.log('Starting dashboard render...');
	
	let vouchers = await fetchVouchers();
	console.log('Vouchers received:', vouchers);
	console.log('Vouchers count:', vouchers ? vouchers.length : 0);
	
	// FORZAR uso de datos reales - solo usar mock en caso de emergencia
	if (!vouchers || vouchers.length === 0) {
		console.warn('⚠️ No real data available, falling back to mock data');
		vouchers = getMockVouchers();
	} else {
		console.log('✅ Using real API data');
	}

	// Log each voucher to debug
	vouchers.forEach((voucher, i) => {
		console.log(`Voucher ${i + 1}:`, {
			nombre: voucher.nombre,
			files: voucher.files,
			fotos: voucher.fotos
		});
	});

	// Métricas
	renderMetrics(vouchers);

	// Tabla - FORZAR que use renderTable
	console.log('Rendering table with', vouchers.length, 'vouchers');
	renderTable(vouchers);
}

document.addEventListener('DOMContentLoaded', renderDashboard);

function getMockVouchers() {
	// Datos actualizados con URLs reales del backend
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
			{ name: 'comprobante.jpg', url: 'https://mayelewoo-back.onrender.com/uploads/vouchers/ce7b2c185107d67ab891aa9a3865412cf.jpeg' }
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
				// Verificar si es una imagen
				const isImage = f.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
				
				if (isImage && f.url) {
					// Crear thumbnail de imagen
					const imgContainer = document.createElement('div');
					imgContainer.style.display = 'inline-block';
					imgContainer.style.margin = '2px';
					
					const img = document.createElement('img');
					img.src = f.url;
					img.alt = f.name || `Imagen ${idx + 1}`;
					img.style.width = '40px';
					img.style.height = '40px';
					img.style.objectFit = 'cover';
					img.style.borderRadius = '4px';
					img.style.cursor = 'pointer';
					img.style.border = '1px solid #ccc';
					img.title = 'Clic para ver completa';
					
					img.onclick = () => {
						window.open(f.url, '_blank');
					};
					
					img.onerror = function() {
						this.style.display = 'none';
						// Fallback a enlace de texto
						const a = document.createElement('a');
						a.textContent = f.name || `Archivo ${idx + 1}`;
						a.href = f.url || '#';
						a.target = '_blank';
						a.rel = 'noopener';
						imgContainer.appendChild(a);
					};
					
					imgContainer.appendChild(img);
					frag.appendChild(imgContainer);
				} else {
					// Enlace de texto para archivos no imagen
					const a = document.createElement('a');
					a.textContent = f.name || `Archivo ${idx + 1}`;
					a.href = f.url || '#';
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

function appendCell(tr, text, label) {
	const td = document.createElement('td');
	td.textContent = text;
	td.setAttribute('data-label', label);
	tr.appendChild(td);
}

function displayVouchers(vouchers) {
    const tbody = document.getElementById('voucherTableBody');
    
    if (!vouchers || vouchers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No hay datos de usuarios registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = vouchers.map(voucher => {
        // Manejar diferentes formatos de fecha
        const fecha = voucher.fechaHora 
            ? new Date(voucher.fechaHora).toLocaleDateString('es-ES')
            : voucher.timestamp 
                ? new Date(voucher.timestamp).toLocaleDateString('es-ES')
                : voucher.createdAt
                    ? new Date(voucher.createdAt).toLocaleDateString('es-ES')
                    : '—';
        
        // Manejar archivos con el nuevo formato
        let archivos = 'Sin archivo';
        if (voucher.files && Array.isArray(voucher.files) && voucher.files.length) {
            archivos = voucher.files.map((f, idx) => {
                const isImage = f.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
                if (isImage && f.url) {
                    return `<img src="${f.url}" 
                                 alt="${f.name}" 
                                 style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; margin: 2px; cursor: pointer;" 
                                 onclick="window.open('${f.url}', '_blank')"
                                 title="Clic para ver completa">`;
                } else {
                    return `<a href="${f.url || '#'}" target="_blank" style="color: var(--color-primary); margin: 0 5px;">${f.name || `Archivo ${idx + 1}`}</a>`;
                }
            }).join('');
        } else if (voucher.comprobante) {
            // Formato legacy
            archivos = `<a href="${voucher.comprobante}" target="_blank" style="color: var(--color-primary);">${voucher.comprobante.split('/').pop()}</a>`;
        }
        
        return `
            <tr>
                <td data-label="Nombre:">${voucher.nombre || ''} ${voucher.apellido || ''}</td>
                <td data-label="DNI:">${voucher.dni || '—'}</td>
                <td data-label="Email:">${voucher.email || '—'}</td>
                <td data-label="Ref 4:">${voucher.ref4 || '—'}</td>
                <td data-label="Hab/Apto:">${voucher.hab || voucher.habitacion || '—'}</td>
                <td data-label="Monto:">${voucher.monto || '—'}</td>
                <td data-label="Fecha/Hora:">${fecha}</td>
                <td data-label="Archivos:">${archivos}</td>
            </tr>
        `;
    }).join('');
}


