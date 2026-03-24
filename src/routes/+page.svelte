<!-- PÁGINA: Login -->
<script>
	/**
	 * PÁGINA DE LOGIN
	 * Componente de autenticación que permite a usuarios entrar en el sistema
	 * Valida email y contraseña contra los datos mock
	 */

	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore.js';
	import Button from '$lib/components/Button.svelte';
	import InputField from '$lib/components/InputField.svelte';
	import { isValidEmail } from '$lib/utils/helpers.js';

	// Variables reactivas del formulario
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let emailError = $state('');
	let passwordError = $state('');
	let isSubmitting = $state(false);

	/**
	 * Maneja el envío del formulario de login
	 * Valida los datos y autentica el usuario
	 */
	async function handleLogin() {
		error = '';
		emailError = '';
		passwordError = '';

		// Validaciones básicas
		if (!email.trim()) {
			emailError = 'El email es requerido';
		} else if (!isValidEmail(email)) {
			emailError = 'Por favor ingresa un email válido';
		}

		if (!password) {
			passwordError = 'La contraseña es requerida';
		} else if (password.length < 6) {
			passwordError = 'La contraseña debe tener al menos 6 caracteres';
		}

		if (emailError || passwordError) return;

		isSubmitting = true;

		try {
			// Intenta autenticar usando el store
			const result = authStore.login(email, password);

			if (!result.success) {
				error = result.error;
				isSubmitting = false;
				return;
			}

			// Login exitoso - redirige según el rol
			await new Promise((resolve) => setTimeout(resolve, 500)); // Simula pequeño delay

			if (result.user.role === 'admin') {
				await goto('/admin/dashboard');
			} else if (result.user.role === 'client') {
				await goto('/client/orders');
			}
		} catch (err) {
			error = 'Error al iniciar sesión. Por favor intenta nuevamente.';
			isSubmitting = false;
		}
	}

	/**
	 * Llena el formulario con credenciales de prueba (para desarrollo)
	 */
	function fillTestCredentials(role = 'admin') {
		if (role === 'admin') {
			email = 'admin@empresa.com';
			password = 'admin123';
		} else {
			email = 'cliente1@empresa.com';
			password = 'cliente123';
		}
	}

	/**
	 * Maneja la presión de Enter en los campos
	 */
	function handleKeyDown(e) {
		if (e.key === 'Enter') {
			handleLogin();
		}
	}
</script>

<svelte:head>
	<title>Login - Reparto</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<!-- Encabezado -->
		<div class="text-center mb-8 animate-fadeIn">
			<h1 class="text-4xl font-bold text-white mb-2">📦 Reparto</h1>
			<p class="text-blue-100 text-lg">Sistema de Gestión de Entregas</p>
		</div>

		<!-- Tarjeta de login -->
		<div class="bg-white rounded-lg shadow-2xl p-8 animate-slideInLeft">
			<h2 class="text-2xl font-bold text-gray-800 mb-1">Bienvenido</h2>
			<p class="text-gray-600 mb-6">Inicia sesión en tu cuenta</p>

			{#if error}
				<div
					class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm animate-fadeIn"
				>
					⚠️ {error}
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
				<!-- Campo Email -->
				<InputField
					label="Email"
					type="email"
					bind:value={email}
					placeholder="tu@email.com"
					error={emailError}
					required
					onkeydown={handleKeyDown}
					id="email"
				/>

				<!-- Campo Contraseña -->
				<InputField
					label="Contraseña"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					error={passwordError}
					required
					onkeydown={handleKeyDown}
					id="password"
				/>

				<!-- Botón de login -->
				<Button
					variant="primary"
					size="lg"
					loading={isSubmitting}
					class="w-full mt-6"
					onclick={handleLogin}
				>
					{#if isSubmitting}
						Iniciando sesión...
					{:else}
						Iniciar Sesión
					{/if}
				</Button>
			</form>

			<!-- Credenciales de prueba para desarrollo -->
			<div class="mt-8 pt-6 border-t border-gray-200">
				<p class="text-sm text-gray-600 mb-3 font-medium">Credenciales de prueba:</p>

				<div class="space-y-2">
					<button
						type="button"
						onclick={() => fillTestCredentials('admin')}
						class="w-full text-left text-sm px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors"
					>
						👤 Admin: admin@empresa.com
					</button>

					<button
						type="button"
						onclick={() => fillTestCredentials('client')}
						class="w-full text-left text-sm px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors"
					>
						🏪 Cliente: cliente1@empresa.com
					</button>
				</div>

				<p class="text-xs text-gray-500 mt-2">
					Admin: admin123 • Cliente: cliente123
				</p>
			</div>
		</div>

		<!-- Pie de página -->
		<p class="text-center text-blue-100 text-sm mt-8">
			Sistema de entregas seguro y escalable para tu negocio
		</p>
	</div>
</div>

<style>
	:global(.animate-fadeIn) {
		animation: fadeIn 0.5s ease-in-out;
	}

	:global(.animate-slideInLeft) {
		animation: slideInLeft 0.5s ease-in-out 0.2s both;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideInLeft {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
