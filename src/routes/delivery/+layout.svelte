<!-- LAYOUT: Repartidor -->
<script>
	/**
	 * LAYOUT DEL REPARTIDOR
	 * Protege el acceso: solo usuarios con rol 'delivery'
	 * Reutiliza la misma estructura visual del resto de roles.
	 */

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/authStore.js';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
	let currentUser = $state();
	let isLoading = $state(true);

	authStore.subscribe((user) => {
		currentUser = user;

		if (!browser) {
			return;
		}

		isLoading = false;

		if (user && user.role !== 'delivery') {
			if (user.role === 'admin') {
				goto(resolve('/admin/dashboard'));
			} else if (user.role === 'client') {
				goto(resolve('/client/orders'));
			} else {
				goto(resolve('/'));
			}
		} else if (!user) {
			goto(resolve('/'));
		}
	});
</script>

<svelte:head>
	<title>Repartidor - Reparto</title>
</svelte:head>

{#if isLoading}
	<div class="layout-screen layout-screen-loading">
		<div class="layout-loading-content">
			<div class="layout-spinner animate-spin"></div>
			<p class="layout-loading-text">Cargando...</p>
		</div>
	</div>
{:else if currentUser?.role === 'delivery'}
	<div class="layout-screen">
		<Navbar title="Panel de Repartidor" />

		<main class="layout-main">
			{@render children()}
		</main>

		<footer class="layout-footer">
			<div class="layout-footer-inner">
				<p class="layout-footer-text">
					© 2024 Reparto - Sistema de Gestión de Entregas • Versión 1.0.0
				</p>
			</div>
		</footer>
	</div>
{:else}
	<div class="layout-screen layout-screen-centered">
		<div class="layout-redirect-box">
			<p class="layout-redirect-title">Redirigiendo al inicio de sesión...</p>
			<p class="layout-redirect-note">Si no cambia automáticamente, vuelve a iniciar sesión.</p>
		</div>
	</div>
{/if}

<style>
	.layout-screen {
		min-height: 100vh;
		background: #0f172a;
	}

	.layout-screen-loading,
	.layout-screen-centered {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.layout-loading-content,
	.layout-redirect-box {
		text-align: center;
	}

	.layout-spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid #334155;
		border-top-color: #3b82f6;
		border-radius: 999px;
		margin: 0 auto 1rem;
	}

	.layout-loading-text {
		color: #94a3b8;
	}

	.layout-main {
		max-width: 80rem;
		margin: 0 auto;
		padding: 2rem 0.5rem 3rem;
	}

	.layout-footer {
		margin-top: 4rem;
		background: #1e293b;
		border-top: 1px solid #334155;
	}

	.layout-footer-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.layout-footer-text {
		text-align: center;
		font-size: 0.875rem;
		color: #94a3b8;
		margin: 0;
	}

	.layout-redirect-box {
		max-width: 28rem;
		padding: 0 1rem;
	}

	.layout-redirect-title {
		margin: 0;
		font-weight: 500;
		color: #e2e8f0;
	}

	.layout-redirect-note {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		color: #94a3b8;
	}

	@media (min-width: 640px) {
		.layout-main {
			padding: 2rem 1rem 3rem;
		}

		.layout-footer-inner {
			padding: 2rem 1.5rem;
		}
	}

	@media (min-width: 1024px) {
		.layout-main {
			padding: 2.5rem 2rem 3rem;
		}

		.layout-footer-inner {
			padding: 2rem;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
