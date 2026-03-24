<!-- PÁGINA: Perfil Cliente -->
<script>
	/**
	 * PÁGINA DE PERFIL DEL CLIENTE
	 * Muestra información de la account y estadísticas personales
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { authStore } from '$lib/stores/authStore.js';
	import { ordersStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDate } from '$lib/utils/helpers.js';
	import { zones } from '$lib/data/mockData.js';

	let currentUser;
	let userOrders = [];
	let userZone;

	// Se suscribe a autenticación
	authStore.subscribe((user) => {
		currentUser = user;
		if (user?.zone) {
			userZone = zones.find((z) => z.id === user.zone);
		}
	});

	// Se suscribe a órdenes
	ordersStore.subscribe(($orders) => {
		if (currentUser?.id) {
			userOrders = $orders.filter((o) => o.clientId === currentUser.id);
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

<div class="space-y-6 animate-fadeIn">
	<!-- Encabezado -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">👤 Mi Perfil</h1>
		<p class="text-gray-600 mt-2">Información de tu cuenta y estadísticas personales</p>
	</div>

	<!-- Información del perfil -->
	{#if currentUser}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Datos personales -->
			<Card title="📋 Información Personal">
				<div class="space-y-4">
					<div>
						<p class="text-sm text-gray-600">Nombre de la Empresa</p>
						<p class="text-lg font-bold text-gray-900 mt-1">{currentUser.name}</p>
					</div>

					<div>
						<p class="text-sm text-gray-600">Email</p>
						<p class="text-gray-900 mt-1">{currentUser.email}</p>
					</div>

					<div>
						<p class="text-sm text-gray-600">Rol en el sistema</p>
						<div class="mt-1">
							<Badge status={currentUser.role === 'client' ? 'active' : 'pending'} />
						</div>
					</div>

					<div>
						<p class="text-sm text-gray-600">Miembro desde</p>
						<p class="text-gray-900 mt-1">{formatDate(currentUser.loginAt)}</p>
					</div>
				</div>
			</Card>

			<!-- Zona de reparto -->
			{#if userZone}
				<Card title="📍 Zona de Reparto">
					<div class="space-y-4">
						<div>
							<p class="text-sm text-gray-600">Zona asignada</p>
							<p class="text-lg font-bold text-gray-900 mt-1">{userZone.name}</p>
						</div>

						<div>
							<p class="text-sm text-gray-600">Descripción</p>
							<p class="text-gray-900 mt-1">{userZone.description}</p>
						</div>

						<div>
							<p class="text-sm text-gray-600">Ubicación</p>
							<p class="text-gray-900 mt-1">{userZone.address}</p>
						</div>

						<div>
							<p class="text-sm text-gray-600">Horario de reparto</p>
							<p class="text-gray-900 mt-1">{userZone.deliveryTime}</p>
						</div>

						<div>
							<p class="text-sm text-gray-600">Días de reparto</p>
							<p class="text-gray-900 mt-1">{userZone.deliveryDays.join(', ')}</p>
						</div>
					</div>
				</Card>
			{/if}
		</div>
	{/if}

	<!-- Estadísticas de pedidos -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-blue-600 mb-2">{userOrders.length}</div>
				<p class="text-gray-600 font-medium">Pedidos Totales</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-green-600 mb-2">{countByStatus('delivered')}</div>
				<p class="text-gray-600 font-medium">Entregados</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-yellow-600 mb-2">{countByStatus('pending')}</div>
				<p class="text-gray-600 font-medium">Pendientes</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-purple-600 mb-2">
					{formatCurrency(getAverageOrderValue())}
				</div>
				<p class="text-gray-600 font-medium">Ticket Promedio</p>
			</div>
		</Card>
	</div>

	<!-- Resumen financiero -->
	<Card title="💰 Resumen Financiero">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="bg-green-50 rounded-lg p-4 border border-green-200">
				<p class="text-sm text-gray-600 mb-2">Total Gastado</p>
				<p class="text-3xl font-bold text-green-600">{formatCurrency(getTotalSpent())}</p>
			</div>

			<div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
				<p class="text-sm text-gray-600 mb-2">Pedidos Realizados</p>
				<p class="text-3xl font-bold text-blue-600">{userOrders.length}</p>
			</div>

			<div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
				<p class="text-sm text-gray-600 mb-2">Valor Promedio</p>
				<p class="text-3xl font-bold text-purple-600">{formatCurrency(getAverageOrderValue())}</p>
			</div>
		</div>
	</Card>

	<!-- Estado de pedidos -->
	{#if userOrders.length > 0}
		<Card title="📊 Distribución de Pedidos">
			<div class="space-y-4">
				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="text-gray-700 font-medium">Entregados</span>
						<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
							{countByStatus('delivered')}
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div
							class="bg-green-500 h-2 rounded-full"
							style="width: {(countByStatus('delivered') / userOrders.length) * 100}%"
						></div>
					</div>
				</div>

				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="text-gray-700 font-medium">Pendientes</span>
						<span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-semibold">
							{countByStatus('pending')}
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div
							class="bg-yellow-500 h-2 rounded-full"
							style="width: {(countByStatus('pending') / userOrders.length) * 100}%"
						></div>
					</div>
				</div>

				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="text-gray-700 font-medium">Cancelados</span>
						<span class="bg-red-100 text-red-800 px-3 py-1 rounded-full font-semibold">
							{countByStatus('cancelled')}
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div
							class="bg-red-500 h-2 rounded-full"
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
			href="/client/orders"
			class="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center"
		>
			<p class="text-blue-700 font-medium">📦 Ver mis pedidos</p>
			<p class="text-sm text-blue-600 mt-1">Gestiona tus solicitudes de entrega</p>
		</a>

		<a
			href="/client/products"
			class="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center"
		>
			<p class="text-green-700 font-medium">🛍️ Ver catálogo</p>
			<p class="text-sm text-green-600 mt-1">Explora nuestros productos</p>
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
