<!-- PÁGINA: Pedidos Cliente -->
<script>
	/**
	 * PÁGINA DE PEDIDOS DEL CLIENTE
	 * Visualiza sus pedidos: pendientes, entregados, etc.
	 * Permite ver detalles y crear nuevos pedidos
	 * Permite reportar incidencias ligadas a pedidos
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore.js';
	import { ordersStore, incidentsStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDate, daysUntil } from '$lib/utils/helpers.js';
	import { zones } from '$lib/data/mockData.js';

	let currentUser;
	let clientOrders = $state([]);
	let pendingOrders = $state([]);
	let deliveredOrders = $state([]);
	let nextDeliveryZone = $state(null);
	let showIncidentModal = $state(false);
	let selectedOrderId = $state(null);
	let incidentForm = $state({
		type: 'damaged',
		priority: 'medium',
		description: ''
	});
	let incidentSubmitting = $state(false);
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state('success'); // 'success', 'error', 'info'

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
	 * Abre el modal para reportar incidencia
	 */
	function openIncidentModal(orderId) {
		selectedOrderId = orderId;
		incidentForm = {
			type: 'damaged',
			priority: 'medium',
			description: ''
		};
		showIncidentModal = true;
	}

	/**
	 * Cierra el modal de incidencia
	 */
	function closeIncidentModal() {
		showIncidentModal = false;
		selectedOrderId = null;
		incidentForm = { type: 'damaged', priority: 'medium', description: '' };
	}

	/**
	 * Envía la incidencia
	 */
	async function submitIncident() {
		if (!incidentForm.description.trim()) {
			showToastMessage('Por favor describe el problema', 'error');
			return;
		}

		incidentSubmitting = true;

		try {
			incidentsStore.create(
				selectedOrderId,
				currentUser.id,
				incidentForm.type,
				incidentForm.description,
				incidentForm.priority
			);

			showToastMessage('✓ Incidencia reportada correctamente. Nuestro equipo la revisará pronto.', 'success');
			await new Promise((resolve) => setTimeout(resolve, 1500));
			closeIncidentModal();
		} catch (err) {
			console.error('Error al reportar incidencia:', err);
			showToastMessage('✕ Error al reportar la incidencia. Por favor intenta nuevamente.', 'error');
			incidentSubmitting = false;
		}
	}

	/**
	 * Muestra un toast/banner con mensaje
	 */
	function showToastMessage(message, type = 'success') {
		toastMessage = message;
		toastType = type;
		showToast = true;

		// Oculta el toast después de 4 segundos
		setTimeout(() => {
			showToast = false;
		}, 4000);
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

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header">
		<h1 class="page-title">📦 Mis Pedidos</h1>
		<p class="page-subtitle">Solicitudes de entrega y gestión de tu cuenta</p>
	</div>

	{#if nextDeliveryZone}
		{@const countdown = getDeliveryCountdown()}
		{@const deliveryInfo = getDeliveryInfo()}
		<Card class="card-section">
			<div class="delivery-panel-grid">
				<div class="delivery-panel-block">
					<h3 class="panel-title">📅 Próxima Entrega</h3>
					<div class="panel-info-list">
						<div class="panel-info-item">
							<p class="item-label">Fecha</p>
							<p class="item-value item-value-blue">{countdown && countdown.message}</p>
						</div>
						<div class="panel-info-item">
							<p class="item-label">Días de reparto</p>
							<p class="item-value">{deliveryInfo.days}</p>
						</div>
						<div class="panel-info-item">
							<p class="item-label">Horario</p>
							<p class="item-value">{deliveryInfo.time}</p>
						</div>
					</div>
				</div>

				<div class="delivery-panel-block">
					<h3 class="panel-title">📍 Zona de Reparto</h3>
					<div class="panel-info-list">
						<div class="panel-info-item">
							<p class="item-label">Zona</p>
							<p class="item-value item-value-strong">{nextDeliveryZone.name}</p>
						</div>
						<div class="panel-info-item">
							<p class="item-label">Ubicación</p>
							<p class="item-value">{deliveryInfo.location}</p>
						</div>
						<div class="panel-info-item">
							<p class="item-label">Descripción</p>
							<p class="item-value">{nextDeliveryZone.description}</p>
						</div>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<div class="stats-grid stats-grid-3">
		<div class="stat-card amber">
			<div class="stat-content">
				<div class="stat-value">{pendingOrders.length}</div>
				<p class="stat-label">Pedidos Pendientes</p>
				<p class="stat-meta">{formatCurrency(getPendingTotal())}</p>
			</div>
		</div>

		<div class="stat-card emerald">
			<div class="stat-content">
				<div class="stat-value">{deliveredOrders.length}</div>
				<p class="stat-label">Pedidos Entregados</p>
				<p class="stat-meta">Historial completado</p>
			</div>
		</div>

		<div class="stat-card blue">
			<div class="stat-content">
				<div class="stat-value">{clientOrders.length}</div>
				<p class="stat-label">Total de Pedidos</p>
				<p class="stat-meta">Todos los tiempos</p>
			</div>
		</div>
	</div>

	<div class="action-bar">
		<a href={resolve('/client/orders/new')} class="primary-link-btn">+ Crear Nuevo Pedido</a>
	</div>

	{#if pendingOrders.length > 0}
		<Card title="⏳ Pedidos Pendientes" titleClass="title-amber" class="card-section">
			<div class="orders-list">
				{#each pendingOrders as order (order.id)}
					<div class="order-card">
						<div class="order-header">
							<div>
								<p class="order-id">Pedido #{order.id}</p>
								<p class="order-date">{formatDate(order.createdAt)}</p>
							</div>
							<Badge status={order.status} />
						</div>

						<div class="order-items-box">
							<p class="order-items-title">Items ({countItems(order.items)})</p>
							<div class="order-items-list">
								{#each order.items as item (item.productId)}
									<p>• {item.quantity}x unidades - {formatCurrency(item.unitPrice * item.quantity)}</p>
								{/each}
							</div>
						</div>

						<div class="order-summary-row">
							<div>
								<p class="summary-label">Entrega programada</p>
								<p class="summary-value">{formatDate(order.scheduledDelivery)}</p>
							</div>
							<div class="summary-total-box">
								<p class="summary-label">Total</p>
								<p class="summary-total">{formatCurrency(order.totalAmount)}</p>
							</div>
						</div>

						<Button variant="danger" size="sm" onclick={() => openIncidentModal(order.id)}>
							⚠️ Reportar Problema
						</Button>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	{#if deliveredOrders.length > 0}
		<Card title="✅ Historial de Entregas" titleClass="title-emerald" class="card-section">
			<div class="delivered-list">
				{#each deliveredOrders.slice(0, 5) as order (order.id)}
					<div class="delivered-card">
						<div>
							<p class="order-id order-id-compact">Pedido #{order.id}</p>
							<p class="order-date">
								{countItems(order.items)} items • {formatDate(order.deliveredAt || order.createdAt)}
							</p>
						</div>
						<div class="delivered-actions">
							<div class="summary-total-box">
								<p class="summary-value">{formatCurrency(order.totalAmount)}</p>
								<Badge status={order.status} />
							</div>
							<Button variant="secondary" size="sm" onclick={() => openIncidentModal(order.id)}>
								⚠️ Reportar
							</Button>
						</div>
					</div>
				{/each}

				{#if deliveredOrders.length > 5}
					<p class="list-more-note">...y {deliveredOrders.length - 5} mas</p>
				{/if}
			</div>
		</Card>
	{/if}

	{#if clientOrders.length === 0}
		<Card class="card-section">
			<div class="empty-state">
				<p class="empty-text">Aun no tienes pedidos</p>
				<a href={resolve('/client/orders/new')} class="primary-link-btn">Crear tu primer pedido</a>
			</div>
		</Card>
	{/if}

	{#if showIncidentModal}
		<div class="modal-overlay" role="dialog" aria-modal="true">
			<div class="modal-card animate-fadeIn">
				<div class="modal-header">
					<h3 class="modal-title">Reportar Problema - Pedido #{selectedOrderId}</h3>
					<p class="modal-subtitle">Cuentanos que sucedio con tu pedido</p>
				</div>

				<div class="modal-form">
					<div class="form-group">
						<label for="incident-type" class="form-label">Tipo de Problema</label>
						<select id="incident-type" bind:value={incidentForm.type} class="form-input">
							<option value="damaged">Producto Danado</option>
							<option value="delayed">Retraso en Entrega</option>
							<option value="wrong_quantity">Cantidad Incorrecta</option>
							<option value="other">Otro Problema</option>
						</select>
					</div>

					<div class="form-group">
						<label for="incident-priority" class="form-label">Prioridad</label>
						<select id="incident-priority" bind:value={incidentForm.priority} class="form-input">
							<option value="low">Baja</option>
							<option value="medium">Media</option>
							<option value="high">Alta</option>
						</select>
					</div>

					<div class="form-group">
						<label for="incident-description" class="form-label">Descripcion Detallada *</label>
						<textarea
							id="incident-description"
							bind:value={incidentForm.description}
							placeholder="Describe el problema con tanto detalle como sea posible..."
							rows="4"
							class="form-input form-textarea"
						></textarea>
						<p class="field-note">Campo requerido</p>
					</div>
				</div>

				<div class="modal-footer">
					<Button variant="secondary" size="sm" onclick={closeIncidentModal} disabled={incidentSubmitting}>
						Cancelar
					</Button>
					<Button
						variant="primary"
						size="sm"
						onclick={submitIncident}
						disabled={incidentSubmitting || !incidentForm.description.trim()}
					>
						{#if incidentSubmitting}
							Enviando...
						{:else}
							Reportar Problema
						{/if}
					</Button>
				</div>
			</div>
		</div>
	{/if}

	{#if showToast}
		<div class="toast-wrap animate-slideInRight">
			<div class={`toast-box ${toastType}`}>
				{#if toastType === 'success'}
					<span class="toast-icon">✓</span>
				{:else if toastType === 'error'}
					<span class="toast-icon">✕</span>
				{:else}
					<span class="toast-icon">i</span>
				{/if}
				<p class="toast-message">{toastMessage}</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.page-root {
		width: 100%;
		padding: 1.5rem;
		background: #0f172a;
		color: #cbd5e1;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-title {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.page-subtitle {
		margin: 0.5rem 0 0;
		font-size: 0.95rem;
		color: #94a3b8;
	}

	.card-section {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.25rem;
		margin-bottom: 1.25rem;
	}

	.delivery-panel-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1rem;
	}

	.delivery-panel-block {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.panel-title {
		margin: 0 0 1rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.panel-info-list {
		display: grid;
		gap: 0.85rem;
	}

	.item-label {
		margin: 0;
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.item-value {
		margin: 0.35rem 0 0;
		font-size: 0.95rem;
		color: #cbd5e1;
	}

	.item-value-blue {
		color: #60a5fa;
		font-weight: 600;
	}

	.item-value-strong {
		color: #f1f5f9;
		font-weight: 600;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1rem;
		margin: 1.25rem 0;
	}

	.stats-grid-3 {
		grid-template-columns: repeat(1, minmax(0, 1fr));
	}

	.stat-card {
		border-radius: 0.5rem;
		padding: 1px;
	}

	.stat-card .stat-content {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
		text-align: center;
	}

	.stat-card.blue {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(15, 23, 42, 0.2));
	}

	.stat-card.amber {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.2));
	}

	.stat-card.emerald {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(15, 23, 42, 0.2));
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #f1f5f9;
		line-height: 1;
	}

	.stat-label {
		margin: 0.65rem 0 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.stat-meta {
		margin: 0.35rem 0 0;
		font-size: 0.85rem;
		color: #94a3b8;
	}

	.action-bar {
		display: flex;
		justify-content: center;
		margin: 1rem 0 1.5rem;
	}

	.primary-link-btn {
		display: inline-block;
		padding: 0.7rem 1.1rem;
		border-radius: 0.45rem;
		background: #2563eb;
		border: 1px solid #3b82f6;
		color: #eff6ff;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.primary-link-btn:hover {
		background: #1d4ed8;
	}

	.orders-list,
	.delivered-list {
		display: grid;
		gap: 0.85rem;
	}

	.order-card,
	.delivered-card {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.order-header,
	.order-summary-row,
	.delivered-card {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.85rem;
	}

	.order-id {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.order-id-compact {
		font-size: 0.95rem;
	}

	.order-date {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: #94a3b8;
	}

	.order-items-box {
		margin: 0.85rem 0;
		padding: 0.85rem;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.4rem;
	}

	.order-items-title {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.order-items-list {
		display: grid;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: #cbd5e1;
	}

	.order-summary-row {
		padding-top: 0.85rem;
		border-top: 1px solid #334155;
		margin-bottom: 0.85rem;
	}

	.summary-label {
		margin: 0;
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.summary-value {
		margin: 0.3rem 0 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: #f1f5f9;
	}

	.summary-total-box {
		text-align: right;
	}

	.summary-total {
		margin: 0.3rem 0 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #60a5fa;
	}

	.delivered-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.list-more-note {
		text-align: center;
		margin: 0;
		font-size: 0.85rem;
		color: #94a3b8;
	}

	.empty-state {
		padding: 1.5rem;
		text-align: center;
	}

	.empty-text {
		margin: 0 0 1rem;
		font-size: 1rem;
		color: #94a3b8;
	}

	.title-amber {
		color: #fcd34d !important;
	}

	.title-emerald {
		color: #86efac !important;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(2, 6, 23, 0.72);
		backdrop-filter: blur(3px);
		z-index: 50;
	}

	.modal-card {
		width: 100%;
		max-width: 34rem;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.65rem;
		overflow: hidden;
	}

	.modal-header,
	.modal-form,
	.modal-footer {
		padding: 1rem;
	}

	.modal-header {
		border-bottom: 1px solid #334155;
	}

	.modal-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.modal-subtitle {
		margin: 0.35rem 0 0;
		font-size: 0.85rem;
		color: #94a3b8;
	}

	.modal-form {
		display: grid;
		gap: 0.85rem;
	}

	.form-group {
		display: grid;
		gap: 0.4rem;
	}

	.form-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.form-input {
		width: 100%;
		padding: 0.6rem 0.7rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.4rem;
		font: inherit;
		color: #f1f5f9;
		transition: border-color 0.2s ease;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.form-textarea {
		resize: none;
	}

	.field-note {
		margin: 0;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.modal-footer {
		border-top: 1px solid #334155;
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}

	.toast-wrap {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 60;
	}

	.toast-box {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.75rem 0.9rem;
		border-radius: 0.5rem;
		border: 1px solid;
		background: #0f172a;
		backdrop-filter: blur(4px);
	}

	.toast-box.success {
		border-color: #10b981;
		color: #a7f3d0;
	}

	.toast-box.error {
		border-color: #ef4444;
		color: #fecaca;
	}

	.toast-box.info {
		border-color: #3b82f6;
		color: #bfdbfe;
	}

	.toast-icon {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.toast-message {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.full-width-desktop {
		width: 100%;
	}

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

	@keyframes slideInRight {
		from {
			opacity: 0;
			transform: translateX(280px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.35s ease-out;
	}

	.animate-slideInRight {
		animation: slideInRight 0.25s ease-out;
	}

	@media (min-width: 768px) {
		.delivery-panel-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.stats-grid-3 {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.page-root {
			padding: 1rem;
		}

		.page-title {
			font-size: 1.55rem;
		}

		.order-header,
		.order-summary-row,
		.delivered-card,
		.delivered-actions {
			flex-direction: column;
		}

		.summary-total-box {
			text-align: left;
		}

		.toast-wrap {
			left: 1rem;
			right: 1rem;
		}
	}
</style>
