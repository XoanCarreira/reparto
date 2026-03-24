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

<div class="page-root animate-fadeIn full-width-desktop">
	<!-- Encabezado -->
	<div class="page-header">
		<h1 class="page-title">📦 Gestión de Pedidos</h1>
		<p class="page-subtitle">Total: {allOrders.length} pedidos registrados</p>
	</div>

	<!-- Filtros -->
	<div class="panel-surface radius-lg p-6">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
			<div>
				<label for="status-filter" class="block fs-sm fw-medium txt-subtle mb-1">Estado</label>
				<select
					id="status-filter"
					value={statusFilter}
					onchange={(e) => (statusFilter = e.currentTarget.value)}
					class="w-full border bd-soft bg-panel txt-primary rounded px-3 py-2"
				>
					<option value="all">Todos ({allOrders.length})</option>
					<option value="pending">Pendientes ({allOrders.filter((o) => o.status === 'pending').length})</option>
					<option value="delivered">Entregados ({allOrders.filter((o) => o.status === 'delivered').length})</option>
					<option value="cancelled">Cancelados ({allOrders.filter((o) => o.status === 'cancelled').length})</option>
				</select>
			</div>

			<div>
				<label for="zone-filter" class="block fs-sm fw-medium txt-subtle mb-1">Zona</label>
				<select
					id="zone-filter"
					value={zoneFilter}
					onchange={(e) => (zoneFilter = e.currentTarget.value)}
					class="w-full border bd-soft bg-panel txt-primary rounded px-3 py-2"
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
		<Card class="glass-slate">
			<div class="text-center py-12">
				<p class="txt-muted fs-lg">No hay pedidos con este filtro</p>
			</div>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredOrders as order (order.id)}
				<Card class="glass-blue">
					<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 radius-lg panel-surface-soft">
						<!-- ID del pedido -->
						<div>
							<p class="fs-sm txt-muted">Pedido</p>
							<p class="fs-lg fw-bold txt-primary">#{order.id}</p>
						</div>

						<!-- Cliente -->
						<div>
							<p class="fs-sm txt-muted">Cliente</p>
							<p class="txt-primary fw-medium">{getClientName(order.clientId)}</p>
						</div>

						<!-- Fecha -->
						<div>
							<p class="fs-sm txt-muted">Creado</p>
							<p class="txt-primary">{formatDate(order.createdAt)}</p>
						</div>

						<!-- Zona -->
						<div>
							<p class="fs-sm txt-muted">Zona</p>
							<p class="txt-primary fw-medium">{getZoneNameByClient(order.clientId)}</p>
						</div>

						<!-- Monto -->
						<div>
							<p class="fs-sm txt-muted">Total</p>
							<p class="fs-lg fw-bold text-blue-300">{formatCurrency(order.totalAmount)}</p>
						</div>
					</div>

					<!-- Detalles del pedido -->
					<div class="panel-surface-soft radius-lg p-4 mb-4">
						<p class="fw-medium text-amber-200 mb-3">Items ({getItemsCount(order.items)})</p>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
							{#each order.items as item (item.productId)}
								<div class="fs-sm txt-soft">
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
								<p class="fs-sm text-emerald-300 fw-medium">
									Entregado: {formatDate(order.deliveredAt)}
								</p>
							{:else}
								<p class="fs-sm text-red-300 fw-medium">Cancelado</p>
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
