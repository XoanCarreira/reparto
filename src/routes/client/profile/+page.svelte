<!-- PÁGINA: Perfil Cliente -->
<script>
	/**
	 * PÁGINA DE PERFIL DEL CLIENTE
	 * Muestra información de la account y estadísticas personales
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore.js';
	import { ordersStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDate } from '$lib/utils/helpers.js';
	import { zones } from '$lib/data/mockData.js';

	let currentUser = $state(null);
	let userOrders = $state([]);
	let userZone = $state(null);

	// Se suscribe a autenticación
	authStore.subscribe((user) => {
		currentUser = user;
		if (user?.zone) {
			userZone = zones.find((z) => z.id === user.zone);
		} else {
			userZone = null;
		}
	});

	// Se suscribe a órdenes
	ordersStore.subscribe(($orders) => {
		if (currentUser?.id) {
			userOrders = $orders.filter((o) => o.clientId === currentUser.id);
		} else {
			userOrders = [];
		}
	});

	/**
	 * Calcula el total gastado
	 */
	function getTotalSpent() {
		return userOrders.reduce((sum, order) => sum + order.totalAmount, 0);
	}

	/**
	 * Cuenta pedidos por estado
	 */
	function countByStatus(status) {
		return userOrders.filter((o) => o.status === status).length;
	}

	/**
	 * Obtiene el ticket promedio
	 */
	function getAverageOrderValue() {
		if (userOrders.length === 0) return 0;
		return getTotalSpent() / userOrders.length;
	}
</script>

