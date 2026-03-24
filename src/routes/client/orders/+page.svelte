<!-- PÁGINA: Pedidos Cliente -->
<script>
	/**
	 * PÁGINA DE PEDIDOS DEL CLIENTE
	 * Visualiza sus pedidos: pendientes, entregados, etc.
	 * Permite ver detalles y crear nuevos pedidos
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore.js';
	import { ordersStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDate, daysUntil } from '$lib/utils/helpers.js';
	import { zones } from '$lib/data/mockData.js';

	let currentUser;
	let clientOrders = [];
	let pendingOrders = [];
	let deliveredOrders = [];
	let nextDeliveryZone;

	// Se suscribe a autenticación
	authStore.subscribe((user) => {
		currentUser = user;
		if (user?.zone) {
			nextDeliveryZone = zones.find((z) => z.id === user.zone);
		}
	});

	// Se suscribe a órdenes
	ordersStore.subscribe(($orders) => {
		if (currentUser?.id) {
			clientOrders = $orders.filter((o) => o.clientId === currentUser.id);
			pendingOrders = clientOrders.filter((o) => o.status === 'pending');
			deliveredOrders = clientOrders.filter((o) => o.status === 'delivered');
		}
	});

	/**
	 * Calcula el total de pedidos pendientes
	 */
	function getPendingTotal() {
		return pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);
	}

	/**
	 * Obtiene los días restantes hasta próxima entrega
	 */
	function getDeliveryCountdown() {
		if (!nextDeliveryZone?.nextDelivery) return null;
		return daysUntil(nextDeliveryZone.nextDelivery);
	}

	/**
	 * Obtiene el horario de entrega formateado
	 */
	function getDeliveryInfo() {
		if (!nextDeliveryZone) return {};
		return {
			days: nextDeliveryZone.deliveryDays?.join(', ') || 'No programado',
			time: nextDeliveryZone.deliveryTime || 'Sin horario',
			location: nextDeliveryZone.address || 'No especificada'
		};
	}

	/**
	 * Cuenta items en un pedido
	 */
	function countItems(items) {
		return items.reduce((sum, item) => sum + item.quantity, 0);
	}
</script>

<svelte:head>
	<title>Mis Pedidos - Reparto</title>
</svelte:head>

<div class="space-y-6 animate-fadeIn">
	<!-- Encabezado -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">📦 Mis Pedidos</h1>
		<p class="text-gray-600 mt-2">Solicitudes de entrega y gestión de tu cuenta</p>
	</div>

	<!-- Información de próxima entrega -->
	{#if nextDeliveryZone}
		{@const countdown = getDeliveryCountdown()}
		{@const deliveryInfo = getDeliveryInfo()}
		<Card>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h3 class="text-lg font-bold text-gray-900 mb-4">📅 Próxima Entrega</h3>
					<div class="space-y-3">
						<div>
							<p class="text-sm text-gray-600">Fecha</p>
							<p class="text-lg font-semibold text-blue-600 mt-1">
								{countdown && countdown.message}
							</p>
						</div>
						<div>
							<p class="text-sm text-gray-600">Días de reparto</p>
							<p class="text-gray-900 mt-1">{deliveryInfo.days}</p>
						</div>
						<div>
							<p class="text-sm text-gray-600">Horario</p>
							<p class="text-gray-900 mt-1">{deliveryInfo.time}</p>
						</div>
					</div>
				</div>

				<div>
					<h3 class="text-lg font-bold text-gray-900 mb-4">📍 Zona de Reparto</h3>
					<div class="space-y-3">
						<div>
							<p class="text-sm text-gray-600">Zona</p>
							<p class="text-lg font-semibold text-gray-900 mt-1">{nextDeliveryZone.name}</p>
						</div>
						<div>
							<p class="text-sm text-gray-600">Ubicación</p>
							<p class="text-gray-900 mt-1">{deliveryInfo.location}</p>
						</div>
						<div>
							<p class="text-sm text-gray-600">Descripción</p>
							<p class="text-gray-900 mt-1">{nextDeliveryZone.description}</p>
						</div>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Resumen de pedidos -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-yellow-600 mb-2">{pendingOrders.length}</div>
				<p class="text-gray-600 font-medium">Pedidos Pendientes</p>
				<p class="text-sm text-gray-500 mt-2">{formatCurrency(getPendingTotal())}</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-green-600 mb-2">{deliveredOrders.length}</div>
				<p class="text-gray-600 font-medium">Pedidos Entregados</p>
				<p class="text-sm text-gray-500 mt-2">Historial completado</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-blue-600 mb-2">{clientOrders.length}</div>
				<p class="text-gray-600 font-medium">Total de Pedidos</p>
				<p class="text-sm text-gray-500 mt-2">Todos los tiempos</p>
			</div>
		</Card>
	</div>

	<!-- Botón para crear nuevo pedido -->
	<div class="text-center">
		<a
			href={resolve('/client/orders/new')}
			class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
		>
			+ Crear Nuevo Pedido
		</a>
	</div>

	<!-- Pedidos pendientes -->
	{#if pendingOrders.length > 0}
		<Card title="⏳ Pedidos Pendientes">
			<div class="space-y-4">
				{#each pendingOrders as order (order.id)}
					<div class="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
						<div class="flex justify-between items-start mb-3">
							<div>
								<p class="font-bold text-gray-900">Pedido #{order.id}</p>
								<p class="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
							</div>
							<Badge status={order.status} />
						</div>

						<div class="bg-white rounded p-3 mb-3">
							<p class="text-sm font-medium text-gray-700 mb-2">Items ({countItems(order.items)})</p>
							<div class="text-sm text-gray-600 space-y-1">
								{#each order.items as item (item.productId)}
									<p>• {item.quantity}× unidades - {formatCurrency(item.unitPrice * item.quantity)}</p>
								{/each}
							</div>
						</div>

						<div class="flex justify-between items-center">
							<div>
								<p class="text-sm text-gray-600">Entrega programada</p>
								<p class="font-semibold text-gray-900">{formatDate(order.scheduledDelivery)}</p>
							</div>
							<div class="text-right">
								<p class="text-sm text-gray-600">Total</p>
								<p class="text-xl font-bold text-blue-600">{formatCurrency(order.totalAmount)}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Pedidos entregados -->
	{#if deliveredOrders.length > 0}
		<Card title="✅ Historial de Entregas">
			<div class="space-y-3">
				{#each deliveredOrders.slice(0, 5) as order (order.id)}
					<div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
						<div>
							<p class="font-medium text-gray-900">Pedido #{order.id}</p>
							<p class="text-sm text-gray-600">
								{countItems(order.items)} items • {formatDate(order.deliveredAt || order.createdAt)}
							</p>
						</div>
						<div class="text-right">
							<p class="font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</p>
							<Badge status={order.status} />
						</div>
					</div>
				{/each}

				{#if deliveredOrders.length > 5}
					<p class="text-center text-sm text-gray-600 py-2">...y {deliveredOrders.length - 5} más</p>
				{/if}
			</div>
		</Card>
	{/if}

	<!-- Sin pedidos -->
	{#if clientOrders.length === 0}
		<Card>
			<div class="text-center py-12">
				<p class="text-gray-500 text-lg mb-4">Aún no tienes pedidos</p>
				<a
					href={resolve('/client/orders/new')}
					class="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Crear tu primer pedido
				</a>
			</div>
		</Card>
	{/if}
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
