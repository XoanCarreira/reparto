<!-- PÁGINA: Login -->
<script>
	/**
	 * PÁGINA DE LOGIN
	 * Componente de autenticación que permite a usuarios entrar en el sistema
	 * Valida email y contraseña contra los datos mock
	 */

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
				await goto(resolve('/admin/dashboard'));
			} else if (result.user.role === 'client') {
				await goto(resolve('/client/orders'));
			} else if (result.user.role === 'delivery') {
				await goto(resolve('/delivery'));
			}
		} catch {
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
		} else if (role === 'delivery') {
			email = 'repartidor201@empresa.com';
			password = 'repartidor201';
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

<div class="login-page">
	<div class="login-shell">
		<!-- Encabezado -->
		<div class="login-header animate-fadeIn">
			<h1 class="login-title">📦 Reparto</h1>
			<p class="login-subtitle">Sistema de Gestión de Entregas</p>
		</div>

		<!-- Tarjeta de login -->
		<div class="login-card animate-slideInLeft">
			<h2 class="login-card-title">Bienvenido</h2>
			<p class="login-card-subtitle">Inicia sesión en tu cuenta</p>

			{#if error}
				<div class="login-error animate-fadeIn">
					⚠️ {error}
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="login-form">
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
					class="login-submit"
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
			<div class="test-credentials">
				<p class="test-credentials-title">Credenciales de prueba:</p>

				<div class="test-credentials-list">
					<button
						type="button"
						onclick={() => fillTestCredentials('admin')}
						class="test-credential-btn test-credential-btn-admin"
					>
						👤 Admin: admin@empresa.com
					</button>

					<button
						type="button"
						onclick={() => fillTestCredentials('delivery')}
						class="test-credential-btn test-credential-btn-delivery"
					>
						🚚 Repartidor: repartidor201@empresa.com
					</button>

					<button
						type="button"
						onclick={() => fillTestCredentials('client')}
						class="test-credential-btn test-credential-btn-client"
					>
						🏪 Cliente: cliente1@empresa.com
					</button>
				</div>

				<p class="test-credentials-note">
					Admin: admin123 • Repartidor: repartidor201 • Cliente: cliente123
				</p>
			</div>
		</div>

		<!-- Pie de página -->
		<p class="login-footer">
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

	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
		padding: 3.5rem 1.5rem;
	}

	.login-shell {
		width: 100%;
		max-width: 28rem;
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-title {
		font-size: 2.25rem;
		line-height: 1.1;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 0.5rem;
	}

	.login-subtitle {
		margin: 0;
		font-size: 1.125rem;
		color: #94a3b8;
	}

	.login-card {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		box-shadow: 0 24px 50px rgba(0, 0, 0, 0.45);
		padding: 2rem;
	}

	.login-card-title {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.login-card-subtitle {
		margin: 0 0 1.5rem;
		color: #94a3b8;
	}

	.login-error {
		margin-bottom: 1rem;
		padding: 1rem;
		background: rgba(127, 29, 29, 0.45);
		border: 1px solid rgba(220, 38, 38, 0.55);
		color: #fca5a5;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.login-form {
		display: grid;
		gap: 1rem;
	}

	:global(.login-submit) {
		width: 100%;
		margin-top: 1.5rem;
	}

	.test-credentials {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #334155;
	}

	.test-credentials-title {
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.test-credentials-list {
		display: grid;
		gap: 0.5rem;
	}

	.test-credential-btn {
		display: block;
		width: 100%;
		text-align: left;
		font-size: 0.875rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		transition: background-color 0.2s ease;
		cursor: pointer;
	}

	.test-credential-btn-admin {
		background: rgba(30, 58, 138, 0.35);
		border: 1px solid rgba(37, 99, 235, 0.5);
		color: #93c5fd;
	}

	.test-credential-btn-admin:hover {
		background: rgba(30, 64, 175, 0.5);
	}

	.test-credential-btn-delivery {
		background: rgba(124, 45, 18, 0.35);
		border: 1px solid rgba(251, 146, 60, 0.5);
		color: #fdba74;
	}

	.test-credential-btn-delivery:hover {
		background: rgba(154, 52, 18, 0.5);
	}

	.test-credential-btn-client {
		background: rgba(6, 95, 70, 0.35);
		border: 1px solid rgba(16, 185, 129, 0.5);
		color: #6ee7b7;
	}

	.test-credential-btn-client:hover {
		background: rgba(6, 120, 85, 0.5);
	}

	.test-credentials-note {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: #64748b;
	}

	.login-footer {
		margin-top: 2rem;
		text-align: center;
		font-size: 0.875rem;
		color: #94a3b8;
	}

	@media (min-width: 640px) {
		.login-page {
			padding: 4rem 2rem;
		}

		.login-card {
			padding: 2.5rem;
		}
	}

	@media (min-width: 1024px) {
		.login-page {
			padding: 5rem 3rem;
		}
	}
</style>
