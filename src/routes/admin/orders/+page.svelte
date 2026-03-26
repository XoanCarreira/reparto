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
	import { ordersStore, clientsStore, zonesStore, productsStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDateTime } from '$lib/utils/helpers.js';

	// Filtros
	let statusFilter = $state('all'); // all, pending, in_delivery, delivered, returned, cancelled
	let zoneFilter = $state('all'); // all o id de zona

	let allOrders = $state([]);
	let allClients = $state([]);
	let allZones = $state([]);
	let allProducts = $state([]);
	let confirmOpen = $state(false);
	let deleteConfirmOpen = $state(false);
	let pendingDeleteOrder = $state({ id: null, clientId: null, status: '' });
	let deleteError = $state('');
	let deleteMessage = $state('');
	let pendingOrderAction = $state({
		type: '',
		orderId: null
	});

	const cancellationRequests = $derived(
		allOrders.filter((order) => order.cancelRequestStatus === 'pending')
	);

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

	productsStore.subscribe(($products) => {
		allProducts = $products;
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

	function getProductName(productId) {
		const product = allProducts.find((item) => Number(item.id) === Number(productId));
		return product?.name || `Producto #${productId}`;
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

	function returnOrder(orderId) {
		pendingOrderAction = { type: 'return', orderId };
		confirmOpen = true;
	}

	function approveCancelRequest(orderId) {
		pendingOrderAction = { type: 'approve-cancel-request', orderId };
		confirmOpen = true;
	}

	function denyCancelRequest(orderId) {
		pendingOrderAction = { type: 'deny-cancel-request', orderId };
		confirmOpen = true;
	}

	function closeOrderConfirm() {
		confirmOpen = false;
		pendingOrderAction = { type: '', orderId: null };
	}

	function requestDeleteOrder(order) {
		// Solo los pedidos pendientes se pueden eliminar completamente.
		if (order.status !== 'pending') {
			return;
		}

		pendingDeleteOrder = { id: order.id, clientId: order.clientId, status: order.status };
		deleteError = '';
		deleteMessage = '';
		deleteConfirmOpen = true;
	}

	function closeDeleteOrderConfirm() {
		deleteConfirmOpen = false;
		pendingDeleteOrder = { id: null, clientId: null, status: '' };
	}

	async function confirmDeleteOrder() {
		if (!pendingDeleteOrder.id) {
			return;
		}

		if (pendingDeleteOrder.status !== 'pending') {
			deleteError = 'Solo se pueden eliminar pedidos en estado pendiente.';
			return;
		}

		const result = await ordersStore.deletePermanent(pendingDeleteOrder.id);
		if (!result?.success) {
			deleteError = 'No se pudo eliminar el pedido definitivamente en base de datos.';
			return;
		}

		deleteMessage = `Pedido #${pendingDeleteOrder.id} eliminado definitivamente.`;
		closeDeleteOrderConfirm();
	}

	function confirmOrderAction() {
		if (!pendingOrderAction.orderId) {
			return;
		}

		if (pendingOrderAction.type === 'deliver') {
			ordersStore.updateStatus(pendingOrderAction.orderId, 'delivered');
		} else if (pendingOrderAction.type === 'return') {
			ordersStore.updateStatus(pendingOrderAction.orderId, 'returned');
		} else if (pendingOrderAction.type === 'cancel') {
			ordersStore.updateStatus(pendingOrderAction.orderId, 'cancelled');
		} else if (pendingOrderAction.type === 'approve-cancel-request') {
			ordersStore.resolveCancellationRequest(pendingOrderAction.orderId, true);
		} else if (pendingOrderAction.type === 'deny-cancel-request') {
			ordersStore.resolveCancellationRequest(pendingOrderAction.orderId, false);
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

	{#if deleteError}
		<div class="inline-error">{deleteError}</div>
	{/if}
	{#if deleteMessage}
		<div class="inline-success">{deleteMessage}</div>
	{/if}

	{#if cancellationRequests.length > 0}
		<Card title="🔔 Solicitudes de Anulación" titleClass="title-amber" class="order-card">
			<div class="orders-list">
				{#each cancellationRequests as order (order.id)}
					<div class="order-footer">
						<div class="status-section">
							<p class="status-text">Pedido #{order.id} - {getClientName(order.clientId)}</p>
						</div>
						<div class="actions-section">
							<Button variant="primary" size="sm" onclick={() => approveCancelRequest(order.id)}>
								Aceptar anulación
							</Button>
							<Button variant="danger" size="sm" onclick={() => denyCancelRequest(order.id)}>
								Denegar
							</Button>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

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
					<option value="in_delivery">En reparto ({allOrders.filter((o) => o.status === 'in_delivery').length})</option>
					<option value="delivered">Entregados ({allOrders.filter((o) => o.status === 'delivered').length})</option>
					<option value="returned">Devueltos ({allOrders.filter((o) => o.status === 'returned').length})</option>
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
							<p class="order-value">{formatDateTime(order.createdAt)}</p>
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
									• {getProductName(item.productId)}: {item.quantity} uds pedidas
									({item.unitPrice ? formatCurrency(item.unitPrice * item.quantity) : 'N/A'})
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
								{#if order.cancelRequestStatus === 'pending'}
									<p class="status-text cancelled">Solicitud de anulación pendiente</p>
								{:else if order.cancelRequestStatus === 'rejected'}
									<p class="status-text cancelled">Anulación denegada al cliente</p>
								{/if}
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
								<Button variant="danger" size="sm" onclick={() => requestDeleteOrder(order)}>
									🗑 Eliminar
								</Button>
							{:else if order.status === 'in_delivery'}
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
								<p class="status-text delivered">Entregado: {formatDateTime(order.deliveredAt)}</p>
								<Button variant="secondary" size="sm" onclick={() => returnOrder(order.id)}>
									↩ Marcar devuelto
								</Button>
							{:else if order.status === 'returned'}
								<p class="status-text cancelled">Pedido devuelto por cliente</p>
							{:else}
								<p class="status-text cancelled">
									{order.cancelSource === 'client' ? 'Cancelado por cliente' : 'Cancelado'}
								</p>
							{/if}
						</div>
					</div>

					{#if deleteConfirmOpen && Number(pendingDeleteOrder.id) === Number(order.id)}
						<div class="delete-confirm-banner" role="alert" aria-live="polite">
							<div class="delete-confirm-content">
								<p class="delete-confirm-title">Confirmar eliminación total</p>
								<p class="delete-confirm-text">
									Se eliminará el pedido <strong>#{order.id}</strong> del flujo operativo.
								</p>
								<p class="delete-confirm-warning">
									Esta acción borra el pedido completamente del sistema.
								</p>
							</div>
							<div class="delete-confirm-actions">
								<Button variant="secondary" size="sm" onclick={closeDeleteOrderConfirm}>Cancelar</Button>
								<Button variant="danger" size="sm" onclick={confirmDeleteOrder}>Sí, eliminar</Button>
							</div>
						</div>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}

	<ConfirmDialog
		open={confirmOpen}
		title={pendingOrderAction.type === 'deliver'
			? 'Marcar Pedido como Entregado'
			: pendingOrderAction.type === 'return'
				? 'Marcar Pedido como Devuelto'
			: pendingOrderAction.type === 'cancel'
				? 'Cancelar Pedido'
				: pendingOrderAction.type === 'approve-cancel-request'
					? 'Aceptar Solicitud de Anulación'
					: 'Denegar Solicitud de Anulación'}
		message={pendingOrderAction.type === 'deliver'
			? 'Se marcará el pedido como entregado.'
			: pendingOrderAction.type === 'return'
				? 'Se marcará el pedido como devuelto.'
			: pendingOrderAction.type === 'cancel'
				? 'Se cancelará el pedido. Esta acción no se puede deshacer.'
				: pendingOrderAction.type === 'approve-cancel-request'
					? 'El pedido quedará cancelado por cliente.'
					: 'Se mantendrá el pedido activo y se notificará al cliente.'}
		confirmText={pendingOrderAction.type === 'deliver'
			? 'Sí, marcar entregado'
			: pendingOrderAction.type === 'return'
				? 'Sí, marcar devuelto'
			: pendingOrderAction.type === 'cancel'
				? 'Sí, cancelar pedido'
				: pendingOrderAction.type === 'approve-cancel-request'
					? 'Sí, aceptar'
					: 'Sí, denegar'}
		cancelText="Volver"
		variant={pendingOrderAction.type === 'deliver' || pendingOrderAction.type === 'return' || pendingOrderAction.type === 'approve-cancel-request' ? 'primary' : 'danger'}
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

	.inline-error {
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 0.45rem;
		border: 1px solid #7f1d1d;
		background: #3f1d1d;
		color: #fecaca;
		font-size: 0.9rem;
	}

	.inline-success {
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 0.45rem;
		border: 1px solid #14532d;
		background: #052e1a;
		color: #bbf7d0;
		font-size: 0.9rem;
	}

	.delete-confirm-banner {
		margin-bottom: 1rem;
		padding: 1rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(239, 68, 68, 0.45);
		background:
			radial-gradient(circle at top right, rgba(248, 113, 113, 0.2), transparent 46%),
			linear-gradient(135deg, rgba(69, 10, 10, 0.75), rgba(63, 19, 19, 0.92));
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 10px 30px rgba(127, 29, 29, 0.2);
	}

	.delete-confirm-content {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.delete-confirm-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #fee2e2;
	}

	.delete-confirm-text {
		margin: 0;
		font-size: 0.9rem;
		color: #fecaca;
	}

	.delete-confirm-warning {
		margin: 0;
		font-size: 0.85rem;
		color: #fcd34d;
	}

	.delete-confirm-actions {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		flex-wrap: wrap;
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

	:global(.title-amber) {
		color: #fcd34d;
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
