/**
 * STORE DE AUTENTICACIÓN
 * Gestiona la sesión del usuario actual, login, logout y verificación de roles.
 * Integra con el sistema de mock data.
 */

import { writable } from 'svelte/store';
import { users } from '../data/mockData.js';
import { deliveryStaffStore, clientsStore } from './dataStore.js';

/**
 * Crea un store reactivo de Svelte para la sesión del usuario actual
 * - Contiene los datos del usuario autenticado o null si no está logueado
 * - Se sincroniza con localStorage para persistencia entre recargas
 */
function createAuthStore() {
	// Intenta recuperar la sesión guardada en localStorage
	const storedSession = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
	const initialValue = storedSession ? JSON.parse(storedSession) : null;

	// Crea el store reactivo con el valor inicial
	const { subscribe, set } = writable(initialValue);

	return {
		subscribe,

		/**
		 * Autentica un usuario con email y contraseña
		 * @param {string} email - Email del usuario
		 * @param {string} password - Contraseña del usuario
		 * @returns {object} - { success: boolean, error?: string, user?: object }
		 */
		login: (email, password) => {
			const normalizedEmail = String(email || '').trim().toLowerCase();
			const normalizedPassword = String(password || '');

			// Busca primero en usuarios del sistema (admin/client y repartidores legacy)
			let user = users.find(
				(u) =>
					String(u.email || '').trim().toLowerCase() === normalizedEmail &&
					String(u.password || '') === normalizedPassword
			);

			if (!user) {
				// Si no existe en users, permite autenticación de repartidores del store operativo.
				const deliveryUser = deliveryStaffStore.getAll().find(
					(staff) =>
						String(staff.email || '').trim().toLowerCase() === normalizedEmail &&
						String(staff.password || '') === normalizedPassword
				);

				if (deliveryUser) {
					user = {
						id: deliveryUser.id,
						email: deliveryUser.email,
						name: deliveryUser.name,
						role: 'delivery',
						zone: deliveryUser.zoneId,
						deliveryStaffId: deliveryUser.id
					};
				}
			}

			if (!user) {
				// Si no existe en repartidores, permite autenticación de clientes creados dinámicamente.
				const clientUser = clientsStore.getAll().find(
					(client) =>
						String(client.email || '').trim().toLowerCase() === normalizedEmail &&
						String(client.password || '') === normalizedPassword
				);

				if (clientUser) {
					user = {
						id: clientUser.id,
						email: clientUser.email,
						name: clientUser.name,
						role: 'client',
						zone: clientUser.zone
					};
				}
			}

			if (!user) {
				return { success: false, error: 'Email o contraseña incorrectos' };
			}

			// Crea una sesión segura (sin la contraseña)
			const session = {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				zone: user.zone,
				deliveryStaffId: user.role === 'delivery' ? user.deliveryStaffId ?? user.id : null,
				loginAt: new Date()
			};

			// Guarda en el store y en localStorage
			set(session);
			if (typeof window !== 'undefined') {
				localStorage.setItem('currentUser', JSON.stringify(session));
			}

			return { success: true, user: session };
		},

		/**
		 * Cierra la sesión del usuario actual
		 */
		logout: () => {
			set(null);
			if (typeof window !== 'undefined') {
				localStorage.removeItem('currentUser');
			}
		},

		/**
		 * Verifica si el usuario está autenticado
		 * @returns {boolean}
		 */
		isAuthenticated: () => {
			let authenticated = false;
			subscribe((session) => {
				authenticated = session !== null;
			})();
			return authenticated;
		},

		/**
		 * Obtiene el rol del usuario actual
		 * @returns {string|null} - 'admin', 'client', o null
		 */
		getRole: () => {
			let role = null;
			subscribe((session) => {
				role = session?.role || null;
			})();
			return role;
		}
	};
}

// Exporta la instancia única del store de autenticación
export const authStore = createAuthStore();
