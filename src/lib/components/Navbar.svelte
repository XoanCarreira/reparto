<!-- COMPONENTE: Barra de navegación -->
<script>
	/**
	 * NAVBAR - BARRA DE NAVEGACIÓN - Tema Oscuro
	 * Navegación principal de la aplicación según el rol del usuario
	 * Incluye logo, menú, información del usuario y botón de logout
	 */

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore.js';

	// Estado del menú en dispositivos móviles
	let mobileMenuOpen = $state(false);
	let currentUser = $state(null);
	let changePasswordOpen = $state(false);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let isChangingPassword = $state(false);

	// Se suscribe a cambios de autenticación
	authStore.subscribe((user) => {
		currentUser = user;
	});

	/**
	 * Cierra la sesión del usuario
	 */
	async function handleLogout() {
		authStore.logout();
		await goto(resolve('/'));
	}

	/**
	 * Navega a una ruta
	 */
	async function navigateTo(path) {
		mobileMenuOpen = false;
		await goto(resolve(path));
	}

	function getHomePathByRole(role) {
		if (role === 'admin') return '/admin/dashboard';
		if (role === 'client') return '/client/orders';
		if (role === 'delivery') return '/delivery';
		return '/';
	}

	function getRoleLabel(role) {
		if (role === 'admin') return 'Administrador';
		if (role === 'client') return 'Cliente';
		if (role === 'delivery') return 'Repartidor';
		return 'Usuario';
	}

	function openChangePassword() {
		mobileMenuOpen = false;
		passwordError = '';
		passwordSuccess = '';
		changePasswordOpen = true;
	}

	function closeChangePassword() {
		if (isChangingPassword) {
			return;
		}
		changePasswordOpen = false;
		passwordError = '';
	}

	function validatePasswordForm() {
		if (!currentPassword || !newPassword || !confirmPassword) {
			passwordError = 'Todos los campos son obligatorios';
			return false;
		}

		if (newPassword.length < 8) {
			passwordError = 'La nueva contraseña debe tener al menos 8 caracteres';
			return false;
		}

		if (newPassword !== confirmPassword) {
			passwordError = 'La confirmación no coincide con la nueva contraseña';
			return false;
		}

		if (currentPassword === newPassword) {
			passwordError = 'La nueva contraseña debe ser diferente de la actual';
			return false;
		}

		passwordError = '';
		return true;
	}

	async function requestPasswordChange() {
		passwordSuccess = '';
		if (!validatePasswordForm()) {
			return;
		}

		if (typeof window !== 'undefined') {
			const confirmed = window.confirm(
				'Esta acción actualizará tu credencial de acceso. ¿Deseas continuar?'
			);
			if (!confirmed) {
				return;
			}
		}

		await confirmPasswordChange();
	}

	async function confirmPasswordChange() {
		isChangingPassword = true;
		passwordError = '';

		const result = await authStore.changePassword({
			currentPassword,
			newPassword,
			confirmPassword
		});

		isChangingPassword = false;

		if (!result.success) {
			passwordError = result.error || 'No se pudo cambiar la contraseña';
			return;
		}

		passwordSuccess = result.message || 'Contraseña actualizada correctamente';
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
	}
</script>