<svelte:head>
	<title>Mi Perfil - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<!-- Encabezado -->
	<div class="page-header">
		<h1 class="page-title">👤 Mi Perfil</h1>
		<p class="page-subtitle">Información de tu cuenta y estadísticas personales</p>
	</div>

	<!-- Información del perfil -->
	{#if currentUser}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Datos personales -->
			<Card title="📋 Información Personal" titleClass="text-cyan-200" class="glass-cyan">
				<div class="space-y-4">
					<div>
						<p class="fs-sm txt-muted">Nombre de la Empresa</p>
						<p class="fs-lg fw-bold txt-primary mt-1">{currentUser.name}</p>
					</div>

					<div>
						<p class="fs-sm txt-muted">Email</p>
						<p class="txt-primary mt-1">{currentUser.email}</p>
					</div>

					<div>
						<p class="fs-sm txt-muted">Rol en el sistema</p>
						<div class="mt-1">
							<Badge status={currentUser.role === 'client' ? 'active' : 'pending'} />
						</div>
					</div>

					<div>
						<p class="fs-sm txt-muted">Miembro desde</p>
						<p class="txt-primary mt-1">{formatDate(currentUser.loginAt)}</p>
					</div>
				</div>
			</Card>

			<!-- Zona de reparto -->
			{#if userZone}
				<Card title="📍 Zona de Reparto" titleClass="text-violet-200" class="glass-violet">
					<div class="space-y-4">
						<div>
							<p class="fs-sm txt-muted">Zona asignada</p>
							<p class="fs-lg fw-bold txt-primary mt-1">{userZone.name}</p>
						</div>

						<div>
							<p class="fs-sm txt-muted">Descripción</p>
							<p class="txt-primary mt-1">{userZone.description}</p>
						</div>

						<div>
							<p class="fs-sm txt-muted">Ubicación</p>
							<p class="txt-primary mt-1">{userZone.address}</p>
						</div>

						<div>
							<p class="fs-sm txt-muted">Horario de reparto</p>
							<p class="txt-primary mt-1">{userZone.deliveryTime}</p>
						</div>

						<div>
							<p class="fs-sm txt-muted">Días de reparto</p>
							<p class="txt-primary mt-1">{userZone.deliveryDays.join(', ')}</p>
						</div>
					</div>
				</Card>
			{/if}
		</div>
	{/if}

	<!-- Estadísticas de pedidos -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<Card class="glass-blue">
			<div class="text-center">
				<div class="fs-4xl fw-bold text-blue-600 mb-2">{userOrders.length}</div>
				<p class="txt-soft fw-medium">Pedidos Totales</p>
			</div>
		</Card>

		<Card class="glass-emerald">
			<div class="text-center">
				<div class="fs-4xl fw-bold text-green-600 mb-2">{countByStatus('delivered')}</div>
				<p class="txt-soft fw-medium">Entregados</p>
			</div>
		</Card>

		<Card class="glass-amber">
			<div class="text-center">
				<div class="fs-4xl fw-bold text-yellow-600 mb-2">{countByStatus('pending')}</div>
				<p class="txt-soft fw-medium">Pendientes</p>
			</div>
		</Card>

		<Card class="glass-violet">
			<div class="text-center">
				<div class="fs-2xl fw-bold text-purple-600 mb-2">
					{formatCurrency(getAverageOrderValue())}
				</div>
				<p class="txt-soft fw-medium">Ticket Promedio</p>
			</div>
		</Card>
	</div>

	<!-- Resumen financiero -->
	<Card title="💰 Resumen Financiero" titleClass="text-emerald-300" class="glass-emerald">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="panel-surface-soft radius-lg p-4">
				<p class="fs-sm txt-muted mb-2">Total Gastado</p>
				<p class="fs-3xl fw-bold text-green-600">{formatCurrency(getTotalSpent())}</p>
			</div>

			<div class="panel-surface-soft radius-lg p-4">
				<p class="fs-sm txt-muted mb-2">Pedidos Realizados</p>
				<p class="fs-3xl fw-bold text-blue-600">{userOrders.length}</p>
			</div>

			<div class="panel-surface-soft radius-lg p-4">
				<p class="fs-sm txt-muted mb-2">Valor Promedio</p>
				<p class="fs-3xl fw-bold text-purple-600">{formatCurrency(getAverageOrderValue())}</p>
			</div>
		</div>
	</Card>

	<!-- Estado de pedidos -->
	{#if userOrders.length > 0}
		<Card title="📊 Distribución de Pedidos" titleClass="text-blue-300" class="glass-blue">
			<div class="space-y-4">
				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="txt-soft fw-medium">Entregados</span>
						<span class="bg-green-100 text-green-800 px-3 py-1 radius-full fw-semibold">
							{countByStatus('delivered')}
						</span>
					</div>
					<div class="w-full bg-panel-soft radius-full h-2">
						<div
							class="bg-green-500 h-2 radius-full"
							style="width: {(countByStatus('delivered') / userOrders.length) * 100}%"
						></div>
					</div>
				</div>

				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="txt-soft fw-medium">Pendientes</span>
						<span class="bg-yellow-100 text-yellow-800 px-3 py-1 radius-full fw-semibold">
							{countByStatus('pending')}
						</span>
					</div>
					<div class="w-full bg-panel-soft radius-full h-2">
						<div
							class="bg-yellow-500 h-2 radius-full"
							style="width: {(countByStatus('pending') / userOrders.length) * 100}%"
						></div>
					</div>
				</div>

				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="txt-soft fw-medium">Cancelados</span>
						<span class="bg-red-100 text-red-800 px-3 py-1 radius-full fw-semibold">
							{countByStatus('cancelled')}
						</span>
					</div>
					<div class="w-full bg-panel-soft radius-full h-2">
						<div
							class="bg-red-500 h-2 radius-full"
							style="width: {(countByStatus('cancelled') / userOrders.length) * 100}%"
						></div>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Acciones rápidas -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<a
			href={resolve('/client/orders')}
			class="block p-4 panel-surface radius-lg hover:bg-panel-soft/70 transition-colors text-center"
		>
			<p class="text-blue-700 fw-medium">📦 Ver mis pedidos</p>
				<p class="fs-sm text-blue-400 mt-1">Gestiona tus solicitudes de entrega</p>
		</a>

		<a
			href={resolve('/client/products')}
			class="block p-4 panel-surface radius-lg hover:bg-panel-soft/70 transition-colors text-center"
		>
			<p class="text-green-700 fw-medium">🛍️ Ver catálogo</p>
				<p class="fs-sm text-green-400 mt-1">Explora nuestros productos</p>
		</a>
	</div>
</div>

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.5s ease-in-out;
	}
</style>
