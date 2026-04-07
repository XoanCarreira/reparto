/**
 * FUNCIONES UTILITARIAS
 * Funciones auxiliares reutilizables en toda la aplicación
 */

/**
 * Formatea una fecha a formato legible en español
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Formato: "15 de Marzo de 2024"
 */
export function formatDate(date) {
	if (!date) return '';

	const options = { year: 'numeric', month: 'long', day: 'numeric', locale: 'es-ES' };
	return new Date(date).toLocaleDateString('es-ES', options);
}

/**
 * Formatea una hora a formato HH:MM
 * @param {Date|string} time - Hora a formatear
 * @returns {string} - Formato: "14:30"
 */
export function formatTime(time) {
	if (!time) return '';

	const date = new Date(time);
	return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formatea una fecha y hora completa
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Formato: "15 de Marzo de 2024, 14:30"
 */
export function formatDateTime(date) {
	if (!date) return '';

	return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Convierte una cantidad a moneda EUR
 * @param {number} amount - Cantidad numérica
 * @returns {string} - Formato: "12,50 €"
 */
export function formatCurrency(amount) {
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR'
	}).format(amount);
}

/**
 * Obtiene los días de reparto en formato legible
 * @param {array} days - Array de nombres de días
 * @returns {string} - Formato: "Lunes, Miércoles y Viernes"
 */
export function formatDeliveryDays(days) {
	if (!days || days.length === 0) return 'Sin horario definido';

	if (days.length === 1) return days[0];

	const allButLast = days.slice(0, -1).join(', ');
	return `${allButLast} y ${days[days.length - 1]}`;
}

/**
 * Calcula los días restantes hasta una fecha
 * @param {Date} futureDate - Fecha futura
 * @returns {object} - { daysLeft: number, hoursLeft: number, message: string }
 */
export function daysUntil(futureDate) {
	const now = new Date();
	const diff = new Date(futureDate) - now;

	if (diff <= 0) {
		return { daysLeft: 0, hoursLeft: 0, message: 'Hoy' };
	}

	const daysLeft = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

	let message = '';
	if (daysLeft === 0) {
		message = `En ${hoursLeft}h`;
	} else if (daysLeft === 1) {
		message = 'Mañana';
	} else {
		message = `En ${daysLeft} días`;
	}

	return { daysLeft, hoursLeft, message };
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
export function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Obtiene el color de estado según el tipo
 * @param {string} status - Estado (pending, delivered, cancelled, open, resolved, etc)
 * @returns {string} - Clase CSS de color
 */
export function getStatusColor(status) {
	const colors = {
		pending: 'status-pending',
		delivered: 'status-delivered',
		returned: 'status-returned',
		cancelled: 'status-cancelled',
		open: 'status-open',
		in_progress: 'status-in-progress',
		in_delivery: 'status-on-delivery',
		resolved: 'status-resolved',
		active: 'status-active',
		off: 'status-off',
		on_delivery: 'status-on-delivery',
		high: 'status-high',
		medium: 'status-medium',
		low: 'status-low'
	};
	return colors[status] || 'status-default';
}

/**
 * Obtiene la etiqueta traducida de un estado
 * @param {string} status - Estado en inglés
 * @returns {string} - Estado en español
 */
export function getStatusLabel(status) {
	const labels = {
		pending: 'Pendiente',
		delivered: 'Entregado',
		returned: 'Devuelto',
		cancelled: 'Cancelado',
		open: 'Abierto',
		in_progress: 'En proceso',
		in_delivery: 'En reparto',
		resolved: 'Resuelto',
		active: 'Activo',
		off: 'Descanso',
		on_delivery: 'En reparto',
		high: 'Alta',
		medium: 'Media',
		low: 'Baja',
		delayed: 'Retraso',
		damaged: 'Dañado',
		wrong_quantity: 'Cantidad incorrecta',
		other: 'Otro'
	};
	return labels[status] || status;
}

/**
 * Calcula el total de un pedido
 * @param {array} items - Array de items con { productId, quantity, unitPrice }
 * @returns {number}
 */
export function calculateOrderTotal(items) {
	return items.reduce((total, item) => {
		return total + (item.unitPrice * item.quantity || 0);
	}, 0);
}

/**
 * Valida que un valor sea un número positivo
 * @param {any} value - Valor a validar
 * @returns {boolean}
 */
export function isPositiveNumber(value) {
	const num = parseFloat(value);
	return !isNaN(num) && num > 0;
}

/**
 * Genera un ID único basado en timestamp
 * @returns {string}
 */
export function generateUniqueId() {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Agrupa un array por una propiedad
 * @param {array} array - Array a agrupar
 * @param {string} property - Propiedad por la que agrupar
 * @returns {object} - Objeto con las agrupaciones
 */
export function groupBy(array, property) {
	return array.reduce((result, item) => {
		const key = item[property];
		if (!result[key]) {
			result[key] = [];
		}
		result[key].push(item);
		return result;
	}, {});
}

/**
 * Ordena un array de objetos por una propiedad
 * @param {array} array - Array a ordenar
 * @param {string} property - Propiedad por la que ordenar
 * @param {string} order - 'asc' o 'desc'
 * @returns {array}
 */
export function sortBy(array, property, order = 'asc') {
	return [...array].sort((a, b) => {
		if (a[property] < b[property]) return order === 'asc' ? -1 : 1;
		if (a[property] > b[property]) return order === 'asc' ? 1 : -1;
		return 0;
	});
}

/**
 * Construye las notas visibles de un pedido con autor y fecha.
 * Soporta formato legacy (notes + deliveryNote) y payload JSON en notes.
 * @param {Object} order - Pedido con campos notes/deliveryNote
 * @returns {Array<{id: string, text: string, author: string, role: string, createdAt: Date|null}>}
 */
export function buildOrderNotesTimeline(order) {
	const entries = [];

	if (!order) {
		return entries;
	}

	const pushEntry = (text, role, createdAt = null) => {
		const normalizedText = String(text || '').trim();
		if (!normalizedText) {
			return;
		}

		const author =
			role === 'admin'
				? 'Admin'
				: role === 'delivery'
					? 'Repartidor'
					: 'Cliente';

		entries.push({
			id: `${role}-${entries.length + 1}`,
			text: normalizedText,
			role,
			author,
			createdAt: createdAt ? new Date(createdAt) : null
		});
	};

	const rawNotes = String(order.notes || '').trim();
	if (rawNotes.startsWith('[')) {
		try {
			const parsed = JSON.parse(rawNotes);
			if (Array.isArray(parsed)) {
				parsed.forEach((item) => {
					if (!item || typeof item !== 'object') {
						return;
					}

					const role = ['admin', 'delivery', 'client'].includes(item.role)
						? item.role
						: (order.isManual ? 'admin' : 'client');
					pushEntry(item.text, role, item.createdAt || null);
				});
			}
		} catch {
			pushEntry(rawNotes, order.isManual ? 'admin' : 'client', order.createdAt || null);
		}
	} else {
		pushEntry(rawNotes, order.isManual ? 'admin' : 'client', order.createdAt || null);
	}

	pushEntry(order.deliveryNote, 'delivery', order.deliveryNoteAt || order.deliveredAt || null);

	return entries.sort((a, b) => {
		const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number.MIN_SAFE_INTEGER;
		const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number.MIN_SAFE_INTEGER;
		return aTime - bTime;
	});
}
