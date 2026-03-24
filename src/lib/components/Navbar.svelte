<!-- COMPONENTE: Barra de navegación -->
<script>
	/**
	 * NAVBAR - BARRA DE NAVEGACIÓN
	 * Navegación principal de la aplicación según el rol del usuario
	 * Incluye logo, menú, información del usuario y botón de logout
	 */

	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore.js';

	const title = '';

	// Estado del menú en dispositivos móviles
	let mobileMenuOpen = false;
	let currentUser;
	let showUserMenu = false;

	// Se suscribe a cambios de autenticación
	authStore.subscribe((user) => {
		currentUser = user;
	});

	/**
	 * Cierra la sesión del usuario
	 */
	async function handleLogout() {
		authStore.logout();
		await goto('/');
	}

	/**
	 * Navega a una ruta
	 */
	async function navigateTo(path) {
		mobileMenuOpen = false;
		showUserMenu = false;
		await goto(path);
	}
</script>

<nav class="bg-white shadow-md border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo y título -->
			<div class="flex items-center">
				<button
					onclick={() => navigateTo(currentUser?.role === 'admin' ? '/admin/dashboard' : '/client/orders')}
					class="flex items-center gap-2 hover:opacity-80 transition-opacity"
				>
					<span class="text-2xl">📦</span>
					<span class="font-bold text-gray-800">Reparto</span>
				</button>
			</div>

			<!-- Menú de navegación (Desktop) -->
			<div class="hidden md:flex items-center gap-8">
				{#if currentUser?.role === 'admin'}
					<!-- Menú Admin -->
					<button
						onclick={() => navigateTo('/admin/dashboard')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						📊 Dashboard
					</button>
					<button
						onclick={() => navigateTo('/admin/orders')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						📦 Pedidos
					</button>
					<button
						onclick={() => navigateTo('/admin/stock')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						📋 Stock
					</button>
					<button
						onclick={() => navigateTo('/admin/incidents')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						⚠️ Incidencias
					</button>
					<button
						onclick={() => navigateTo('/admin/clients')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						👥 Clientes
					</button>
				{:else if currentUser?.role === 'client'}
					<!-- Menú Cliente -->
					<button
						onclick={() => navigateTo('/client/orders')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						📦 Mis Pedidos
					</button>
					<button
						onclick={() => navigateTo('/client/products')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						🛍️ Catálogo
					</button>
					<button
						onclick={() => navigateTo('/client/profile')}
						class="text-gray-700 hover:text-blue-600 transition-colors font-medium"
					>
						👤 Mi Perfil
					</button>
				{/if}
			</div>

			<!-- Información del usuario y logout (Desktop) -->
			<div class="hidden md:flex items-center gap-4">
				<div class="text-right">
					<p class="text-sm font-medium text-gray-800">{currentUser?.name || 'Usuario'}</p>
					<p class="text-xs text-gray-500">{currentUser?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
				</div>

				<button
					onclick={handleLogout}
					class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
				>
					Salir
				</button>
			</div>

			<!-- Botón de menú móvil -->
			<button
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				class="md:hidden text-gray-700 hover:text-blue-600 transition-colors"
			>
				☰
			</button>
		</div>

		<!-- Menú móvil -->
		{#if mobileMenuOpen}
			<div class="md:hidden border-t border-gray-200 py-4 animate-slideDown">
				{#if currentUser?.role === 'admin'}
					<button
						onclick={() => navigateTo('/admin/dashboard')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						📊 Dashboard
					</button>
					<button
						onclick={() => navigateTo('/admin/orders')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						📦 Pedidos
					</button>
					<button
						onclick={() => navigateTo('/admin/stock')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						📋 Stock
					</button>
					<button
						onclick={() => navigateTo('/admin/incidents')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						⚠️ Incidencias
					</button>
					<button
						onclick={() => navigateTo('/admin/clients')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						👥 Clientes
					</button>
				{:else if currentUser?.role === 'client'}
					<button
						onclick={() => navigateTo('/client/orders')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						📦 Mis Pedidos
					</button>
					<button
						onclick={() => navigateTo('/client/products')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						🛍️ Catálogo
					</button>
					<button
						onclick={() => navigateTo('/client/profile')}
						class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
					>
						👤 Mi Perfil
					</button>
				{/if}

				<div class="border-t border-gray-200 mt-2 pt-2">
					<button
						onclick={handleLogout}
						class="block w-full text-left px-4 py-2 text-red-700 hover:bg-red-50"
					>
						🚪 Salir
					</button>
				</div>
			</div>
		{/if}
	</div>
</nav>

<style>
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-slideDown {
		animation: slideDown 0.3s ease-in-out;
	}
</style>
