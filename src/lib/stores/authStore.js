/**
 * STORE DE AUTENTICACIÓN
 * Gestiona la sesión del usuario actual, login, logout y verificación de roles.
 * Fuente única: base de datos (Supabase).
 */

import { writable } from 'svelte/store';
import {
	fetchAuthUserDb,
	fetchProfileByAuthUserIdDb,
	isDatabaseEnabled
} from '../utils/supabaseDb.js';
import { isSupabaseAuthEnabled, supabaseClient } from '../utils/supabaseClient.js';

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
		login: async (email, password) => {
			const normalizedEmail = String(email || '').trim().toLowerCase();
			const normalizedPassword = String(password || '');

			if (!isDatabaseEnabled) {
				return { success: false, error: 'La conexión con la base de datos no está configurada' };
			}

			let user = null;
			let authData = null;
			let authError = null;

			if (!isSupabaseAuthEnabled || !supabaseClient) {
				return { success: false, error: 'Supabase Auth no está configurado' };
			}

			try {
				const { data, error } = await supabaseClient.auth.signInWithPassword({
					email: normalizedEmail,
					password: normalizedPassword
				});
				authData = data;
				authError = error;

				if (error && isDatabaseEnabled) {
					// Bridge: si el usuario existe en public.users pero no en auth.users,
					// lo provisionamos en Auth en el primer login con sus credenciales válidas.
					let legacyUser = null;
					try {
						legacyUser = await fetchAuthUserDb(normalizedEmail, normalizedPassword);
					} catch (legacyError) {
						console.error('No se pudo validar usuario legado en bridge auth:', legacyError);
					}
					if (legacyUser) {
						const { error: signUpError } = await supabaseClient.auth.signUp({
							email: normalizedEmail,
							password: normalizedPassword
						});

						// Si ya está registrado, continuamos con login normal.
						if (signUpError && signUpError.message !== 'User already registered') {
							console.error('No se pudo crear cuenta en Supabase Auth:', signUpError);
						}

						const retried = await supabaseClient.auth.signInWithPassword({
							email: normalizedEmail,
							password: normalizedPassword
						});
						authData = retried.data;
						authError = retried.error;
					}
				}

				if (authError) {
					return { success: false, error: 'Email o contraseña incorrectos' };
				}

				if (!authData?.user?.id) {
					return { success: false, error: 'No se pudo recuperar la sesión de usuario' };
				}

				user = await fetchProfileByAuthUserIdDb(authData.user.id);
				if (!user) {
					await supabaseClient.auth.signOut();
					return {
						success: false,
						error: 'Usuario autenticado sin perfil de aplicación vinculado'
					};
				}
			} catch (error) {
				console.error('Error autenticando con Supabase Auth:', error);
				return { success: false, error: 'No se pudo conectar con el servicio de autenticación' };
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
		logout: async () => {
			if (isSupabaseAuthEnabled && supabaseClient) {
				try {
					await supabaseClient.auth.signOut();
				} catch (error) {
					console.error('No se pudo cerrar sesión en Supabase Auth:', error);
				}
			}

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