<nav class="navbar">
	<div class="navbar-container">
		<div class="navbar-row">
			<!-- Logo y título -->
			<div class="navbar-brand-wrap">
				<button
					onclick={() => navigateTo(getHomePathByRole(currentUser?.role))}
					class="navbar-brand"
				>
					<img class="navbar-logo" src='../logo_xeos.png' alt="Xeos da Ulla">
					
				</button>
			</div>

			<!-- Menú de navegación (Desktop) -->
			<div class="navbar-desktop-menu">
				{#if currentUser?.role === 'admin'}
					<!-- Menú Admin -->
					<button
						onclick={() => navigateTo('/admin/dashboard')}
						class="nav-link"
					>
						📊 Dashboard
					</button>
					<button
						onclick={() => navigateTo('/admin/orders')}
						class="nav-link"
					>
						📦 Pedidos
					</button>
					<button
						onclick={() => navigateTo('/admin/stock')}
						class="nav-link"
					>
						📋 Stock
					</button>
					<button
						onclick={() => navigateTo('/admin/incidents')}
						class="nav-link"
					>
						⚠️ Incidencias
					</button>
					<button
						onclick={() => navigateTo('/admin/clients')}
						class="nav-link"
					>
						👥 Clientes
					</button>
					<button
						onclick={() => navigateTo('/admin/routes')}
						class="nav-link"
					>
						🗺️ Rutas
					</button>
				{:else if currentUser?.role === 'client'}
					<!-- Menú Cliente -->
					<button
						onclick={() => navigateTo('/client/orders')}
						class="nav-link"
					>
						📦 Mis Pedidos
					</button>
					<button
						onclick={() => navigateTo('/client/products')}
						class="nav-link"
					>
						🛍️ Catálogo
					</button>
					<button
						onclick={() => navigateTo('/client/profile')}
						class="nav-link"
					>
						👤 Mi Perfil
					</button>
				{:else if currentUser?.role === 'delivery'}
					<button
						onclick={() => navigateTo('/delivery')}
						class="nav-link"
					>
						🗺️ Mi Ruta
					</button>
				{/if}
			</div>

			<!-- Información del usuario y logout (Desktop) -->
			<div class="navbar-desktop-user">
				<div class="navbar-user-info">
					<p class="navbar-user-name">{currentUser?.name || 'Usuario'}</p>
					<p class="navbar-user-role">{getRoleLabel(currentUser?.role)}</p>
				</div>

				<button
					onclick={openChangePassword}
					class="navbar-password-btn"
				>
					Contraseña
				</button>

				<button
					onclick={handleLogout}
					class="navbar-logout"
				>
					Salir
				</button>
			</div>

			<!-- Botón de menú móvil y usuario -->
			<div class="navbar-mobile-actions">
				<div class="navbar-mobile-user">
					<p class="navbar-mobile-user-name">{currentUser?.name || 'Usuario'}</p>
				</div>
				<button
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="navbar-mobile-toggle"
				>
					☰
				</button>
			</div>
		</div>

		<!-- Menú móvil -->
		{#if mobileMenuOpen}
			<div class="navbar-mobile-menu animate-fadeIn">
				<div class="navbar-mobile-list">
					{#if currentUser?.role === 'admin'}
						<button
							onclick={() => navigateTo('/admin/dashboard')}
							class="navbar-mobile-link"
						>
							📊 Dashboard
						</button>
						<button
							onclick={() => navigateTo('/admin/orders')}
							class="navbar-mobile-link"
						>
							📦 Pedidos
						</button>
						<button
							onclick={() => navigateTo('/admin/stock')}
							class="navbar-mobile-link"
						>
							📋 Stock
						</button>
						<button
							onclick={() => navigateTo('/admin/incidents')}
							class="navbar-mobile-link"
						>
							⚠️ Incidencias
						</button>
						<button
							onclick={() => navigateTo('/admin/clients')}
							class="navbar-mobile-link"
						>
							👥 Clientes
						</button>
						<button
							onclick={() => navigateTo('/admin/routes')}
							class="navbar-mobile-link"
						>
							🗺️ Rutas
						</button>
					{:else if currentUser?.role === 'client'}
						<button
							onclick={() => navigateTo('/client/orders')}
							class="navbar-mobile-link"
						>
							📦 Mis Pedidos
						</button>
						<button
							onclick={() => navigateTo('/client/products')}
							class="navbar-mobile-link"
						>
							🛍️ Catálogo
						</button>
						<button
							onclick={() => navigateTo('/client/profile')}
							class="navbar-mobile-link"
						>
							👤 Mi Perfil
						</button>
					{:else if currentUser?.role === 'delivery'}
						<button
							onclick={() => navigateTo('/delivery')}
							class="navbar-mobile-link"
						>
							🗺️ Mi Ruta
						</button>
					{/if}

					<div class="navbar-mobile-divider">
						<button
							onclick={openChangePassword}
							class="navbar-mobile-link"
						>
							🔐 Cambiar contraseña
						</button>

						<button
							onclick={handleLogout}
							class="navbar-mobile-logout"
						>
							🚪 Salir
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</nav>

{#if changePasswordOpen}
	<div class="password-modal-overlay" role="presentation">
		<div class="password-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
			<div class="password-modal-header">
				<h3 id="change-password-title" class="password-modal-title">Cambiar contraseña</h3>
				<button class="password-modal-close" type="button" onclick={closeChangePassword}>✕</button>
			</div>

			<p class="password-modal-help">
				Para evitar bloqueos, te pedimos tu contraseña actual y confirmación de la nueva.
			</p>

			<form
				onsubmit={async (event) => {
					event.preventDefault();
					await requestPasswordChange();
				}}
				class="password-form"
			>
				<label class="password-label" for="current-password">Contraseña actual</label>
				<input
					id="current-password"
					type="password"
					class="password-input"
					bind:value={currentPassword}
					autocomplete="current-password"
					required
				/>

				<label class="password-label" for="new-password">Nueva contraseña</label>
				<input
					id="new-password"
					type="password"
					class="password-input"
					bind:value={newPassword}
					autocomplete="new-password"
					required
				/>

				<label class="password-label" for="confirm-password">Confirmar nueva contraseña</label>
				<input
					id="confirm-password"
					type="password"
					class="password-input"
					bind:value={confirmPassword}
					autocomplete="new-password"
					required
				/>

				{#if passwordError}
					<p class="password-feedback password-feedback-error">{passwordError}</p>
				{/if}
				{#if passwordSuccess}
					<p class="password-feedback password-feedback-success">{passwordSuccess}</p>
				{/if}

				<div class="password-actions">
					<button type="button" class="password-btn password-btn-secondary" onclick={closeChangePassword}>
						Cancelar
					</button>
					<button type="submit" class="password-btn password-btn-primary" disabled={isChangingPassword}>
						{isChangingPassword ? 'Guardando...' : 'Guardar nueva contraseña'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.navbar {
		position: sticky;
		top: 0;
		z-index: 40;
		background: #0f172a;
		border-bottom: 1px solid #334155;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
	}

	.navbar-container {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.navbar-row {
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.navbar-logo{
		max-width: 80px;
	}

	.navbar-brand {
		display: inline-flex;
		align-items: center;
		transition: opacity 0.2s ease;
		padding: 5px 10px;
		border-radius: 0.5rem;
		background-color: white;
	}

	.navbar-brand:hover {
		opacity: 0.85;
	}




	.navbar-desktop-menu,
	.navbar-desktop-user {
		display: none;
	}

	.nav-link {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #cbd5e1;
		transition: color 0.2s ease, background-color 0.2s ease;
	}

	.nav-link:hover {
		color: #f1f5f9;
		background: #1e293b;
	}

	.navbar-user-info {
		text-align: right;
	}

	.navbar-user-name {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #f1f5f9;
	}

	.navbar-user-role {
		margin: 0;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.navbar-logout {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #fff;
		background: #dc2626;
		border: 1px solid #ef4444;
		border-radius: 0.5rem;
		transition: background-color 0.2s ease;
	}

	.navbar-password-btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #dbeafe;
		background: #1d4ed8;
		border: 1px solid #3b82f6;
		border-radius: 0.5rem;
		transition: background-color 0.2s ease;
	}

	.navbar-password-btn:hover {
		background: #2563eb;
	}

	.navbar-logout:hover {
		background: #ef4444;
	}

	.navbar-mobile-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.navbar-mobile-user {
		text-align: right;
		font-size: 0.875rem;
	}

	.navbar-mobile-user-name {
		margin: 0;
		max-width: 10rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
		color: #f1f5f9;
	}

	.navbar-mobile-toggle {
		padding: 0.5rem;
		color: #cbd5e1;
		border-radius: 0.5rem;
		transition: color 0.2s ease, background-color 0.2s ease;
	}

	.navbar-mobile-toggle:hover {
		color: #f1f5f9;
		background: #1e293b;
	}

	.navbar-mobile-menu {
		border-top: 1px solid #334155;
		padding: 1rem 0;
		background: #1e293b;
	}

	.navbar-mobile-list {
		display: grid;
		gap: 0.25rem;
	}

	.navbar-mobile-link,
	.navbar-mobile-logout {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		transition: color 0.2s ease, background-color 0.2s ease;
	}

	.navbar-mobile-link {
		color: #cbd5e1;
	}

	.navbar-mobile-link:hover {
		color: #f1f5f9;
		background: #334155;
	}

	.navbar-mobile-divider {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #334155;
	}

	.navbar-mobile-logout {
		font-weight: 500;
		color: #fca5a5;
	}

	.navbar-mobile-logout:hover {
		color: #fecaca;
		background: rgba(127, 29, 29, 0.4);
	}

	@media (min-width: 640px) {
		.navbar-container {
			padding: 0 1.5rem;
		}


	}

	@media (min-width: 768px) {
		.navbar-desktop-menu {
			display: flex;
			align-items: center;
			gap: 0.25rem;
		}

		.navbar-desktop-user {
			display: flex;
			align-items: center;
			gap: 1rem;
		}

		.navbar-mobile-actions,
		.navbar-mobile-menu {
			display: none;
		}
	}

	@media (min-width: 1024px) {
		.navbar-container {
			padding: 0 2rem;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.3s ease-in-out;
	}

	button{
		background-color: #334155;
	}

	.password-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(2, 6, 23, 0.72);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 80;
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	.password-modal {
		width: min(520px, 100%);
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.75rem;
		padding: 1.2rem;
		box-shadow: 0 20px 34px rgba(0, 0, 0, 0.45);
	}

	.password-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
	}

	.password-modal-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.password-modal-close {
		border: 1px solid #475569;
		background: #334155;
		color: #e2e8f0;
		border-radius: 0.45rem;
		padding: 0.25rem 0.45rem;
	}

	.password-modal-help {
		margin: 0.75rem 0 0;
		font-size: 0.9rem;
		color: #cbd5e1;
	}

	.password-form {
		display: grid;
		gap: 0.65rem;
		margin-top: 0.9rem;
	}

	.password-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.password-input {
		width: 100%;
		padding: 0.55rem 0.8rem;
		border: 1px solid #475569;
		border-radius: 0.5rem;
		background: #334155;
		color: #f1f5f9;
	}

	.password-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
	}

	.password-feedback {
		margin: 0.25rem 0 0;
		font-size: 0.86rem;
	}

	.password-feedback-error {
		color: #fca5a5;
	}

	.password-feedback-success {
		color: #86efac;
	}

	.password-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		margin-top: 0.6rem;
	}

	.password-btn {
		border-radius: 0.5rem;
		padding: 0.55rem 0.9rem;
		font-size: 0.88rem;
		font-weight: 600;
		border: 1px solid transparent;
	}

	.password-btn-secondary {
		background: #334155;
		border-color: #475569;
		color: #e2e8f0;
	}

	.password-btn-primary {
		background: #0284c7;
		border-color: #0ea5e9;
		color: #e0f2fe;
	}

	.password-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
