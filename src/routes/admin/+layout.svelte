<!-- LAYOUT: Admin -->
<script>
	/**
	 * LAYOUT DEL ADMIN
	 * Página contenedora para todas las páginas del administrador
	 * Protege el acceso: solo usuarios con rol 'admin' pueden verla
	 * Incluye la navegación y estructura común
	 */

	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/authStore.js';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
	let currentUser = $state();
	let isLoading = $state(true);

	// Se suscribe a cambios de autenticación
	authStore.subscribe((user) => {
		currentUser = user;

		if (!browser) {
			return;
		}

		isLoading = false;

		// Protege la ruta: redirige si no es admin
		if (user && user.role !== 'admin') {
			goto('/client/orders');
		} else if (!user) {
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>Admin - Reparto</title>
</svelte:head>

{#if isLoading}
	<!-- Pantalla de carga -->
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600">Cargando...</p>
		</div>
	</div>
{:else if currentUser?.role === 'admin'}
	<!-- Interfaz del admin -->
	<div class="min-h-screen bg-gray-50">
		<Navbar title="Panel de Administrador" />

		<!-- Contenido principal -->
		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{@render children()}
		</main>

		<!-- Pie de página -->
		<footer class="bg-white border-t border-gray-200 mt-12">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<p class="text-center text-gray-600 text-sm">
					© 2024 Reparto - Sistema de Gestión de Entregas • Versión 1.0.0
				</p>
			</div>
		</footer>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
		<div class="text-center max-w-md">
			<p class="text-gray-700 font-medium">Redirigiendo al inicio de sesion...</p>
			<p class="text-sm text-gray-500 mt-2">Si no cambia automaticamente, vuelve a iniciar sesion.</p>
		</div>
	</div>
{/if}

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
