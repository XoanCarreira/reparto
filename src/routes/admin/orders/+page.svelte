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
	import {
		ordersStore,
		clientsStore,
		zonesStore,
		productsStore,
		deliveryStaffStore,
		specialDeliveriesStore
	} from '$lib/stores/dataStore.js';
	import { buildOrderNotesTimeline, formatCurrency, formatDateTime } from '$lib/utils/helpers.js';

	// Filtros
	let statusFilter = $state('all'); // all, pending, in_delivery, delivered, returned, cancelled
	let zoneFilter = $state('all'); // all o id de zona

	let allOrders = $state([]);
	let allClients = $state([]);
	let allZones = $state([]);
	let allProducts = $state([]);
	let allStaff = $state([]);
	let allSpecialDeliveries = $state([]);
	let confirmOpen = $state(false);
	let deleteConfirmOpen = $state(false);
	let pendingDeleteOrder = $state({ id: null, clientId: null, status: '' });
	let deleteError = $state('');
	let deleteMessage = $state('');
	let pendingOrderAction = $state({
		type: '',
		orderId: null
	});
	let adminActionError = $state('');
	let adminActionMessage = $state('');

	let manualOrderForm = $state({
		clientId: '',
		notes: ''
	});
	let manualRowIdSeq = $state(1);

	function createManualItemRow() {
		const row = { rowId: manualRowIdSeq, productId: '', quantity: 1 };
		manualRowIdSeq += 1;
		return row;
	}

	let manualOrderItems = $state([createManualItemRow()]);

	let specialDeliveryForm = $state({
		name: '',
		notes: '',
		staffId: ''
	});
	let selectedManualOrderIds = $state([]);
	let adminOrderNoteDrafts = $state({});
	let adminOrderNoteBusy = $state({});

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

	deliveryStaffStore.subscribe(($staff) => {
		allStaff = $staff;
	});

	specialDeliveriesStore.subscribe(($specialDeliveries) => {
		allSpecialDeliveries = $specialDeliveries;
	});

	const manualPendingOrders = $derived(
		allOrders.filter((order) => order.isManual === true && order.status === 'pending')
	);

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

	function getSpecialDeliveryName(specialDeliveryId) {
		if (specialDeliveryId === null || specialDeliveryId === undefined) {
			return 'Sin entrega especial';
		}
		const specialDelivery = allSpecialDeliveries.find(
			(item) => Number(item.id) === Number(specialDeliveryId)
		);
		return specialDelivery?.name || `Especial #${specialDeliveryId}`;
	}

	function getDeliveryScopeKey(order) {
		if (order?.specialDeliveryId !== null && order?.specialDeliveryId !== undefined) {
			return `special:${Number(order.specialDeliveryId)}`;
		}

		const zoneId = getClientZoneId(order?.clientId);
		if (zoneId === null || zoneId === undefined) {
			return null;
		}

		return `zone:${Number(zoneId)}`;
	}

	function getDeliveryScopeLabel(order) {
		if (order?.specialDeliveryId !== null && order?.specialDeliveryId !== undefined) {
			return `Entrega especial ${getSpecialDeliveryName(order.specialDeliveryId)}`;
		}

		return `Zona ${getZoneNameByClient(order?.clientId)}`;
	}

	function getComparableDeliveryOrder(order) {
		const value = Number(order?.deliveryOrder);
		return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
	}

	function getScopedDeliveryOrders(order) {
		const scopeKey = getDeliveryScopeKey(order);
		if (!scopeKey) {
			return [];
		}

		return allOrders
			.filter((item) => {
				if (item.status !== 'pending' && item.status !== 'in_delivery') {
					return false;
				}

				return getDeliveryScopeKey(item) === scopeKey;
			})
			.sort((a, b) => {
				const orderDiff = getComparableDeliveryOrder(a) - getComparableDeliveryOrder(b);
				if (orderDiff !== 0) {
					return orderDiff;
				}

				const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				if (createdDiff !== 0) {
					return createdDiff;
				}

				return Number(a.id) - Number(b.id);
			});
	}

	async function moveDeliveryOrder(orderId, direction) {
		adminActionError = '';
		adminActionMessage = '';

		const order = allOrders.find((item) => Number(item.id) === Number(orderId));
		if (!order) {
			adminActionError = 'No se encontró el pedido para reordenar.';
			return;
		}

		const scopedOrders = getScopedDeliveryOrders(order);
		const currentIndex = scopedOrders.findIndex((item) => Number(item.id) === Number(orderId));
		if (currentIndex === -1) {
			adminActionError = 'El pedido no pertenece a una ruta activa ordenable.';
			return;
		}

		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		if (targetIndex < 0 || targetIndex >= scopedOrders.length) {
			return;
		}

		const nextScopedOrders = [...scopedOrders];
		[nextScopedOrders[currentIndex], nextScopedOrders[targetIndex]] = [
			nextScopedOrders[targetIndex],
			nextScopedOrders[currentIndex]
		];

		const result = await ordersStore.reorderDeliveryOrdersDbFirst(nextScopedOrders.map((item) => item.id));
		if (!result?.success) {
			adminActionError = result?.error || 'No se pudo actualizar el orden de reparto.';
			return;
		}

		adminActionMessage = `Orden de reparto actualizado para ${getDeliveryScopeLabel(order)}.`;
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

	async function confirmOrderAction() {
		if (!pendingOrderAction.orderId) {
			return;
		}

		let result = { success: false };

		if (pendingOrderAction.type === 'deliver') {
			result = await ordersStore.setStatusDbFirst(pendingOrderAction.orderId, 'delivered');
		} else if (pendingOrderAction.type === 'return') {
			result = await ordersStore.setStatusDbFirst(pendingOrderAction.orderId, 'returned');
		} else if (pendingOrderAction.type === 'cancel') {
			result = await ordersStore.setStatusDbFirst(pendingOrderAction.orderId, 'cancelled');
		} else if (pendingOrderAction.type === 'approve-cancel-request') {
			result = await ordersStore.resolveCancellationRequestDbFirst(pendingOrderAction.orderId, true);
		} else if (pendingOrderAction.type === 'deny-cancel-request') {
			result = await ordersStore.resolveCancellationRequestDbFirst(pendingOrderAction.orderId, false);
		}

		if (!result?.success) {
			adminActionError = result?.error || 'No se pudo actualizar el pedido en base de datos.';
			return;
		}

		adminActionError = '';

		closeOrderConfirm();
	}

	function addManualItemRow() {
		manualOrderItems = [...manualOrderItems, createManualItemRow()];
	}

	function removeManualItemRow(rowId) {
		manualOrderItems = manualOrderItems.filter((item) => Number(item.rowId) !== Number(rowId));
		if (manualOrderItems.length === 0) {
			manualOrderItems = [createManualItemRow()];
		}
	}

	function updateManualItem(rowId, key, value) {
		manualOrderItems = manualOrderItems.map((item) =>
			Number(item.rowId) === Number(rowId) ? { ...item, [key]: value } : item
		);
	}

	function toggleManualOrderSelection(orderId) {
		selectedManualOrderIds = selectedManualOrderIds.includes(orderId)
			? selectedManualOrderIds.filter((id) => Number(id) !== Number(orderId))
			: [...selectedManualOrderIds, orderId];
	}

	async function createManualOrder() {
		adminActionError = '';
		adminActionMessage = '';

		const parsedClientId = Number(manualOrderForm.clientId);
		if (!Number.isFinite(parsedClientId)) {
			adminActionError = 'Selecciona un cliente para crear el pedido manual.';
			return;
		}

		const normalizedItems = manualOrderItems
			.map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
			.filter((item) => Number.isFinite(item.productId) && Number(item.quantity) > 0);

		if (normalizedItems.length === 0) {
			adminActionError = 'Añade al menos un producto con cantidad válida.';
			return;
		}

		const result = await ordersStore.createManualDbFirst(
			parsedClientId,
			normalizedItems,
			manualOrderForm.notes,
			null
		);

		if (!result?.success) {
			adminActionError = result?.error || 'No se pudo crear el pedido manual.';
			return;
		}

		manualOrderForm = { clientId: '', notes: '' };
		manualOrderItems = [createManualItemRow()];
		adminActionMessage = `Pedido manual #${result.orderId} creado correctamente.`;
	}

	async function createSpecialDeliveryWithOrders() {
		adminActionError = '';
		adminActionMessage = '';

		const normalizedName = String(specialDeliveryForm.name || '').trim();
		if (!normalizedName) {
			adminActionError = 'Indica un nombre para la entrega especial.';
			return;
		}

		const specialResult = await specialDeliveriesStore.createDbFirst({
			name: normalizedName,
			notes: specialDeliveryForm.notes,
			staffId: specialDeliveryForm.staffId === '' ? null : Number(specialDeliveryForm.staffId)
		});

		if (!specialResult?.success) {
			adminActionError = specialResult?.error || 'No se pudo crear la entrega especial.';
			return;
		}

		if (selectedManualOrderIds.length > 0) {
			const assignResult = await ordersStore.assignSpecialDeliveryDbFirst(
				selectedManualOrderIds,
				specialResult.specialDelivery.id
			);

			if (!assignResult?.success) {
				adminActionError = assignResult?.error || 'Se creó la entrega especial, pero no se pudo agrupar los pedidos.';
				return;
			}
		}

		specialDeliveryForm = { name: '', notes: '', staffId: '' };
		selectedManualOrderIds = [];
		adminActionMessage = `Entrega especial "${specialResult.specialDelivery.name}" creada correctamente.`;
	}

	async function assignOrdersToExistingSpecialDelivery(specialDeliveryId) {
		adminActionError = '';
		adminActionMessage = '';

		if (selectedManualOrderIds.length === 0) {
			adminActionError = 'Selecciona pedidos manuales para agrupar.';
			return;
		}

		const result = await ordersStore.assignSpecialDeliveryDbFirst(selectedManualOrderIds, specialDeliveryId);
		if (!result?.success) {
			adminActionError = result?.error || 'No se pudieron asignar los pedidos a la entrega especial.';
			return;
		}

		selectedManualOrderIds = [];
		adminActionMessage = 'Pedidos manuales agrupados en la entrega especial.';
	}

	/**
	 * Calcula el total de items en un pedido
	 */
	function getItemsCount(items) {
		return items.reduce((sum, item) => sum + item.quantity, 0);
	}

	function getOrderNotes(order) {
		return buildOrderNotesTimeline(order);
	}

	function updateAdminOrderNoteDraft(orderId, value) {
		adminOrderNoteDrafts = { ...adminOrderNoteDrafts, [orderId]: value };
	}

	async function addAdminNoteToOrder(orderId) {
		if (adminOrderNoteBusy[orderId]) {
			return;
		}

		const note = String(adminOrderNoteDrafts[orderId] || '').trim();
		if (!note) {
			adminActionError = 'Escribe una nota antes de guardarla.';
			return;
		}

		adminActionError = '';
		adminActionMessage = '';
		adminOrderNoteBusy = { ...adminOrderNoteBusy, [orderId]: true };

		const result = await ordersStore.addOrderNoteDbFirst(orderId, note, 'admin');
		if (!result?.success) {
			adminActionError = result?.error || 'No se pudo guardar la nota del pedido.';
			adminOrderNoteBusy = { ...adminOrderNoteBusy, [orderId]: false };
			return;
		}

		adminOrderNoteDrafts = { ...adminOrderNoteDrafts, [orderId]: '' };
		adminOrderNoteBusy = { ...adminOrderNoteBusy, [orderId]: false };
		adminActionMessage = `Nota añadida al pedido #${orderId}.`;
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
	{#if adminActionError}
		<div class="inline-error">{adminActionError}</div>
	{/if}
	{#if adminActionMessage}
		<div class="inline-success">{adminActionMessage}</div>
	{/if}

	<Card title="🛠️ Pedidos Manuales y Entregas Especiales" class="order-card">
		<div class="manual-grid">
			<div class="manual-column">
				<h3 class="section-title">Crear pedido manual</h3>
				<div class="manual-form-grid">
					<select
						class="filter-input"
						bind:value={manualOrderForm.clientId}
					>
						<option value="">Selecciona cliente...</option>
						{#each allClients as client (client.id)}
							<option value={client.id}>{client.name}</option>
						{/each}
					</select>
					<textarea
						class="filter-input"
						rows="2"
						placeholder="Notas del pedido manual"
						value={manualOrderForm.notes}
						oninput={(e) => (manualOrderForm = { ...manualOrderForm, notes: e.currentTarget.value })}
					></textarea>
				</div>

				<div class="manual-items-list">
					{#each manualOrderItems as item (item.rowId)}
						<div class="manual-item-row">
							<select
								class="filter-input"
								value={item.productId ?? ''}
								onchange={(e) => updateManualItem(item.rowId, 'productId', e.currentTarget.value)}
							>
								<option value="">Producto...</option>
								{#each allProducts as product (product.id)}
									<option value={String(product.id)}>{product.name}</option>
								{/each}
							</select>
							<input
								type="number"
								min="1"
								class="filter-input"
								value={item.quantity}
								oninput={(e) => updateManualItem(item.rowId, 'quantity', e.currentTarget.value)}
							/>
							<Button variant="secondary" size="sm" onclick={() => removeManualItemRow(item.rowId)}>
								Quitar
							</Button>
						</div>
					{/each}
				</div>

				<div class="manual-actions-row">
					<Button variant="secondary" size="sm" onclick={addManualItemRow}>+ Producto</Button>
					<Button variant="primary" size="sm" onclick={createManualOrder}>Crear pedido manual</Button>
				</div>
			</div>

			<div class="manual-column">
				<h3 class="section-title">Crear entrega especial</h3>
				<div class="manual-form-grid">
					<input
						type="text"
						class="filter-input"
						placeholder="Nombre entrega especial"
						value={specialDeliveryForm.name}
						oninput={(e) => (specialDeliveryForm = { ...specialDeliveryForm, name: e.currentTarget.value })}
					/>
					<select
						class="filter-input"
						bind:value={specialDeliveryForm.staffId}
					>
						<option value="">Asignar repartidor...</option>
						{#each allStaff as staff (staff.id)}
							<option value={staff.id}>{staff.name}</option>
						{/each}
					</select>
					<textarea
						class="filter-input"
						rows="2"
						placeholder="Notas de la entrega especial"
						value={specialDeliveryForm.notes}
						oninput={(e) => (specialDeliveryForm = { ...specialDeliveryForm, notes: e.currentTarget.value })}
					></textarea>
				</div>

				<div class="manual-pending-list">
					<p class="section-subtitle">Pedidos manuales pendientes para agrupar</p>
					{#if manualPendingOrders.length === 0}
						<p class="empty-message">No hay pedidos manuales pendientes.</p>
					{:else}
						{#each manualPendingOrders as order (order.id)}
							<label class="manual-pending-row">
								<input
									type="checkbox"
									checked={selectedManualOrderIds.includes(order.id)}
									onchange={() => toggleManualOrderSelection(order.id)}
								/>
								<span>Pedido #{order.id} - {getClientName(order.clientId)}</span>
							</label>
						{/each}
					{/if}
				</div>

				<div class="manual-actions-row">
					<Button variant="primary" size="sm" onclick={createSpecialDeliveryWithOrders}>
						Crear entrega especial
					</Button>
				</div>

				{#if allSpecialDeliveries.length > 0}
					<div class="special-list">
						<p class="section-subtitle">Asignar selección a entrega existente</p>
						{#each allSpecialDeliveries.filter((item) => item.status === 'active') as specialDelivery (specialDelivery.id)}
							<div class="special-row">
								<span>{specialDelivery.name}</span>
								<Button
									variant="secondary"
									size="sm"
									onclick={() => assignOrdersToExistingSpecialDelivery(specialDelivery.id)}
								>
									Agrupar aquí
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Card>

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
					bind:value={statusFilter}
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
					bind:value={zoneFilter}
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
				{@const scopedDeliveryOrders =
					(order.status === 'pending' || order.status === 'in_delivery')
						? getScopedDeliveryOrders(order)
						: []}
				{@const orderNotes = getOrderNotes(order)}
				{@const deliveryPosition =
					scopedDeliveryOrders.findIndex((item) => Number(item.id) === Number(order.id)) + 1}
				{@const deliveryIsEditable =
					(order.status === 'pending' || order.status === 'in_delivery') && scopedDeliveryOrders.length > 0}
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
							<p class="order-label">Tipo</p>
							<p class="order-value">{order.isManual ? 'Manual admin' : 'Normal'}</p>
						</div>

						<div class="order-info">
							<p class="order-label">Entrega especial</p>
							<p class="order-value">{getSpecialDeliveryName(order.specialDeliveryId)}</p>
						</div>

						<div class="order-info">
							<p class="order-label">Orden de reparto</p>
							<p class="order-value">
								{deliveryIsEditable ? `#${deliveryPosition} · ${getDeliveryScopeLabel(order)}` : 'No editable'}
							</p>
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

						<div class="order-notes-section">
							<p class="order-notes-title">Notas del pedido</p>
							{#if orderNotes.length > 0}
								<div class="order-notes-list">
									{#each orderNotes as note (note.id)}
										<div class="order-note-entry">
											<p class="order-note-meta">
												<strong>{note.author}</strong>
												{#if note.createdAt}
													 · {formatDateTime(note.createdAt)}
												{/if}
											</p>
											<p class="order-note-text">{note.text}</p>
										</div>
									{/each}
								</div>
							{:else}
								<p class="order-notes-empty">Sin notas todavía.</p>
							{/if}

							<div class="order-notes-compose">
								<textarea
									class="filter-input"
									rows="2"
									placeholder="Añadir nota como admin"
									value={adminOrderNoteDrafts[order.id] || ''}
									oninput={(e) => updateAdminOrderNoteDraft(order.id, e.currentTarget.value)}
								></textarea>
								<Button
									variant="secondary"
									size="sm"
									onclick={() => addAdminNoteToOrder(order.id)}
									disabled={adminOrderNoteBusy[order.id]}
								>
									{adminOrderNoteBusy[order.id] ? 'Guardando...' : 'Añadir nota'}
								</Button>
							</div>
						</div>

					<!-- Footer: Estado y acciones -->
					<div class="order-footer">
						<div class="status-section">
							<Badge status={order.status} />
						</div>

						<div class="actions-section">
							{#if deliveryIsEditable && scopedDeliveryOrders.length > 1}
								<div class="delivery-order-actions">
									<span class="delivery-order-hint">Orden</span>
									<div class="priority-actions" aria-label="Orden preferente">
										<Button
											variant="secondary"
											size="sm"
											disabled={deliveryPosition === 1}
											onclick={() => moveDeliveryOrder(order.id, 'up')}
										>
											↑
										</Button>
										<Button
											variant="secondary"
											size="sm"
											disabled={deliveryPosition === scopedDeliveryOrders.length}
											onclick={() => moveDeliveryOrder(order.id, 'down')}
										>
											↓
										</Button>
									</div>
								</div>
							{/if}
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

	.manual-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1rem;
		padding: 1.25rem;
	}

	.manual-column {
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
		background: #0f172a;
	}

	.section-title {
		margin: 0 0 0.9rem;
		font-size: 1rem;
		color: #e2e8f0;
	}

	.section-subtitle {
		margin: 0 0 0.6rem;
		font-size: 0.85rem;
		color: #cbd5e1;
	}

	.manual-form-grid {
		display: grid;
		gap: 0.65rem;
		margin-bottom: 0.8rem;
	}

	.manual-items-list {
		display: grid;
		gap: 0.5rem;
	}

	.manual-item-row {
		display: grid;
		grid-template-columns: 1fr 110px auto;
		gap: 0.5rem;
	}

	.manual-actions-row {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.8rem;
		flex-wrap: wrap;
	}

	.manual-pending-list {
		margin-top: 0.8rem;
		padding: 0.65rem;
		border: 1px dashed #334155;
		border-radius: 0.4rem;
		max-height: 220px;
		overflow: auto;
	}

	.manual-pending-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.85rem;
		color: #cbd5e1;
		margin-bottom: 0.45rem;
	}

	.special-list {
		margin-top: 1rem;
		display: grid;
		gap: 0.5rem;
	}

	.special-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.45rem 0.6rem;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		background: #1e293b;
		font-size: 0.85rem;
		color: #cbd5e1;
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

	.order-notes-section {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #334155;
		background: #111827;
	}

	.order-notes-title {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #93c5fd;
	}

	.order-notes-list {
		display: grid;
		gap: 0.6rem;
	}

	.order-note-entry {
		padding: 0.6rem 0.7rem;
		border-radius: 0.4rem;
		border: 1px solid #374151;
		background: #0f172a;
	}

	.order-note-meta {
		margin: 0;
		font-size: 0.78rem;
		color: #cbd5e1;
	}

	.order-note-text {
		margin: 0.25rem 0 0;
		font-size: 0.88rem;
		color: #e2e8f0;
		white-space: pre-wrap;
	}

	.order-notes-empty {
		margin: 0;
		font-size: 0.84rem;
		color: #94a3b8;
	}

	.order-notes-compose {
		margin-top: 0.75rem;
		display: grid;
		gap: 0.55rem;
		justify-items: start;
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

	.delivery-order-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 0.7rem;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		background: #0f172a;
	}

	.delivery-order-hint {
		font-size: 0.8rem;
		font-weight: 700;
		color: #93c5fd;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.priority-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
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
