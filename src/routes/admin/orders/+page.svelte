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
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { ordersStore, clientsStore, zonesStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDate } from '$lib/utils/helpers.js';

	// Filtros
	let statusFilter = $state('all'); // all, pending, delivered, cancelled
	let zoneFilter = $state('all'); // all o id de zona

	let allOrders = $state([]);
	let allClients = $state([]);
	let allZones = $state([]);
	let confirmOpen = $state(false);
	let pendingOrderAction = $state({
		type: '',
		orderId: null
	});

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
		pendingOrderAction = { type: 'deliver', orderId };
		confirmOpen = true;
	}

	/**
	 * Cancela un pedido
	 */
	function cancelOrder(orderId) {
		pendingOrderAction = { type: 'cancel', orderId };
		confirmOpen = true;
	}

	function closeOrderConfirm() {
		confirmOpen = false;
		pendingOrderAction = { type: '', orderId: null };
	}

	function confirmOrderAction() {
		if (!pendingOrderAction.orderId) {
			return;
		}

		if (pendingOrderAction.type === 'deliver') {
			ordersStore.updateStatus(pendingOrderAction.orderId, 'delivered');
		} else if (pendingOrderAction.type === 'cancel') {
			ordersStore.updateStatus(pendingOrderAction.orderId, 'cancelled');
		}

		closeOrderConfirm();
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
	<div class="filters-panel">
		<div class="filters-grid">
			<!-- Filtro por estado -->
			<div class="filter-group">
				<label for="status-filter" class="filter-label">Estado</label>
				<select
					id="status-filter"
					value={statusFilter}
					onchange={(e) => (statusFilter = e.currentTarget.value)}
					class="filter-input"
				>
					<option value="all">Todos ({allOrders.length})</option>
					<option value="pending">Pendientes ({allOrders.filter((o) => o.status === 'pending').length})</option>
					<option value="delivered">Entregados ({allOrders.filter((o) => o.status === 'delivered').length})</option>
					<option value="cancelled">Cancelados ({allOrders.filter((o) => o.status === 'cancelled').length})</option>
				</select>
			</div>

			<!-- Filtro por zona -->
			<div class="filter-group">
				<label for="zone-filter" class="filter-label">Zona</label>
				<select
					id="zone-filter"
					value={zoneFilter}
					onchange={(e) => (zoneFilter = e.currentTarget.value)}
					class="filter-input"
				>
					<option value="all">Todas las zonas</option>
					{#each allZones as zone (zone.id)}
						<option value={String(zone.id)}>{zone.name}</option>
					{/each}
				</select>
			</div>

			<!-- Botón de limpiar -->
			<div class="filter-actions">
				<Button variant="secondary" size="sm" onclick={clearFilters}>Limpiar filtros</Button>
			</div>
		</div>
	</div>

	<!-- Tabla de pedidos -->
	{#if filteredOrders.length === 0}
		<div class="empty-state">
			<p class="empty-message">No hay pedidos con este filtro</p>
		</div>
	{:else}
		<div class="orders-list">
			{#each filteredOrders as order (order.id)}
				<Card class="order-card">
					<!-- Header: Información general del pedido -->
					<div class="order-header">
						<div class="order-info">
							<p class="order-label">Pedido</p>
							<p class="order-id">#{order.id}</p>
						</div>

						<div class="order-info">
							<p class="order-label">Cliente</p>
							<p class="order-value">{getClientName(order.clientId)}</p>
						</div>

						<div class="order-info">
							<p class="order-label">Zona</p>
							<p class="order-value">{getZoneNameByClient(order.clientId)}</p>
						</div>

						<div class="order-info">
							<p class="order-label">Creado</p>
							<p class="order-value">{formatDate(order.createdAt)}</p>
						</div>

						<div class="order-info amount">
							<p class="order-label">Total</p>
							<p class="order-amount">{formatCurrency(order.totalAmount)}</p>
						</div>
					</div>

					<!-- Items del pedido -->
					<div class="order-items-section">
						<p class="items-title">Items ({getItemsCount(order.items)})</p>
						<div class="items-grid">
							{#each order.items as item (item.productId)}
								<div class="item-entry">
									• {item.quantity} × {item.unitPrice ? formatCurrency(item.unitPrice * item.quantity) : 'N/A'}
								</div>
							{/each}
						</div>
					</div>

					<!-- Footer: Estado y acciones -->
					<div class="order-footer">
						<div class="status-section">
							<Badge status={order.status} />
						</div>

						<div class="actions-section">
							{#if order.status === 'pending'}
								<Button
									variant="primary"
									size="sm"
									onclick={() => deliverOrder(order.id)}
								>
									✓ Entregado
								</Button>
								<Button
									variant="danger"
									size="sm"
									onclick={() => cancelOrder(order.id)}
								>
									✗ Cancelar
								</Button>
							{:else if order.status === 'delivered'}
								<p class="status-text delivered">Entregado: {formatDate(order.deliveredAt)}</p>
							{:else}
								<p class="status-text cancelled">Cancelado</p>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}

	<ConfirmDialog
		open={confirmOpen}
		title={pendingOrderAction.type === 'deliver' ? 'Marcar Pedido como Entregado' : 'Cancelar Pedido'}
		message={pendingOrderAction.type === 'deliver'
			? 'Se marcará el pedido como entregado.'
			: 'Se cancelará el pedido. Esta acción no se puede deshacer.'}
		confirmText={pendingOrderAction.type === 'deliver' ? 'Sí, marcar entregado' : 'Sí, cancelar pedido'}
		cancelText="Volver"
		variant={pendingOrderAction.type === 'deliver' ? 'primary' : 'danger'}
		onCancel={closeOrderConfirm}
		onConfirm={confirmOrderAction}
	/>
</div>

<style>
	/* ============================================
	 * ANIMACIONES
	 * ============================================ */
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

	/* ============================================
	 * ESTRUCTURA GENERAL
	 * ============================================ */
	.page-root {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.3px;
	}

	.page-subtitle {
		font-size: 1rem;
		color: #cbd5e1;
		margin: 0;
		font-weight: 400;
	}

	/* ============================================
	 * PANEL DE FILTROS
	 * ============================================ */
	.filters-panel {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.25rem;
		align-items: end;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.filter-input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		background: #0f172a;
		color: #cbd5e1;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.filter-input:hover {
		border-color: #475569;
	}

	.filter-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.filter-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* ============================================
	 * ESTADO VACÍO
	 * ============================================ */
	.empty-state {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 3rem 1.5rem;
		text-align: center;
		margin-bottom: 2rem;
	}

	.empty-message {
		color: #94a3b8;
		font-size: 1rem;
		margin: 0;
	}

	/* ============================================
	 * LISTA DE PEDIDOS
	 * ============================================ */
	.orders-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	:global(.order-card) {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* Header del pedido */
	.order-header {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 1.5rem;
		padding: 1.5rem;
		border-bottom: 1px solid #334155;
	}

	.order-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.order-label {
		font-size: 0.8rem;
		color: #94a3b8;
		font-weight: 500;
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.order-id {
		font-size: 1.25rem;
		font-weight: 700;
		color: #3b82f6;
		margin: 0;
	}

	.order-value {
		font-size: 0.95rem;
		color: #cbd5e1;
		font-weight: 500;
		margin: 0;
	}

	.order-info.amount .order-amount {
		font-size: 1.25rem;
		font-weight: 700;
		color: #10b981;
		margin: 0;
	}

	/* Sección de items */
	.order-items-section {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #334155;
		background: #0f172a;
	}

	.items-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #f59e0b;
		margin: 0 0 1rem 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.item-entry {
		font-size: 0.9rem;
		color: #cbd5e1;
		padding: 0.5rem;
		background: #1e293b;
		border-radius: 0.3rem;
	}

	/* Footer del pedido */
	.order-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.5rem;
		flex-wrap: wrap;
	}

	.status-section {
		display: flex;
		align-items: center;
	}

	.actions-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.status-text {
		font-size: 0.9rem;
		font-weight: 500;
		margin: 0;
		padding: 0.5rem 0;
	}

	.status-text.delivered {
		color: #10b981;
	}

	.status-text.cancelled {
		color: #ef4444;
	}

	/* ============================================
	 * RESPONSIVE
	 * ============================================ */
	@media (max-width: 1024px) {
		.page-root {
			padding: 1.5rem;
		}

		.filters-grid {
			grid-template-columns: 1fr;
		}

		.filter-actions {
			justify-content: flex-start;
		}

		.order-header {
			grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
			gap: 1rem;
			padding: 1rem;
		}
	}

	@media (max-width: 768px) {
		.page-root {
			padding: 1rem;
		}

		.page-title {
			font-size: 1.5rem;
		}

		.page-subtitle {
			font-size: 0.9rem;
		}

		.filters-panel {
			padding: 1rem;
		}

		.order-header {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
			padding: 1rem;
		}

		.order-footer {
			flex-direction: column;
			align-items: flex-start;
		}

		.actions-section {
			width: 100%;
		}

		.items-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
