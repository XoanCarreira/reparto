<!-- PÁGINA: Panel Repartidor -->
<script>
	/**
	 * Panel operativo del repartidor.
	 * Incluye rutas asignadas, incidencias y confirmación de entregas en ruta activa.
	 */

	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/authStore.js';
	import {
		ordersStore,
		incidentsStore,
		zonesStore,
		clientsStore,
		deliveryStaffStore,
		productsStore
	} from '$lib/stores/dataStore.js';
	import { formatDate } from '$lib/utils/helpers.js';

	let currentUser = $state(null);
	let allOrders = $state([]);
	let allIncidents = $state([]);
	let allZones = $state([]);
	let allClients = $state([]);
	let allStaff = $state([]);
	let allProducts = $state([]);

	let routeActive = $state(false);
	let deliveryNotes = $state({});
	let internalIncidentText = $state({});
	let preferredDeliveryOrder = $state([]);
	let hydratedPreferenceKey = $state('');

	authStore.subscribe((session) => {
		currentUser = session;
	});

	ordersStore.subscribe(($orders) => {
		allOrders = $orders;
	});

	incidentsStore.subscribe(($incidents) => {
		allIncidents = $incidents;
	});

	zonesStore.subscribe(($zones) => {
		allZones = $zones;
	});

	clientsStore.subscribe(($clients) => {
		allClients = $clients;
	});

	deliveryStaffStore.subscribe(($staff) => {
		allStaff = $staff;
	});

	productsStore.subscribe(($products) => {
		allProducts = $products;
	});

	function normalizeText(value) {
		return String(value || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.trim();
	}

	function getTodayLabel() {
		const weekdays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
		return weekdays[new Date().getDay()];
	}

	function isZoneScheduledForToday(zone) {
		const today = getTodayLabel();
		return Array.isArray(zone?.deliveryDays)
			? zone.deliveryDays.some((day) => normalizeText(day) === today)
			: false;
	}

	const currentDeliveryStaff = $derived(
		allStaff.find((staff) => Number(staff.id) === Number(currentUser?.deliveryStaffId)) ||
			allStaff.find((staff) => normalizeText(staff.email) === normalizeText(currentUser?.email)) ||
			null
	);

	const activeZoneId = $derived(currentDeliveryStaff?.zoneId ?? currentUser?.zone ?? null);

	const assignedZones = $derived(
		allZones.filter((zone) => Number(zone.id) === Number(activeZoneId))
	);

	const todaysAssignedZones = $derived(assignedZones.filter((zone) => isZoneScheduledForToday(zone)));

	const assignedOrders = $derived(
		allOrders.filter((order) => {
			const client = allClients.find((item) => item.id === order.clientId);
			if (!client) return false;
			return Number(client.zone) === Number(activeZoneId);
		})
	);

	const routeOrders = $derived(assignedOrders.filter((order) => order.status === 'pending'));

	const preferredOrderStorageKey = $derived(
		(currentDeliveryStaff?.id || currentUser?.deliveryStaffId || currentUser?.id)
			? `delivery-preferred-order-${currentDeliveryStaff?.id || currentUser?.deliveryStaffId || currentUser?.id}`
			: ''
	);

	const sortedRouteOrders = $derived(
		[...routeOrders].sort((a, b) => {
			const aPriority = preferredDeliveryOrder.indexOf(a.id);
			const bPriority = preferredDeliveryOrder.indexOf(b.id);

			const aIndex = aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority;
			const bIndex = bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority;
			if (aIndex !== bIndex) {
				return aIndex - bIndex;
			}

			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		})
	);

	const relatedIncidents = $derived(
		allIncidents.filter((incident) =>
			routeOrders.some((order) => order.id === incident.orderId) ||
			assignedOrders.some((order) => order.id === incident.orderId)
		)
	);

	function arraysMatch(a, b) {
		if (a.length !== b.length) {
			return false;
		}

		for (let i = 0; i < a.length; i++) {
			if (Number(a[i]) !== Number(b[i])) {
				return false;
			}
		}

		return true;
	}

	function buildNormalizedPreferredOrder(activeOrderIds, currentPreferredOrder) {
		const retained = currentPreferredOrder.filter((orderId) => activeOrderIds.includes(orderId));
		const missing = activeOrderIds.filter((orderId) => !retained.includes(orderId));
		return [...retained, ...missing];
	}

	$effect(() => {
		if (!browser || !preferredOrderStorageKey) {
			return;
		}

		if (hydratedPreferenceKey === preferredOrderStorageKey) {
			return;
		}

		let parsed = [];
		const storedOrder = localStorage.getItem(preferredOrderStorageKey);
		if (storedOrder) {
			try {
				const value = JSON.parse(storedOrder);
				if (Array.isArray(value)) {
					parsed = value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
				}
			} catch {
				parsed = [];
			}
		}

		preferredDeliveryOrder = parsed;
		hydratedPreferenceKey = preferredOrderStorageKey;
	});

	$effect(() => {
		const activeOrderIds = routeOrders.map((order) => order.id);
		const normalizedOrder = buildNormalizedPreferredOrder(activeOrderIds, preferredDeliveryOrder);
		if (!arraysMatch(normalizedOrder, preferredDeliveryOrder)) {
			preferredDeliveryOrder = normalizedOrder;
		}
	});

	$effect(() => {
		if (!browser || !preferredOrderStorageKey) {
			return;
		}

		localStorage.setItem(preferredOrderStorageKey, JSON.stringify(preferredDeliveryOrder));
	});

	function getClientName(clientId) {
		const client = allClients.find((item) => item.id === clientId);
		return client?.name || 'Cliente desconocido';
	}

	function getClientData(clientId) {
		return allClients.find((item) => Number(item.id) === Number(clientId)) || null;
	}

	function getClientMapsLink(client) {
		if (!client) {
			return '';
		}

		if (client.gpsLat !== null && client.gpsLat !== undefined && client.gpsLng !== null && client.gpsLng !== undefined) {
			return `https://www.google.com/maps?q=${client.gpsLat},${client.gpsLng}`;
		}

		if (client.address) {
			return `https://www.google.com/maps?q=${encodeURIComponent(client.address)}`;
		}

		return '';
	}

	function openClientMaps(link) {
		if (!link) {
			return;
		}

		window.open(link, '_blank', 'noopener,noreferrer');
	}

	function getProductName(productId) {
		const product = allProducts.find((item) => Number(item.id) === Number(productId));
		return product?.name || `Producto #${productId}`;
	}

	function getPreferredDeliveryPosition(orderId) {
		const index = preferredDeliveryOrder.indexOf(orderId);
		if (index === -1) {
			return preferredDeliveryOrder.length + 1;
		}

		return index + 1;
	}

	function movePreferredOrder(orderId, direction) {
		const currentIndex = preferredDeliveryOrder.indexOf(orderId);
		if (currentIndex === -1) {
			return;
		}

		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		if (targetIndex < 0 || targetIndex >= preferredDeliveryOrder.length) {
			return;
		}

		const nextOrder = [...preferredDeliveryOrder];
		[nextOrder[currentIndex], nextOrder[targetIndex]] = [
			nextOrder[targetIndex],
			nextOrder[currentIndex]
		];
		preferredDeliveryOrder = nextOrder;
	}

	function resetPreferredDeliveryOrder() {
		preferredDeliveryOrder = [];
	}

	function toggleRoute() {
		routeActive = !routeActive;
	}

	function updateNote(orderId, value) {
		deliveryNotes = { ...deliveryNotes, [orderId]: value };
	}

	function updateInternalIncident(orderId, value) {
		internalIncidentText = { ...internalIncidentText, [orderId]: value };
	}

	function validateDelivery(orderId) {
		const note = String(deliveryNotes[orderId] || '').trim();
		ordersStore.updateDeliveryNote(orderId, note);
		ordersStore.updateStatus(orderId, 'delivered');
		deliveryNotes = { ...deliveryNotes, [orderId]: '' };
	}

	function createInternalIncident(orderId) {
		const description = String(internalIncidentText[orderId] || '').trim();
		if (!description) return;

		const order = allOrders.find((item) => item.id === orderId);
		if (!order) return;

		incidentsStore.create(
			orderId,
			order.clientId,
			'other',
			`[Interna Repartidor] ${description}`,
			'high'
		);
		internalIncidentText = { ...internalIncidentText, [orderId]: '' };
	}
</script>

<svelte:head>
	<title>Panel Repartidor - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header-row">
		<div class="page-header">
			<h1 class="page-title">🚚 Panel de Reparto</h1>
			<p class="page-subtitle">Operativa diaria de rutas, entregas e incidencias</p>
		</div>
		<Button variant={routeActive ? 'danger' : 'primary'} size="sm" onclick={toggleRoute}>
			{routeActive ? 'Finalizar ruta activa' : 'Iniciar ruta'}
		</Button>
	</div>

	<!--Primer grupo de tarjetas que se muestran in line-->
	<div class="group-card-flex">
		<Card title="📅 Rutas Asignadas para Hoy" titleClass="title-blue" class="card-section">
			{#if todaysAssignedZones.length === 0}
			<p class="text-secondary">No tienes rutas programadas para hoy.</p>
			{:else}
			<div class="delivery-grid">
				{#each todaysAssignedZones as zone (zone.id)}
				<div class="delivery-info-card">
					<p class="delivery-label">Zona</p>
					<p class="delivery-value">{zone.name}</p>
					<p class="delivery-meta">Horario: {zone.deliveryTime || 'No definido'}</p>
					<p class="delivery-meta">Próxima: {zone.nextDelivery ? formatDate(zone.nextDelivery) : 'Sin fecha'}</p>
				</div>
				{/each}
			</div>
			{/if}
		</Card>
		
		<Card title="🗺️ Todas las Rutas Asignadas" titleClass="title-blue" class="card-section">
			{#if assignedZones.length === 0}
			<p class="text-secondary">No tienes rutas asignadas actualmente.</p>
			{:else}
			<div class="delivery-grid">
				{#each assignedZones as zone (zone.id)}
				<div class="delivery-info-card">
					<p class="delivery-label">Zona</p>
					<p class="delivery-value">{zone.name}</p>
					<p class="delivery-meta">Días: {Array.isArray(zone.deliveryDays) ? zone.deliveryDays.join(', ') : 'Sin definir'}</p>
					<p class="delivery-meta">Horario: {zone.deliveryTime || 'No definido'}</p>
				</div>
				{/each}
			</div>
			{/if}
		</Card>	
	</div>


	<Card title="📦 Ruta Activa: Confirmación de Entregas" titleClass="title-violet" class="card-section">
		{#if !routeActive}
			<p class="text-secondary">Activa la ruta para empezar a confirmar entregas.</p>
		{:else if routeOrders.length === 0}
			<p class="text-secondary">No hay pedidos pendientes en tu zona.</p>
		{:else}
			<div class="route-actions-bar">
				<Button variant="secondary" size="sm" onclick={resetPreferredDeliveryOrder}>
					Restablecer orden preferente
				</Button>
			</div>
			<div class="orders-list">
				{#each sortedRouteOrders as order (order.id)}
					{@const client = getClientData(order.clientId)}
					{@const mapsLink = getClientMapsLink(client)}
					{@const preferredPosition = getPreferredDeliveryPosition(order.id)}
					{@const isFirst = preferredPosition === 1}
					{@const isLast = preferredPosition === preferredDeliveryOrder.length}
					<div class="delivery-order-card">
						<div class="delivery-order-header">
							<div>
								<p class="order-title">Pedido #{order.id}</p>
							</div>
							<div class="delivery-order-meta">
								<p class="order-priority-badge">Entrega #{preferredPosition}</p>
								<div class="priority-actions" aria-label="Orden preferente">
									<button
										type="button"
										class="priority-btn"
										disabled={isFirst}
										onclick={() => movePreferredOrder(order.id, 'up')}
									>
										↑
									</button>
									<button
										type="button"
										class="priority-btn"
										disabled={isLast}
										onclick={() => movePreferredOrder(order.id, 'down')}
									>
										↓
									</button>
								</div>
								<Badge status={order.status} />
							</div>
						</div>

						<div class="client-info-box">
							<p class="client-info-title">Datos de cliente</p>
							<div class="client-info-grid">
								<p><strong>Nombre:</strong> {getClientName(order.clientId)}</p>
								<p><strong>Dirección:</strong> {client?.address || 'No disponible'}</p>
								<p><strong>Teléfono:</strong> {client?.phone || 'No disponible'}</p>
								<p>
									<strong>Coordenadas:</strong>
									{#if client?.gpsLat !== null && client?.gpsLat !== undefined && client?.gpsLng !== null && client?.gpsLng !== undefined}
										{client.gpsLat}, {client.gpsLng}
									{:else}
										No disponibles
									{/if}
								</p>
							</div>
							{#if mapsLink}
								<button type="button" class="maps-link" onclick={() => openClientMaps(mapsLink)}>
									Abrir ubicación en Google Maps
								</button>
							{/if}
						</div>

						<div class="order-items-box">
							<p class="order-items-title">Productos del pedido</p>
							<div class="order-items-list">
								{#each order.items as item (item.productId)}
									<p>
										• {getProductName(item.productId)}: {item.quantity} uds pedidas
									</p>
								{/each}
							</div>
						</div>

						<div class="delivery-form-grid">
							<div class="form-field">
								<label class="form-label" for={`note-${order.id}`}>Nota de entrega</label>
								<textarea
									id={`note-${order.id}`}
									rows="2"
									class="form-textarea"
									value={deliveryNotes[order.id] || ''}
									oninput={(e) => updateNote(order.id, e.currentTarget.value)}
								></textarea>
							</div>

							<div class="form-field">
								<label class="form-label" for={`incident-${order.id}`}>Incidencia interna</label>
								<textarea
									id={`incident-${order.id}`}
									rows="2"
									class="form-textarea"
									value={internalIncidentText[order.id] || ''}
									oninput={(e) => updateInternalIncident(order.id, e.currentTarget.value)}
								></textarea>
							</div>
						</div>

						<div class="delivery-actions">
							<Button variant="secondary" size="sm" onclick={() => createInternalIncident(order.id)}>
								Crear incidencia interna
							</Button>
							<Button variant="primary" size="sm" onclick={() => validateDelivery(order.id)}>
								Validar entrega
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card>

	<Card title="⚠️ Incidencias Recibidas" titleClass="title-amber" class="card-section">
		{#if relatedIncidents.length === 0}
			<p class="text-secondary">No hay incidencias asociadas a tu ruta.</p>
		{:else}
			<div class="incidents-list">
				{#each relatedIncidents as incident (incident.id)}
					<div class="incident-row">
						<div>
							<p class="incident-title">Incidencia #{incident.id} - Pedido #{incident.orderId}</p>
							<p class="incident-client">Cliente: {getClientName(incident.clientId)}</p>
							<p class="incident-description">{incident.description}</p>
						</div>
						<Badge status={incident.status} />
					</div>
				{/each}
			</div>
		{/if}
	</Card>
</div>

<style>
	:global(.card-section) {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}

	:global(.title-blue) {
		color: #93c5fd !important;
	}

	:global(.title-amber) {
		color: #fcd34d !important;
	}

	:global(.title-violet) {
		color: #c4b5fd !important;
	}

	.group-card-flex {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
	}

	.text-secondary {
		margin: 0;
		font-size: 0.92rem;
		color: #94a3b8;
	}


	.delivery-info-card {
		padding: 0.85rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.45rem;
	}

	.delivery-label {
		margin: 0;
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.delivery-value {
		margin: 0.35rem 0 0;
		font-weight: 600;
		color: #f1f5f9;
	}

	.delivery-meta {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
		color: #cbd5e1;
	}

	.incidents-list {
		display: grid;
		gap: 0.75rem;
	}

	.incident-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.85rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.45rem;
	}

	.incident-title {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.incident-client {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
		color: #cbd5e1;
	}

	.incident-description {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
		color: #94a3b8;
	}

	.orders-list {
		display: grid;
		gap: 0.85rem;
	}

	.route-actions-bar {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.75rem;
	}

	.delivery-order-card {
		display: grid;
		gap: 0.85rem;
		padding: 1rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
	}

	.delivery-order-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid #334155;
	}

	.order-title {
		margin: 0;
		font-size: 0.96rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.delivery-order-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.order-priority-badge {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		color: #93c5fd;
		background: rgba(59, 130, 246, 0.15);
		border: 1px solid rgba(59, 130, 246, 0.35);
		border-radius: 999px;
		padding: 0.2rem 0.55rem;
	}

	.priority-actions {
		display: inline-flex;
		gap: 0.25rem;
	}

	.priority-btn {
		width: 1.7rem;
		height: 1.55rem;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		background: #1e293b;
		color: #cbd5e1;
		cursor: pointer;
		line-height: 1;
		font-size: 0.8rem;
	}

	.priority-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.client-info-box {
		padding: 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.4rem;
		background: #111827;
	}

	.client-info-title {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 700;
		color: #cbd5e1;
	}

	.client-info-grid {
		margin-top: 0.5rem;
		display: grid;
		gap: 0.3rem;
	}

	.client-info-grid p {
		margin: 0;
		font-size: 0.82rem;
		color: #94a3b8;
	}

	.maps-link {
		display: inline-block;
		margin-top: 0.6rem;
		font-size: 0.82rem;
		font-weight: 600;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: none;
		color: #60a5fa;
	}

	.maps-link:hover {
		text-decoration: underline;
	}

	.order-items-box {
		padding: 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.4rem;
		background: #111827;
	}

	.order-items-title {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 700;
		color: #cbd5e1;
	}

	.order-items-list {
		margin-top: 0.5rem;
		display: grid;
		gap: 0.3rem;
	}

	.order-items-list p {
		margin: 0;
		font-size: 0.82rem;
		color: #94a3b8;
	}

	.delivery-form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}

	.form-field {
		display: grid;
		gap: 0.4rem;
	}

	.form-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.form-textarea {
		width: 100%;
		padding: 0.6rem 0.7rem;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.4rem;
		font: inherit;
		color: #f1f5f9;
		resize: none;
		transition: border-color 0.2s ease;
	}

	.form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.delivery-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding-top: 0.75rem;
		border-top: 1px solid #334155;
	}

	@media (min-width: 768px) {
		.delivery-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.delivery-form-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.incident-row,
		.delivery-order-header {
			flex-direction: column;
		}
	}
</style>
