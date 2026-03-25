<!-- PÁGINA: Panel Repartidor -->
<script>
	/**
	 * Panel operativo del repartidor.
	 * Incluye rutas asignadas, incidencias y confirmación de entregas en ruta activa.
	 */

	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { authStore } from '$lib/stores/authStore.js';
	import { ordersStore, incidentsStore, zonesStore, clientsStore } from '$lib/stores/dataStore.js';
	import { formatDate } from '$lib/utils/helpers.js';

	let currentUser = $state(null);
	let allOrders = $state([]);
	let allIncidents = $state([]);
	let allZones = $state([]);
	let allClients = $state([]);

	let routeActive = $state(false);
	let deliveryNotes = $state({});
	let internalIncidentText = $state({});

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

	const assignedZone = $derived(
		allZones.find((zone) => Number(zone.id) === Number(currentUser?.zone)) || null
	);

	const assignedOrders = $derived(
		allOrders.filter((order) => {
			const client = allClients.find((item) => item.id === order.clientId);
			if (!client) return false;
			return Number(client.zone) === Number(currentUser?.zone);
		})
	);

	const routeOrders = $derived(assignedOrders.filter((order) => order.status === 'pending'));

	const relatedIncidents = $derived(
		allIncidents.filter((incident) =>
			routeOrders.some((order) => order.id === incident.orderId) ||
			assignedOrders.some((order) => order.id === incident.orderId)
		)
	);

	function getClientName(clientId) {
		const client = allClients.find((item) => item.id === clientId);
		return client?.name || 'Cliente desconocido';
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
			<p class="page-subtitle">Operativa diaria de entregas e incidencias</p>
		</div>
		<Button variant={routeActive ? 'danger' : 'primary'} size="sm" onclick={toggleRoute}>
			{routeActive ? 'Finalizar ruta activa' : 'Iniciar ruta'}
		</Button>
	</div>

	<Card title="🗺️ Ruta Asignada" titleClass="title-blue" class="card-section">
		{#if assignedZone}
			<div class="delivery-grid">
				<div class="delivery-info-card">
					<p class="delivery-label">Zona</p>
					<p class="delivery-value">{assignedZone.name}</p>
				</div>
				<div class="delivery-info-card">
					<p class="delivery-label">Horario</p>
					<p class="delivery-value">{assignedZone.deliveryTime || 'No definido'}</p>
				</div>
				<div class="delivery-info-card">
					<p class="delivery-label">Próxima entrega</p>
					<p class="delivery-value">{assignedZone.nextDelivery ? formatDate(assignedZone.nextDelivery) : 'Sin fecha'}</p>
				</div>
			</div>
		{:else}
			<p class="text-secondary">No tienes una zona asignada.</p>
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

	<Card title="📦 Ruta Activa: Confirmación de Entregas" titleClass="title-violet" class="card-section">
		{#if !routeActive}
			<p class="text-secondary">Activa la ruta para empezar a confirmar entregas.</p>
		{:else if routeOrders.length === 0}
			<p class="text-secondary">No hay pedidos pendientes en tu zona.</p>
		{:else}
			<div class="orders-list">
				{#each routeOrders as order (order.id)}
					<div class="delivery-order-card">
						<div class="delivery-order-header">
							<div>
								<p class="order-title">Pedido #{order.id}</p>
								<p class="order-subtitle">Cliente: {getClientName(order.clientId)}</p>
							</div>
							<Badge status={order.status} />
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

	.text-secondary {
		margin: 0;
		font-size: 0.92rem;
		color: #94a3b8;
	}

	.delivery-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 0.75rem;
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

	.order-subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.83rem;
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
