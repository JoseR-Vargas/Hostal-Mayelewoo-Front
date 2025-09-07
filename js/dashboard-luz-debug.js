/**
 * VERSION SIMPLIFICADA PARA DEBUG
 */

// Verificar autenticación antes de cargar el dashboard
if (!requireAuth()) {
    throw new Error('Acceso no autorizado');
}

class DashboardMedicionesDebug {
    constructor() {
        this.apiUrl = this.getApiUrl();
        this.mediciones = [];
        console.log('API URL:', this.apiUrl);
        this.init();
    }

    getApiUrl() {
        const { hostname, protocol } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:3000/api`;
        }
        return 'https://mayelewoo-back.onrender.com/api';
    }

    async init() {
        await this.cargarMediciones();
    }

    async cargarMediciones() {
        try {
            console.log('Cargando mediciones desde:', `${this.apiUrl}/contadores`);
            
            const response = await fetch(`${this.apiUrl}/contadores`);
            console.log('Response status:', response.status, response.ok);
            
            if (response.ok) {
                const data = await response.json();
                this.mediciones = data.data || [];
                console.log('Mediciones recibidas:', this.mediciones.length);
                
                // Log detallado de las imágenes
                this.mediciones.forEach((medicion, index) => {
                    console.log(`Medición ${index + 1}:`, {
                        habitacion: medicion.habitacion,
                        nombre: medicion.nombre,
                        fotoMedidor: medicion.fotoMedidor
                    });
                });
            } else {
                console.warn('Error al obtener mediciones');
                this.mediciones = [];
            }
            
            this.mostrarMediciones();
            
        } catch (error) {
            console.error('Error de conexión:', error);
            this.mediciones = [];
            this.mostrarMediciones();
        }
    }

    mostrarMediciones() {
        const tbody = document.getElementById('medicionesTableBody');
        const noDataMessage = document.getElementById('noDataMessage');
        
        if (!this.mediciones.length) {
            tbody.innerHTML = '<tr><td colspan="6">No hay mediciones</td></tr>';
            noDataMessage.style.display = 'block';
            return;
        }

        noDataMessage.style.display = 'none';
        
        // Crear HTML simplificado
        const rows = this.mediciones.map((medicion, index) => {
            const imgHTML = medicion.fotoMedidor 
                ? `<img src="${medicion.fotoMedidor}" 
                       alt="Medidor ${medicion.habitacion}" 
                       class="foto-medidor-preview" 
                       style="width: 60px; height: 60px; object-fit: cover; border: 1px solid #ccc;">` 
                : '<span class="sin-foto">Sin foto</span>';
                
            console.log(`Fila ${index + 1} - Imagen HTML:`, imgHTML);
            
            return `
                <tr>
                    <td>${medicion.habitacion}</td>
                    <td>${medicion.nombre} ${medicion.apellidos}</td>
                    <td>${medicion.dni}</td>
                    <td>${medicion.lecturaActual} kWh</td>
                    <td>${imgHTML}</td>
                    <td>${this.formatearFecha(medicion.fechaLectura || medicion.createdAt)}</td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = rows;
        
        // Debug: verificar imágenes después de insertar
        setTimeout(() => {
            const images = tbody.querySelectorAll('img');
            console.log('Imágenes insertadas:', images.length);
            images.forEach((img, i) => {
                console.log(`Imagen ${i + 1}: ${img.src} - Complete: ${img.complete} - Natural: ${img.naturalWidth}x${img.naturalHeight}`);
            });
        }, 100);
    }

    formatearFecha(fechaISO) {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new DashboardMedicionesDebug();
});
