/**
 * RATE LIMITER PARA FRONTEND
 * Protege contra múltiples requests consecutivos (DDoS, abuso)
 */

class RateLimiter {
	constructor(maxRequests = 5, windowMs = 60000) {
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;
		this.requests = new Map(); // Clave: identificador, valor: array de timestamps
	}

	/**
	 * Verifica si se puede hacer una request
	 * @param {string} key - Identificador único (email, user_id, etc)
	 * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
	 */
	isAllowed(key) {
		const now = Date.now();
		
		if (!this.requests.has(key)) {
			this.requests.set(key, []);
		}

		const requestTimes = this.requests.get(key);
		
		// Limpiar requests antiguos fuera de la ventana
		const validRequests = requestTimes.filter(time => now - time < this.windowMs);
		
		const allowed = validRequests.length < this.maxRequests;
		
		if (allowed) {
			validRequests.push(now);
			this.requests.set(key, validRequests);
		}

		const resetTime = validRequests.length > 0 ? validRequests[0] + this.windowMs : now;
		
		return {
			allowed,
			remaining: Math.max(0, this.maxRequests - validRequests.length),
			resetTime,
			retryAfter: Math.ceil((resetTime - now) / 1000)
		};
	}

	/**
	 * Reset de un usuario específico
	 * @param {string} key 
	 */
	reset(key) {
		this.requests.delete(key);
	}

	/**
	 * Reset global
	 */
	resetAll() {
		this.requests.clear();
	}
}

// Instancias globales de rate limiters
export const loginLimiter = new RateLimiter(5, 900000); // 5 intentos en 15 min
export const apiLimiter = new RateLimiter(100, 60000); // 100 requests en 1 min
export const searchLimiter = new RateLimiter(30, 60000); // 30 búsquedas en 1 min

/**
 * Hook para ejecutar función con rate limit
 * @param {string} identifier - Email, user_id, etc
 * @param {function} fn - Función a ejecutar
 * @param {RateLimiter} limiter - Limiter a usar (default: apiLimiter)
 * @returns {Promise<object>} { success, error?, data?, ...limitInfo }
 */
export async function withRateLimit(identifier, fn, limiter = apiLimiter) {
	const limitInfo = limiter.isAllowed(identifier);

	if (!limitInfo.allowed) {
		return {
			success: false,
			error: `Demasiadas solicitudes. Intenta de nuevo en ${limitInfo.retryAfter}s`,
			remaining: limitInfo.remaining,
			retryAfter: limitInfo.retryAfter
		};
	}

	try {
		const data = await fn();
		return {
			success: true,
			data,
			remaining: limitInfo.remaining,
			retryAfter: 0
		};
	} catch (error) {
		return {
			success: false,
			error: error.message,
			remaining: limitInfo.remaining,
			retryAfter: 0
		};
	}
}

/**
 * Middleware para Svelte/SvelteKit: Wrap en componentes que usan auth
 * Uso en un +page.svelte:
 * 
 * import { loginLimiter } from '$lib/utils/rateLimiter';
 * 
 * async function handleLogin(email, password) {
 *   const result = await withRateLimit(email, async () => {
 *     return authStore.login(email, password);
 *   }, loginLimiter);
 * }
 */

/**
 * Crea un wrapper debounce + rate limit para búsquedas
 * @param {function} searchFn 
 * @returns {function}
 */
export function createSearchWithRateLimit(searchFn, debounceMs = 300) {
	let debounceTimer;
	
	return async function(query, userId) {
		return new Promise((resolve) => {
			clearTimeout(debounceTimer);
			
			debounceTimer = setTimeout(async () => {
				const result = await withRateLimit(userId, () => searchFn(query), searchLimiter);
				resolve(result);
			}, debounceMs);
		});
	};
}

/**
 * Trackea intentos fallidos de login
 * Bloquea después de N intentos
 */
export class LoginAttemptTracker {
	constructor(maxAttempts = 5, lockoutTimeMs = 900000) {
		this.maxAttempts = maxAttempts;
		this.lockoutTimeMs = lockoutTimeMs;
		this.attempts = new Map(); // email -> { count, lastAttempt, lockedUntil }
	}

	/**
	 * Registra un intento de login fallido
	 * @param {string} email 
	 * @returns {boolean} - true si está bloqueado
	 */
	recordFailure(email) {
		const now = Date.now();
		let entry = this.attempts.get(email) || { count: 0, lastAttempt: now, lockedUntil: null };

		// Si estaba bloqueado, verificar si el bloqueo expiró
		if (entry.lockedUntil && now < entry.lockedUntil) {
			return true; // Aún está bloqueado
		}

		entry.count++;
		entry.lastAttempt = now;

		if (entry.count >= this.maxAttempts) {
			entry.lockedUntil = now + this.lockoutTimeMs;
		}

		this.attempts.set(email, entry);
		return entry.count >= this.maxAttempts;
	}

	/**
	 * Registra un login exitoso (reset de intentos)
	 * @param {string} email 
	 */
	recordSuccess(email) {
		this.attempts.delete(email);
	}

	/**
	 * Obtiene estado de intento
	 * @param {string} email 
	 * @returns {object}
	 */
	getStatus(email) {
		const now = Date.now();
		const entry = this.attempts.get(email);

		if (!entry) {
			return { isLocked: false, attempts: 0, lockedUntil: null };
		}

		const isLocked = entry.lockedUntil && now < entry.lockedUntil;

		return {
			isLocked,
			attempts: entry.count,
			lockedUntil: entry.lockedUntil,
			remaining: Math.max(0, this.maxAttempts - entry.count),
			retryAfter: isLocked ? Math.ceil((entry.lockedUntil - now) / 1000) : 0
		};
	}

	/**
	 * Reset manual
	 * @param {string} email 
	 */
	reset(email) {
		this.attempts.delete(email);
	}
}

export const loginAttemptTracker = new LoginAttemptTracker(5, 900000);
