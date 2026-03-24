<!-- PÁGINA: Pedidos Admin -->
<script>
	/**
	 * PÁGINA DE PEDIDOS DEL ADMINISTRADOR
	 * Visualiza todos los pedidos, permite filtrar por estado
	 * Puede marcar pedidos como entregados y ver detalles
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import { ordersStore, clientsStore, zonesStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDate } from '$lib/utils/helpers.js';

	// Filtros
	let statusFilter = $state('all'); // all, pending, delivered, cancelled
	let zoneFilter = $state('all'); // all o id de zona

	let allOrders = $state([]);
	let allClients = $state([]);
	let allZones = $state([]);

	const filteredOrders = $derived(
		allOrders.filter((order) => {
			const statusMatch = statusFilter === 'all' || order.status === statusFilter;
			const zoneMatch =
				zoneFilter === 'all' || String(getClientZoneId(order.clientId)) === String(zoneFilter);
			return statusMatch && zoneMatch;
		})
	);

	// Se suscribe a los cambios en órdenes
	ordersStore.subscribe(($orders) => {
		allOrders = $orders;
	});

	clientsStore.subscribe(($clients) => {
		allClients = $clients;
	});

	zonesStore.subscribe(($zones) => {
		allZones = $zones;
	});

	/**
	 * Obtiene el nombre del cliente
	 */
	function getClientName(clientId) {
		const client = allClients.find((u) => u.id === clientId);
		return client?.name || 'Desconocido';
	}

	function getClientZoneId(clientId) {
		const client = allClients.find((u) => u.id === clientId);
		return client?.zone ?? null;
	}

	function getZoneNameByClient(clientId) {
		const zoneId = getClientZoneId(clientId);
		const zone = allZones.find((z) => z.id === zoneId);
		return zone?.name || 'Zona desconocida';
	}

	/**
	 * Marca un pedido como entregado
	 */
	function deliverOrder(orderId) {
		if (confirm('¿Marcar este pedido como entregado?')) {
			ordersStore.updateStatus(orderId, 'delivered');
		}
	}

	/**
	 * Cancela un pedido
	 */
	function cancelOrder(orderId) {
		if (confirm('¿Cancelar este pedido? Esta acción no se puede deshacer.')) {
			ordersStore.updateStatus(orderId, 'cancelled');
		}
	}

	/**
	 * Calcula el total de items en un pedido
	 */
	function getItemsCount(items) {
		return items.reduce((sum, item) => sum + item.quantity, 0);
	}

	function clearFilters() {
		statusFilter = 'all';
		zoneFilter = 'all';
	}
</script>

<svelte:head>
	<title>Pedidos - Admin - Reparto</title>
</svelte:head>

<div class="space-y-6 animate-fadeIn">
	<!-- Encabezado -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">📦 Gestión de Pedidos</h1>
		<p class="text-gray-600 mt-2">Total: {allOrders.length} pedidos registrados</p>
	</div>

	<!-- Filtros -->
	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
			<div>
				<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
				<select
					id="status-filter"
					value={statusFilter}
					onchange={(e) => (statusFilter = e.currentTarget.value)}
					class="w-full border border-gray-300 rounded px-3 py-2"
				>
					<option value="all">Todos ({allOrders.length})</option>
					<option value="pending">Pendientes ({allOrders.filter((o) => o.status === 'pending').length})</option>
					<option value="delivered">Entregados ({allOrders.filter((o) => o.status === 'delivered').length})</option>
					<option value="cancelled">Cancelados ({allOrders.filter((o) => o.status === 'cancelled').length})</option>
				</select>
			</div>

			<div>
				<label for="zone-filter" class="block text-sm font-medium text-gray-700 mb-1">Zona</label>
				<select
					id="zone-filter"
					value={zoneFilter}
					onchange={(e) => (zoneFilter = e.currentTarget.value)}
					class="w-full border border-gray-300 rounded px-3 py-2"
				>
					<option value="all">Todas las zonas</option>
					{#each allZones as zone (zone.id)}
						<option value={String(zone.id)}>{zone.name}</option>
					{/each}
				</select>
			</div>

			<div class="flex md:justify-end">
				<Button variant="secondary" size="sm" onclick={clearFilters}>Limpiar filtros</Button>
			</div>
		</div>
	</div>

	<!-- Tabla de pedidos -->
	{#if filteredOrders.length === 0}
		<Card>
			<div class="text-center py-12">
				<p class="text-gray-500 text-lg">No hay pedidos con este filtro</p>
			</div>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredOrders as order (order.id)}
				<Card>
					<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
						<!-- ID del pedido -->
						<div>
							<p class="text-sm text-gray-600">Pedido</p>
							<p class="text-lg font-bold text-gray-900">#{order.id}</p>
						</div>

						<!-- Cliente -->
						<div>
							<p class="text-sm text-gray-600">Cliente</p>
							<p class="text-gray-900 font-medium">{getClientName(order.clientId)}</p>
						</div>

						<!-- Fecha -->
						<div>
							<p class="text-sm text-gray-600">Creado</p>
							<p class="text-gray-900">{formatDate(order.createdAt)}</p>
						</div>

						<!-- Zona -->
						<div>
							<p class="text-sm text-gray-600">Zona</p>
							<p class="text-gray-900 font-medium">{getZoneNameByClient(order.clientId)}</p>
						</div>

						<!-- Monto -->
						<div>
							<p class="text-sm text-gray-600">Total</p>
							<p class="text-lg font-bold text-blue-600">{formatCurrency(order.totalAmount)}</p>
						</div>
					</div>

					<!-- Detalles del pedido -->
					<div class="bg-gray-50 rounded-lg p-4 mb-4">
						<p class="font-medium text-gray-700 mb-3">Items ({getItemsCount(order.items)})</p>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
							{#each order.items as item (item.productId)}
								<div class="text-sm text-gray-600">
									• {item.quantity} × {item.unitPrice ? formatCurrency(item.unitPrice * item.quantity) : 'N/A'}
								</div>
							{/each}
						</div>
					</div>

					<!-- Estado y acciones -->
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<Badge status={order.status} />
						</div>

						<div class="flex gap-2">
							{#if order.status === 'pending'}
								<Button
									variant="primary"
									size="sm"
									onclick={() => deliverOrder(order.id)}
								>
									✓ Marcar entregado
								</Button>
								<Button
									variant="danger"
									size="sm"
									onclick={() => cancelOrder(order.id)}
								>
									✗ Cancelar
								</Button>
							{:else if order.status === 'delivered'}
								<p class="text-sm text-green-700 font-medium">
									Entregado: {formatDate(order.deliveredAt)}
								</p>
							{:else}
								<p class="text-sm text-red-700 font-medium">Cancelado</p>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>
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
