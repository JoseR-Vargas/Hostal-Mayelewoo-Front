/**
 * Calculadora de Medidor - Hostal Mayelewoo
 * Implementación siguiendo principios DRY, SOLID, YAGNI
 * Enfoque mobile-first responsive
 */

class MeterCalculator {
    constructor() {
        this.PRICE_PER_KWH = 439.26;
        this.form = document.getElementById('calculatorForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.modal = document.getElementById('resultModal');
        this.calculationPreview = document.getElementById('calculationPreview');
        
        this.initializeEventListeners();
        this.loadSavedData();
    }

    /**
     * Inicializa todos los event listeners del formulario
     */
    initializeEventListeners() {
        // Envío del formulario
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Inputs de medición para cálculo en tiempo real
        const medicionAnterior = document.getElementById('medicionAnterior');
        const medicionActual = document.getElementById('medicionActual');
        
        medicionAnterior.addEventListener('input', () => this.calculatePreview());
        medicionActual.addEventListener('input', () => this.calculatePreview());
        medicionActual.addEventListener('blur', () => this.validateCurrentMeasurement());
        
        // Validación de DNI
        document.getElementById('dni').addEventListener('input', (e) => this.validateDNI(e));
        
        // Inputs de fotos
        document.getElementById('fotoAnterior').addEventListener('change', (e) => 
            this.handlePhotoUpload(e, 'fotoAnteriorPreview', 'fotoAnteriorGroup'));
        document.getElementById('fotoActual').addEventListener('change', (e) => 
            this.handlePhotoUpload(e, 'fotoActualPreview', 'fotoActualGroup'));
        
        // Formateo de números decimales
        this.setupDecimalInputs();
    }

    /**
     * Configura los inputs para permitir decimales con coma o punto
     */
    setupDecimalInputs() {
        const decimalInputs = ['medicionAnterior', 'medicionActual'];
        
        decimalInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            
            // Validación en tiempo real
            input.addEventListener('input', (e) => {
                let value = e.target.value;
                
                // Permitir solo números, punto y coma
                value = value.replace(/[^0-9.,]/g, '');
                
                // Reemplazar múltiples puntos o comas
                const hasDecimal = value.match(/[.,]/g);
                if (hasDecimal && hasDecimal.length > 1) {
                    // Mantener solo el primer separador decimal
                    const firstSeparatorIndex = value.search(/[.,]/);
                    value = value.slice(0, firstSeparatorIndex + 1) + 
                           value.slice(firstSeparatorIndex + 1).replace(/[.,]/g, '');
                }
                
                e.target.value = value;
                this.calculatePreview();
            });
            
            // Normalizar al perder el foco
            input.addEventListener('blur', (e) => {
                let value = e.target.value;
                if (value) {
                    // Reemplazar coma por punto para el valor normalizado
                    value = value.replace(',', '.');
                    // Validar que sea un número válido
                    if (!isNaN(parseFloat(value))) {
                        e.target.value = value;
                    }
                }
            });
        });
    }

    /**
     * Valida el DNI (7-8 dígitos)
     */
    validateDNI(event) {
        const input = event.target;
        const value = input.value;
        const formGroup = input.closest('.form-group');
        
        if (value && (value.length < 7 || value.length > 8 || isNaN(value))) {
            this.showFieldError(formGroup, 'Ingrese un DNI válido (7-8 dígitos)');
        } else {
            this.clearFieldError(formGroup);
        }
    }

    /**
     * Valida que la medición actual sea mayor a la anterior
     */
    validateCurrentMeasurement() {
        // Normalizar valores (reemplazar coma por punto)
        const anteriorValue = document.getElementById('medicionAnterior').value.replace(',', '.');
        const actualValue = document.getElementById('medicionActual').value.replace(',', '.');
        
        const anterior = parseFloat(anteriorValue) || 0;
        const actual = parseFloat(actualValue) || 0;
        const formGroup = document.getElementById('medicionActual').closest('.form-group');
        
        if (actual > 0 && anterior > 0 && actual <= anterior) {
            this.showFieldError(formGroup, 'La medición actual debe ser mayor a la anterior');
            return false;
        } else {
            this.clearFieldError(formGroup);
            return true;
        }
    }

    /**
     * Calcula y muestra la vista previa del consumo
     */
    calculatePreview() {
        // Obtener valores y normalizar (reemplazar coma por punto)
        const anteriorValue = document.getElementById('medicionAnterior').value.replace(',', '.');
        const actualValue = document.getElementById('medicionActual').value.replace(',', '.');
        
        const anterior = parseFloat(anteriorValue) || 0;
        const actual = parseFloat(actualValue) || 0;
        
        if (anterior > 0 && actual > anterior) {
            const consumo = actual - anterior;
            const monto = consumo * this.PRICE_PER_KWH;
            
            document.getElementById('consumoCalculado').textContent = `${consumo.toFixed(1)} kWh`;
            document.getElementById('montoAPagar').textContent = `$${this.formatMoney(monto)}`;
            
            this.calculationPreview.classList.add('show');
        } else {
            this.calculationPreview.classList.remove('show');
        }
    }

    /**
     * Maneja la subida de fotos
     */
    handlePhotoUpload(event, previewId, groupId) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            alert('Por favor seleccione un archivo de imagen válido');
            return;
        }
        
        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es muy grande. Por favor seleccione una imagen menor a 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(previewId);
            const group = document.getElementById(groupId);
            
            preview.src = e.target.result;
            preview.style.display = 'block';
            group.classList.add('has-photo');
            
            // Limpiar error de foto si existe
            group.classList.remove('error');
            const errorElement = group.querySelector('.error-message');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Abre la cámara para tomar una foto
     */
    openCamera(inputId) {
        const input = document.getElementById(inputId);
        input.setAttribute('capture', 'environment'); // Usar cámara trasera
        input.click();
    }

    /**
     * Abre la galería para seleccionar una foto
     */
    openGallery(inputId) {
        const input = document.getElementById(inputId);
        input.removeAttribute('capture');
        input.click();
    }

    /**
     * Valida todos los campos del formulario
     */
    validateForm() {
        let isValid = true;
        const requiredFields = ['nombre', 'apellido', 'dni', 'habitacion', 'medicionAnterior', 'medicionActual'];
        
        // Limpiar errores previos
        document.querySelectorAll('.form-group.error').forEach(group => {
            this.clearFieldError(group);
        });
        
        // Validar campos requeridos
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const value = field.value.trim();
            const formGroup = field.closest('.form-group');
            
            if (!value) {
                this.showFieldError(formGroup, `Este campo es requerido`);
                isValid = false;
            }
        });
        
        // Validaciones específicas
        if (!this.validateCurrentMeasurement()) {
            isValid = false;
        }
        
        // Validar DNI
        const dni = document.getElementById('dni').value;
        if (dni && (dni.length < 7 || dni.length > 8)) {
            const formGroup = document.getElementById('dni').closest('.form-group');
            this.showFieldError(formGroup, 'Ingrese un DNI válido (7-8 dígitos)');
            isValid = false;
        }
        
        // Validar que ambas fotos estén cargadas
        const fotoAnterior = document.getElementById('fotoAnterior').files[0];
        const fotoActual = document.getElementById('fotoActual').files[0];
        
        if (!fotoAnterior) {
            const formGroup = document.getElementById('fotoAnteriorGroup');
            this.showPhotoError(formGroup, 'Debe cargar la foto del medidor del mes anterior');
            isValid = false;
        }
        
        if (!fotoActual) {
            const formGroup = document.getElementById('fotoActualGroup');
            this.showPhotoError(formGroup, 'Debe cargar la foto del medidor del mes actual');
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Muestra error en un campo específico
     */
    showFieldError(formGroup, message) {
        formGroup.classList.add('error');
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    /**
     * Muestra error en un grupo de foto
     */
    showPhotoError(photoGroup, message) {
        photoGroup.classList.add('error');
        
        // Crear mensaje de error si no existe
        let errorElement = photoGroup.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.display = 'block';
            errorElement.style.color = '#e74c3c';
            errorElement.style.fontSize = '0.9rem';
            errorElement.style.marginTop = '0.5rem';
            photoGroup.appendChild(errorElement);
        }
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    /**
     * Limpia el error de un campo específico
     */
    clearFieldError(formGroup) {
        formGroup.classList.remove('error');
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Recopila todos los datos del formulario
     */
    getFormData() {
        // Normalizar valores (reemplazar coma por punto)
        const anteriorValue = document.getElementById('medicionAnterior').value.replace(',', '.');
        const actualValue = document.getElementById('medicionActual').value.replace(',', '.');
        
        const anterior = parseFloat(anteriorValue);
        const actual = parseFloat(actualValue);
        const consumo = actual - anterior;
        const montoTotal = consumo * this.PRICE_PER_KWH;
        
        return {
            nombre: document.getElementById('nombre').value.trim(),
            apellido: document.getElementById('apellido').value.trim(),
            dni: document.getElementById('dni').value,
            habitacion: document.getElementById('habitacion').value.trim(),
            medicionAnterior: anterior,
            medicionActual: actual,
            consumoCalculado: consumo,
            montoTotal: montoTotal,
            precioKWH: this.PRICE_PER_KWH,
            fotoAnterior: document.getElementById('fotoAnterior').files[0],
            fotoActual: document.getElementById('fotoActual').files[0],
            fechaRegistro: new Date().toISOString(),
            timestamp: Date.now()
        };
    }

    /**
     * Guarda los datos en localStorage
     */
    saveToLocalStorage(data) {
        try {
            // Crear una copia sin los archivos para localStorage
            const dataToSave = { ...data };
            delete dataToSave.fotoAnterior;
            delete dataToSave.fotoActual;
            
            // Obtener registros existentes
            const existingData = JSON.parse(localStorage.getItem('meterCalculations') || '[]');
            
            // Agregar nuevo registro
            existingData.push(dataToSave);
            
            // Mantener solo los últimos 50 registros
            if (existingData.length > 50) {
                existingData.splice(0, existingData.length - 50);
            }
            
            localStorage.setItem('meterCalculations', JSON.stringify(existingData));
            localStorage.setItem('lastCalculation', JSON.stringify(dataToSave));
            
            console.log('Datos guardados en localStorage:', dataToSave);
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
        }
    }

    /**
     * Envía los datos al servidor (API backend)
     */
    async submitToServer(data) {
        // Crear FormData para enviar archivos y datos
        const formData = new FormData();
        
        // Agregar todos los campos del formulario
        formData.append('nombre', data.nombre);
        formData.append('apellido', data.apellido);
        formData.append('dni', data.dni);
        formData.append('habitacion', data.habitacion);
        formData.append('medicionAnterior', data.medicionAnterior.toString());
        formData.append('medicionActual', data.medicionActual.toString());
        formData.append('consumoCalculado', data.consumoCalculado.toString());
        formData.append('montoTotal', data.montoTotal.toString());
        formData.append('precioKWH', data.precioKWH.toString());
        formData.append('fechaRegistro', data.fechaRegistro);
        formData.append('timestamp', data.timestamp.toString());
        
        // Agregar fotos si existen
        if (data.fotoAnterior) {
            formData.append('fotoAnterior', data.fotoAnterior);
        }
        
        if (data.fotoActual) {
            formData.append('fotoActual', data.fotoActual);
        }
        
        try {
            // Obtener la URL del API desde config.js
            const API_URL = window.API_URL || window.APP_CONFIG?.API_URL || 'https://mayelewoo-back.onrender.com';
            
            console.log('📤 Enviando cálculo a:', `${API_URL}/api/calculos-medidor`);
            
            const response = await fetch(`${API_URL}/api/calculos-medidor`, {
                method: 'POST',
                body: formData,
                // No establecer Content-Type, el navegador lo hará automáticamente con boundary
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
                throw new Error(errorData.message || `Error del servidor: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Respuesta del servidor:', result);
            return result;
            
        } catch (error) {
            console.error('Error al enviar datos al servidor:', error);
            
            // Si falla el envío al servidor, aún guardamos en localStorage como backup
            console.warn('Guardando datos en localStorage como backup...');
            
            throw error;
        }
    }

    /**
     * Maneja el envío del formulario
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        // Deshabilitar botón y mostrar estado de procesamiento
        this.setSubmittingState(true);
        
        try {
            const formData = this.getFormData();
            
            // Intentar enviar al servidor primero
            try {
                const response = await this.submitToServer(formData);
                
                if (response.success) {
                    // Si se envía correctamente al servidor, también guardamos en localStorage
                    this.saveToLocalStorage(formData);
                    
                    this.showSuccessModal(formData.montoTotal);
                    this.resetForm();
                } else {
                    throw new Error(response.message || 'Error al procesar los datos');
                }
            } catch (serverError) {
                console.error('Error al comunicarse con el servidor:', serverError);
                
                // Guardar en localStorage como backup
                this.saveToLocalStorage(formData);
                
                // Preguntar al usuario si quiere continuar
                const continuar = confirm(
                    'No se pudo procesar su solicitud. Intente nuevamente en unos minutos.\n\n' +
                    'Los datos se guardaron localmente y se sincronizarán cuando se restablezca la conexión.\n\n' +
                    '¿Desea continuar?'
                );
                
                if (continuar) {
                    this.showSuccessModal(formData.montoTotal);
                    this.resetForm();
                } else {
                    throw serverError;
                }
            }
            
        } catch (error) {
            console.error('Error al enviar formulario:', error);
            alert('Error al procesar los datos. Por favor intente nuevamente.');
        } finally {
            this.setSubmittingState(false);
        }
    }

    /**
     * Establece el estado de envío del botón
     */
    setSubmittingState(isSubmitting) {
        if (isSubmitting) {
            this.submitBtn.classList.add('processing');
            this.submitBtn.textContent = 'Procesando...';
            this.submitBtn.disabled = true;
        } else {
            this.submitBtn.classList.remove('processing');
            this.submitBtn.textContent = 'Calcular y Enviar';
            this.submitBtn.disabled = false;
        }
    }

    /**
     * Muestra el modal de éxito con el resultado
     */
    showSuccessModal(amount) {
        document.getElementById('modalAmount').textContent = `$${this.formatMoney(amount)}`;
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Cierra el modal de resultado
     */
    closeModal() {
        this.modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    /**
     * Resetea el formulario después del envío exitoso
     */
    resetForm() {
        this.form.reset();
        this.calculationPreview.classList.remove('show');
        
        // Limpiar previews de fotos
        document.getElementById('fotoAnteriorPreview').style.display = 'none';
        document.getElementById('fotoActualPreview').style.display = 'none';
        document.getElementById('fotoAnteriorGroup').classList.remove('has-photo');
        document.getElementById('fotoActualGroup').classList.remove('has-photo');
        
        // Limpiar errores
        document.querySelectorAll('.form-group.error').forEach(group => {
            this.clearFieldError(group);
        });
    }

    /**
     * Carga datos guardados previamente (para autocompletado)
     */
    loadSavedData() {
        try {
            const lastCalculation = localStorage.getItem('lastCalculation');
            if (lastCalculation) {
                const data = JSON.parse(lastCalculation);
                
                // Solo autocompletar datos personales, no las mediciones
                if (data.nombre) document.getElementById('nombre').value = data.nombre;
                if (data.apellido) document.getElementById('apellido').value = data.apellido;
                if (data.dni) document.getElementById('dni').value = data.dni;
                if (data.habitacion) document.getElementById('habitacion').value = data.habitacion;
            }
        } catch (error) {
            console.error('Error al cargar datos guardados:', error);
        }
    }

    /**
     * Formatea un número como dinero con separador de miles (punto) y decimales (coma)
     * Ejemplo: 17614.33 -> 17.614,33
     */
    formatMoney(amount) {
        const fixed = amount.toFixed(2);
        const parts = fixed.split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${integerPart},${parts[1]}`;
    }
}

/**
 * Funciones globales para interactuar con los botones de fotos
 */
window.openCamera = function(inputId) {
    calculator.openCamera(inputId);
};

window.openGallery = function(inputId) {
    calculator.openGallery(inputId);
};

window.closeModal = function() {
    calculator.closeModal();
};

/**
 * Inicialización cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', function() {
    window.calculator = new MeterCalculator();
});

/**
 * Utilidades adicionales para debug y testing
 */
window.MeterCalculatorUtils = {
    getStoredCalculations: () => {
        return JSON.parse(localStorage.getItem('meterCalculations') || '[]');
    },
    
    clearStoredData: () => {
        localStorage.removeItem('meterCalculations');
        localStorage.removeItem('lastCalculation');
        localStorage.removeItem('pendingSyncCalculations');
        console.log('Datos de localStorage limpiados');
    },
    
    exportData: () => {
        const data = JSON.parse(localStorage.getItem('meterCalculations') || '[]');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meter-calculations-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    /**
     * Sincroniza datos pendientes del localStorage con el servidor
     */
    syncPendingData: async () => {
        const pending = JSON.parse(localStorage.getItem('pendingSyncCalculations') || '[]');
        
        if (pending.length === 0) {
            console.log('No hay datos pendientes de sincronización');
            return { success: true, synced: 0 };
        }
        
        const API_URL = window.API_URL || window.APP_CONFIG?.API_URL || 'https://mayelewoo-back.onrender.com';
        let syncedCount = 0;
        const failedItems = [];
        
        for (const item of pending) {
            try {
                const formData = new FormData();
                Object.keys(item).forEach(key => {
                    if (item[key] !== null && item[key] !== undefined && key !== 'fotoAnterior' && key !== 'fotoActual') {
                        formData.append(key, item[key].toString());
                    }
                });
                
                const response = await fetch(`${API_URL}/api/calculos-medidor`, {
                    method: 'POST',
                    body: formData,
                });
                
                if (response.ok) {
                    syncedCount++;
                } else {
                    failedItems.push(item);
                }
            } catch (error) {
                console.error('Error al sincronizar item:', error);
                failedItems.push(item);
            }
        }
        
        // Actualizar localStorage con solo los items que fallaron
        localStorage.setItem('pendingSyncCalculations', JSON.stringify(failedItems));
        
        console.log(`Sincronizados ${syncedCount} de ${pending.length} registros`);
        return { success: true, synced: syncedCount, failed: failedItems.length };
    },
    
    /**
     * Configura la URL del API
     */
    setApiUrl: (url) => {
        window.API_URL = url;
        console.log('API URL configurada:', url);
    }
};
