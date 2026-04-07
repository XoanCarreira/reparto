/**
 * STORE DE AUTENTICACIÓN
 * Gestiona la sesión del usuario actual, login, logout y verificación de roles.
 * Fuente única: base de datos (Supabase).
 * Seguridad: Usa sessionStorage para la sesión actual (más seguro que localStorage para datos sensibles)
 */

import { writable } from 'svelte/store';
import { fetchProfileByAuthUserIdDb, isDatabaseEnabled } from '../utils/supabaseDb.js';
import { isSupabaseAuthEnabled, supabaseClient } from '../utils/supabaseClient.js';
import { validateLoginData } from '../utils/validators.js';

// Constantes de seguridad
const SESSION_TIMEOUT_MS = parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600000'); // 1 hora
const SESSION_WARNING_MS = SESSION_TIMEOUT_MS * 0.9; // Aviso 90% del tiempo
const SESSION_STORAGE_KEY = 'app_session';
const SESSION_EXPIRY_KEY = 'app_session_expiry';

/**
 * Crea un store reactivo de Svelte para la sesión del usuario actual
 * - Contiene los datos del usuario autenticado o null si no está logueado
 * - Se sincroniza con sessionStorage (más seguro que localStorage)
 * - Implementa timeout automático de sesión
 */
function createAuthStore() {
	// Intenta recuperar la sesión guardada en sessionStorage
	const storedSession =
		typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null;
	const storedExpiry =
		typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_EXPIRY_KEY) : null;

	// Valida que la sesión no haya expirado
	let initialValue = null;
	if (storedSession && storedExpiry) {
		if (Date.now() < parseInt(storedExpiry)) {
			try {
				initialValue = JSON.parse(storedSession);
			} catch (error) {
				console.warn('Session storage corrupted, clearing', error);
				if (typeof window !== 'undefined') {
					sessionStorage.removeItem(SESSION_STORAGE_KEY);
					sessionStorage.removeItem(SESSION_EXPIRY_KEY);
				}
			}
		} else {
			// Sesión expirada, limpiar
			if (typeof window !== 'undefined') {
				sessionStorage.removeItem(SESSION_STORAGE_KEY);
				sessionStorage.removeItem(SESSION_EXPIRY_KEY);
			}
		}
	}

	// Crea el store reactivo con el valor inicial
	const { subscribe, set } = writable(initialValue);
	let sessionTimeoutHandle = null;

	async function syncSessionWithSupabaseAuth() {
		if (typeof window === 'undefined' || !isSupabaseAuthEnabled || !supabaseClient) {
			return;
		}

		try {
			const {
				data: { session }
			} = await supabaseClient.auth.getSession();

			if (!session?.user?.id) {
				set(null);
				sessionStorage.removeItem(SESSION_STORAGE_KEY);
				sessionStorage.removeItem(SESSION_EXPIRY_KEY);
				return;
			}

			const user = await fetchProfileByAuthUserIdDb(session.user.id);
			if (!user) {
				await supabaseClient.auth.signOut();
				set(null);
				sessionStorage.removeItem(SESSION_STORAGE_KEY);
				sessionStorage.removeItem(SESSION_EXPIRY_KEY);
				return;
			}

			const syncedSession = {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				zone: user.zone,
				deliveryStaffId: user.role === 'delivery' ? (user.deliveryStaffId ?? user.id) : null,
				loginAt: new Date().toISOString()
			};

			const expiryTime = Date.now() + SESSION_TIMEOUT_MS;
			set(syncedSession);
			sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(syncedSession));
			sessionStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
		} catch (error) {
			console.error('No se pudo sincronizar sesión con Supabase Auth:', error);
		}
	}

	const store = {
		subscribe,

		/**
		 * Autentica un usuario con email y contraseña
		 * @param {string} email - Email del usuario
		 * @param {string} password - Contraseña del usuario
		 * @returns {object} - { success: boolean, error?: string, user?: object }
		 */
		login: async (email, password) => {
			// Validar inputs
			const validation = validateLoginData({ email, password });
			if (!validation.isValid) {
				const errorMsg = validation.errors.map((e) => e.message).join('; ');
				return { success: false, error: errorMsg };
			}

			const normalizedEmail = email.trim().toLowerCase();
			const normalizedPassword = String(password);

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

				if (authError) {
					console.warn('Auth error:', authError.message);
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
				deliveryStaffId: user.role === 'delivery' ? (user.deliveryStaffId ?? user.id) : null,
				loginAt: new Date().toISOString()
			};

			// Calcula tiempo de expiración
			const expiryTime = Date.now() + SESSION_TIMEOUT_MS;

			// Guarda en el store y en sessionStorage
			set(session);
			if (typeof window !== 'undefined') {
				sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
				sessionStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());

				// Limpia localStorage si existe sesión anterior (migración)
				localStorage.removeItem('currentUser');
			}

			// Inicia timer de timeout
			store.resetSessionTimeout();

			return { success: true, user: session };
		},

		/**
		 * Cambia la contraseña del usuario autenticado
		 * - Verifica contraseña actual para evitar bloqueos por error tipográfico
		 * - Requiere confirmación de la nueva contraseña
		 * @param {object} params
		 * @param {string} params.currentPassword
		 * @param {string} params.newPassword
		 * @param {string} params.confirmPassword
		 * @returns {object} - { success: boolean, error?: string, message?: string }
		 */
		changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
			if (!isSupabaseAuthEnabled || !supabaseClient) {
				return { success: false, error: 'Supabase Auth no está configurado' };
			}

			const normalizedCurrentPassword = String(currentPassword || '');
			const normalizedNewPassword = String(newPassword || '');
			const normalizedConfirmPassword = String(confirmPassword || '');

			if (!normalizedCurrentPassword) {
				return { success: false, error: 'Debes indicar tu contraseña actual' };
			}

			if (normalizedNewPassword.length < 8) {
				return {
					success: false,
					error: 'La nueva contraseña debe tener al menos 8 caracteres'
				};
			}

			if (normalizedNewPassword !== normalizedConfirmPassword) {
				return { success: false, error: 'La confirmación no coincide con la nueva contraseña' };
			}

			if (normalizedCurrentPassword === normalizedNewPassword) {
				return {
					success: false,
					error: 'La nueva contraseña debe ser diferente de la contraseña actual'
				};
			}

			try {
				const {
					data: { user: sessionUser }
				} = await supabaseClient.auth.getUser();

				if (!sessionUser?.email) {
					return { success: false, error: 'No se pudo verificar la sesión actual' };
				}

				// Reautenticación para confirmar que la contraseña actual es correcta.
				const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
					email: sessionUser.email,
					password: normalizedCurrentPassword
				});

				if (reauthError) {
					return { success: false, error: 'La contraseña actual es incorrecta' };
				}

				const { error: updateError } = await supabaseClient.auth.updateUser({
					password: normalizedNewPassword
				});

				if (updateError) {
					const message = String(updateError.message || '').toLowerCase();
					if (message.includes('same password') || message.includes('should be different')) {
						return {
							success: false,
							error: 'La nueva contraseña debe ser diferente de la actual'
						};
					}
					if (
						message.includes('pwned') ||
						message.includes('leaked') ||
						message.includes('compromised')
					) {
						return {
							success: false,
							error: 'La nueva contraseña aparece filtrada. Elige una más segura.'
						};
					}
					return {
						success: false,
						error: updateError.message || 'No se pudo actualizar la contraseña'
					};
				}

				// Verifica que la nueva contraseña quedó activa para evitar bloqueos silenciosos.
				const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
					email: sessionUser.email,
					password: normalizedNewPassword
				});

				if (verifyError) {
					return {
						success: false,
						error:
							'La contraseña no pudo verificarse tras el cambio. Intenta nuevamente para evitar bloqueos.'
					};
				}

				store.resetSessionTimeout();
				return { success: true, message: 'Contraseña actualizada correctamente' };
			} catch (error) {
				console.error('Error cambiando contraseña:', error);
				return {
					success: false,
					error: 'No se pudo actualizar la contraseña. Intenta nuevamente.'
				};
			}
		},

		/**
		 * Reinicia el timer de timeout de sesión
		 */
		resetSessionTimeout() {
			if (sessionTimeoutHandle) {
				clearTimeout(sessionTimeoutHandle);
			}

			if (typeof window !== 'undefined') {
				sessionTimeoutHandle = setTimeout(() => {
					console.warn('Sesión expirada por timeout');
					store.logout();
				}, SESSION_TIMEOUT_MS);
			}
		},

		/**
		 * Cierra la sesión del usuario actual
		 */
		logout: async () => {
			if (sessionTimeoutHandle) {
				clearTimeout(sessionTimeoutHandle);
			}

			if (isSupabaseAuthEnabled && supabaseClient) {
				try {
					await supabaseClient.auth.signOut();
				} catch (error) {
					console.error('No se pudo cerrar sesión en Supabase Auth:', error);
				}
			}

			set(null);
			if (typeof window !== 'undefined') {
				sessionStorage.removeItem(SESSION_STORAGE_KEY);
				sessionStorage.removeItem(SESSION_EXPIRY_KEY);
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
		 * @returns {string|null} - 'admin', 'client', 'delivery' o null
		 */
		getRole: () => {
			let role = null;
			subscribe((session) => {
				role = session?.role || null;
			})();
			return role;
		},

		/**
		 * Obtiene el ID del usuario actual
		 * @returns {number|null}
		 */
		getUserId: () => {
			let id = null;
			subscribe((session) => {
				id = session?.id || null;
			})();
			return id;
		},

		/**
		 * Verifica si la sesión va a expirar pronto
		 * @returns {boolean}
		 */
		isSessionExpiringWarning: () => {
			if (typeof window === 'undefined') return false;
			const expiryStr = sessionStorage.getItem(SESSION_EXPIRY_KEY);
			if (!expiryStr) return false;
			const expiryTime = parseInt(expiryStr);
			const timeLeft = expiryTime - Date.now();
			return timeLeft < SESSION_TIMEOUT_MS - SESSION_WARNING_MS && timeLeft > 0;
		},
		syncWithSupabase: async () => {
			await syncSessionWithSupabaseAuth();
		}
	};

	return store;
}

// Exporta la instancia única del store de autenticación
export const authStore = createAuthStore();

if (typeof window !== 'undefined' && isSupabaseAuthEnabled && supabaseClient) {
	void (async () => {
		// Rehidrata la sesión local usando el token real de Supabase.
		await authStore.syncWithSupabase();
	})();

	supabaseClient.auth.onAuthStateChange(() => {
		void authStore.syncWithSupabase();
	});
}
