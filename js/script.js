/**
 * Landing page - Hostal Mayelewoo
 * Principios: DRY, SOLID, YAGNI
 */

const CONTACT_CONFIG = {
    whatsappNumber: '5493516664584',
    hostalName: 'Hostal Mayelewoo'
};

// ─── State ────────────────────────────────────────────────────────────────────

class ContactState {
    constructor() {
        this.form         = document.getElementById('contactForm');
        this.whatsappLink = document.getElementById('whatsappLink');
    }
}

// ─── DomainLogic ─────────────────────────────────────────────────────────────

class ContactDomain {
    static getFormData(form) {
        return {
            nombre:    document.getElementById('nombre').value,
            apellido:  document.getElementById('apellido').value,
            dni:       document.getElementById('dni').value,
            email:     document.getElementById('email').value,
            huespedes: document.getElementById('huespedes').value,
            tipo:      document.getElementById('tipo').value,
            mensaje:   document.getElementById('mensaje').value
        };
    }

    static validate(data) {
        if (!data.nombre.trim())   return 'El nombre es requerido';
        if (!data.apellido.trim()) return 'El apellido es requerido';
        if (!data.dni.trim())      return 'El DNI es requerido';
        if (!data.email.trim())    return 'El correo electrónico es requerido';
        if (!Validators.isEmail(data.email)) return 'El correo electrónico no es válido';
        return null;
    }

    static buildWhatsAppUrl(data) {
        const tipoTexto = { habitacion: 'Habitación', apartamento: 'Apartamento', consultar: 'Consultar opciones disponibles' };
        let msg = `¡Hola! Quiero hacer una consulta para ${CONTACT_CONFIG.hostalName}\n\n`;
        msg += `*Datos del huésped:*\n`;
        msg += `👤 Nombre: ${data.nombre} ${data.apellido}\n`;
        msg += `📋 DNI: ${data.dni}\n`;
        msg += `📧 Email: ${data.email}\n\n`;
        msg += `👥 *Huéspedes:* ${data.huespedes}\n`;
        msg += `🏠 *Tipo de alojamiento:* ${tipoTexto[data.tipo] || data.tipo}\n\n`;
        if (data.mensaje) msg += `💬 *Mensaje adicional:*\n${data.mensaje}\n\n`;
        msg += `Espero su respuesta. ¡Gracias!`;
        return `https://wa.me/${CONTACT_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    }

    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768;
    }
}

// ─── UIService ────────────────────────────────────────────────────────────────

class ContactUIService {
    static showError(form, message) {
        form.querySelectorAll('.form-error-banner').forEach(e => e.remove());

        const div = document.createElement('div');
        div.className = 'form-error-banner';
        div.style.cssText = `
            background-color:#fed7d7;color:#c53030;padding:1rem;
            border-radius:8px;margin-bottom:1rem;border-left:4px solid #e53e3e;
        `;
        div.innerHTML = `<strong>Por favor corregí los siguientes errores:</strong>
            <ul style="margin-top:0.5rem;margin-bottom:0;"><li>${message}</li></ul>`;
        form.insertBefore(div, form.firstChild);
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    static showSuccess(form) {
        form.querySelectorAll('.form-success-banner').forEach(e => e.remove());

        const div = document.createElement('div');
        div.className = 'form-success-banner';
        div.style.cssText = `
            background-color:#c6f6d5;color:#22543d;padding:1rem;
            border-radius:8px;margin-bottom:1rem;border-left:4px solid #38a169;text-align:center;
        `;
        div.innerHTML = `<strong>¡Perfecto!</strong> Te estamos redirigiendo a WhatsApp...`;
        form.insertBefore(div, form.firstChild);
        setTimeout(() => div.remove(), 3000);
    }

    static setupFieldValidation() {
        document.querySelectorAll('input[required], select[required]').forEach(input => {
            input.addEventListener('blur', function() {
                this.classList.remove('error-field');
                if (!this.value.trim()) {
                    this.classList.add('error-field');
                } else if (this.type === 'email' && !Validators.isEmail(this.value)) {
                    this.classList.add('error-field');
                }
            });
            input.addEventListener('input', function() {
                if (this.classList.contains('error-field') && this.value.trim()) {
                    this.classList.remove('error-field');
                }
            });
        });
    }

    static setupCharacterCounter() {
        const textarea   = document.getElementById('mensaje');
        const charCount  = document.getElementById('charCount');
        const counterEl  = document.querySelector('.character-counter');
        if (!textarea || !charCount) return;

        const update = () => {
            const len = textarea.value.length;
            charCount.textContent = len;
            counterEl?.classList.remove('warning', 'near-limit');
            if (len >= 200)       counterEl?.classList.add('warning');
            else if (len >= 160)  counterEl?.classList.add('near-limit');
        };

        textarea.addEventListener('input', update);
        textarea.addEventListener('paste', () => setTimeout(update, 10));
        update();
    }

    static setupScrollAnimations() {
        const elements = document.querySelectorAll('.room-card, .hero-img');
        elements.forEach(el => {
            el.style.opacity   = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        });

        const contactForm = document.querySelector('.contact-form');
        if (contactForm) {
            contactForm.style.transform  = 'none';
            contactForm.style.transition = 'none';
        }

        const animate = () => {
            elements.forEach(el => {
                if (el.getBoundingClientRect().top < window.innerHeight - 150) {
                    el.style.opacity   = '1';
                    el.style.transform = 'translateY(0)';
                }
            });
        };

        setTimeout(animate, 100);
        window.addEventListener('scroll', animate);
    }

    static setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', e => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }
}

// ─── Controller ───────────────────────────────────────────────────────────────

class ContactController {
    static init() {
        const state = new ContactState();

        if (state.form) {
            state.form.addEventListener('submit', e => {
                e.preventDefault();
                const data  = ContactDomain.getFormData(state.form);
                const error = ContactDomain.validate(data);

                if (error) {
                    ContactUIService.showError(state.form, error);
                    return;
                }

                const url = ContactDomain.buildWhatsAppUrl(data);
                ContactUIService.showSuccess(state.form);

                if (ContactDomain.isMobile()) {
                    window.location.href = url;
                } else {
                    setTimeout(() => window.open(url, '_blank'), 1000);
                }
            });
        }

        if (state.whatsappLink) {
            state.whatsappLink.addEventListener('click', e => {
                e.preventDefault();
                const msg = encodeURIComponent(`¡Hola! Quiero información sobre ${CONTACT_CONFIG.hostalName}`);
                const url = `https://wa.me/${CONTACT_CONFIG.whatsappNumber}?text=${msg}`;
                ContactDomain.isMobile() ? (window.location.href = url) : window.open(url, '_blank');
            });
        }

        ContactUIService.setupFieldValidation();
        ContactUIService.setupCharacterCounter();
        ContactUIService.setupScrollAnimations();
        ContactUIService.setupSmoothScroll();

        // Inyectar estilos para campos con error (sin uso de Sanitizer por ser CSS propio)
        const style = document.createElement('style');
        style.textContent = `.error-field{border-color:#e53e3e!important;box-shadow:0 0 0 3px rgba(229,62,62,.1)!important;}`;
        document.head.appendChild(style);
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    ContactController.init();
});
