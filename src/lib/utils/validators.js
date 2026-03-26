/**
 * VALIDADORES DE SEGURIDAD
 * Sanitización y validación de inputs antes de enviar a base de datos
 */

/**
 * Valida email según RFC 5322 simplificado
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
	if (!email || typeof email !== 'string') return false;
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return regex.test(email) && email.length <= 255;
}

/**
 * Valida contraseña (mínimo 8 caracteres, al menos 1 mayúscula, 1 número)
 * @param {string} password 
 * @returns {boolean}
 */
export function isValidPassword(password) {
	if (!password || typeof password !== 'string') return false;
	return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

/**
 * Valida nombre de usuario/cliente (sin caracteres especiales potencialmente peligrosos)
 * @param {string} name 
 * @returns {boolean}
 */
export function isValidName(name) {
	if (!name || typeof name !== 'string') return false;
	// Permite letras, espacios, guiones, apóstrofes (para nombres internacionales)
	const regex = /^[a-zA-ZáéíóúàèìòùäëïöüÁÉÍÓÚÀÈÌÒÙÄËÏÖÜ\s\-']{1,100}$/;
	return regex.test(name.trim());
}

/**
 * Valida código postal (España: 5 dígitos)
 * @param {string} zipCode 
 * @returns {boolean}
 */
export function isValidZipCode(zipCode) {
	if (!zipCode || typeof zipCode !== 'string') return false;
	return /^\d{5}$/.test(zipCode);
}

/**
 * Valida teléfono (España: +34 o 6-9 seguido de 8 dígitos)
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidPhone(phone) {
	if (!phone || typeof phone !== 'string') return false;
	const regex = /^(\+34|0034|34)?[6789]\d{8}$/;
	return regex.test(phone.replace(/\s+/g, ''));
}

/**
 * Sanitiza texto removiendo caracteres potencialmente peligrosos
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeText(text) {
	if (!text || typeof text !== 'string') return '';
	return text
		.trim()
		.slice(0, 1000) // Limita longitud
		.replace(/[<>]/g, ''); // Remueve < y >
}

/**
 * Sanitiza email
 * @param {string} email 
 * @returns {string}
 */
export function sanitizeEmail(email) {
	if (!email || typeof email !== 'string') return '';
	return email.trim().toLowerCase().slice(0, 255);
}

/**
 * Valida número (cantidad de producto, cantidad, etc.)
 * @param {number} num 
 * @param {number} min 
 * @param {number} max 
 * @returns {boolean}
 */
export function isValidNumber(num, min = 0, max = 999999) {
	return Number.isInteger(num) && num >= min && num <= max;
}

/**
 * Valida rol de usuario
 * @param {string} role 
 * @returns {boolean}
 */
export function isValidRole(role) {
	return ['admin', 'client', 'delivery'].includes(role);
}

/**
 * Valida estado de pedido
 * @param {string} status 
 * @returns {boolean}
 */
export function isValidOrderStatus(status) {
	return ['pending', 'in_delivery', 'delivered', 'cancelled', 'returned'].includes(status);
}

/**
 * Valida estado de incidencia
 * @param {string} status 
 * @returns {boolean}
 */
export function isValidIncidentStatus(status) {
	return ['open', 'in_progress', 'resolved'].includes(status);
}

/**
 * Valida tipo de incidencia
 * @param {string} type 
 * @returns {boolean}
 */
export function isValidIncidentType(type) {
	return ['delayed', 'damaged', 'wrong_quantity', 'other'].includes(type);
}

/**
 * Crea objeto de validación con errores
 * @returns {object}
 */
export function createValidationResult() {
	return {
		isValid: true,
		errors: [],
		addError(field, message) {
			this.isValid = false;
			this.errors.push({ field, message });
		}
	};
}

/**
 * Valida objeto de login
 * @param {object} data 
 * @returns {object} { isValid, errors }
 */
export function validateLoginData(data) {
	const result = createValidationResult();

	if (!isValidEmail(data.email)) {
		result.addError('email', 'Email inválido');
	}

	if (!data.password || data.password.length < 6) {
		result.addError('password', 'Contraseña requerida (mínimo 6 caracteres)');
	}

	return result;
}

/**
 * Valida objeto de cliente nuevo
 * @param {object} data 
 * @returns {object} { isValid, errors }
 */
export function validateClientData(data) {
	const result = createValidationResult();

	if (!isValidEmail(data.email)) {
		result.addError('email', 'Email inválido');
	}

	if (!isValidName(data.name)) {
		result.addError('name', 'Nombre inválido (máximo 100 caracteres)');
	}

	if (!data.phone || !isValidPhone(data.phone)) {
		result.addError('phone', 'Teléfono inválido');
	}

	if (data.address && data.address.length > 1000) {
		result.addError('address', 'Dirección demasiado larga (máximo 1000 caracteres)');
	}

	return result;
}

/**
 * Valida objeto de producto
 * @param {object} data 
 * @returns {object} { isValid, errors }
 */
export function validateProductData(data) {
	const result = createValidationResult();

	if (!isValidName(data.name)) {
		result.addError('name', 'Nombre de producto inválido');
	}

	if (!isValidNumber(data.price, 0.01, 999999.99)) {
		result.addError('price', 'Precio debe ser entre 0.01 y 999999.99');
	}

	if (!isValidNumber(data.stock, 0, 999999)) {
		result.addError('stock', 'Stock debe ser un número entre 0 y 999999');
	}

	if (data.description && data.description.length > 5000) {
		result.addError('description', 'Descripción demasiado larga (máximo 5000 caracteres)');
	}

	return result;
}

/**
 * Valida objeto de pedido
 * @param {object} data 
 * @returns {object} { isValid, errors }
 */
export function validateOrderData(data) {
	const result = createValidationResult();

	if (!data.clientId || !isValidNumber(data.clientId, 1)) {
		result.addError('clientId', 'Cliente inválido');
	}

	if (!Array.isArray(data.items) || data.items.length === 0) {
		result.addError('items', 'El pedido debe tener al menos 1 artículo');
	}

	if (data.items?.some(item => !isValidNumber(item.quantity, 1))) {
		result.addError('items', 'Todas las cantidades deben ser números positivos');
	}

	if (data.notes && data.notes.length > 1000) {
		result.addError('notes', 'Notas demasiado largas (máximo 1000 caracteres)');
	}

	return result;
}

/**
 * Debounce para evitar múltiples llamadas API consecutivas
 * @param {function} func 
 * @param {number} wait 
 * @returns {function}
 */
export function debounce(func, wait = 300) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Throttle para limitar frecuencia de llamadas
 * @param {function} func 
 * @param {number} limit 
 * @returns {function}
 */
export function throttle(func, limit = 1000) {
	let inThrottle;
	return function(...args) {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}
