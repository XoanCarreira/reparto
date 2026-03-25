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
</style>
