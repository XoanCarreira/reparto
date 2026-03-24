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
	<!-- Encabezado -->
	<div class="page-header">
		<h1 class="page-title">📦 Mis Pedidos</h1>
		<p class="page-subtitle">Solicitudes de entrega y gestión de tu cuenta</p>
	</div>

	<!-- Información de próxima entrega -->
	{#if nextDeliveryZone}
		{@const countdown = getDeliveryCountdown()}
		{@const deliveryInfo = getDeliveryInfo()}
		<Card class="glass-violet">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 radius-lg panel-surface-soft">
				<div>
					<h3 class="fs-xl fw-bold txt-primary mb-4">📅 Próxima Entrega</h3>
					<div class="space-y-4">
						<div>
							<p class="fs-sm txt-muted">Fecha</p>
							<p class="fs-lg fw-semibold text-blue-400 mt-2">
								{countdown && countdown.message}
							</p>
						</div>
						<div>
							<p class="fs-sm txt-muted">Días de reparto</p>
							<p class="txt-subtle mt-2">{deliveryInfo.days}</p>
						</div>
						<div>
							<p class="fs-sm txt-muted">Horario</p>
							<p class="txt-subtle mt-2">{deliveryInfo.time}</p>
						</div>
					</div>
				</div>

				<div>
					<h3 class="fs-xl fw-bold txt-primary mb-4">📍 Zona de Reparto</h3>
					<div class="space-y-4">
						<div>
							<p class="fs-sm txt-muted">Zona</p>
							<p class="fs-lg fw-semibold txt-primary mt-2">{nextDeliveryZone.name}</p>
						</div>
						<div>
							<p class="fs-sm txt-muted">Ubicación</p>
							<p class="txt-subtle mt-2">{deliveryInfo.location}</p>
						</div>
						<div>
							<p class="fs-sm txt-muted">Descripción</p>
							<p class="txt-subtle mt-2">{nextDeliveryZone.description}</p>
						</div>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Resumen de pedidos -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<Card class="glass-amber">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-5xl fw-bold text-yellow-400 mb-3">{pendingOrders.length}</div>
				<p class="txt-subtle fw-semibold">Pedidos Pendientes</p>
				<p class="fs-sm txt-muted mt-3">{formatCurrency(getPendingTotal())}</p>
			</div>
		</Card>

		<Card class="glass-emerald">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-5xl fw-bold text-emerald-400 mb-3">{deliveredOrders.length}</div>
				<p class="txt-subtle fw-semibold">Pedidos Entregados</p>
				<p class="fs-sm txt-muted mt-3">Historial completado</p>
			</div>
		</Card>

		<Card class="glass-blue">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-5xl fw-bold text-blue-400 mb-3">{clientOrders.length}</div>
				<p class="txt-subtle fw-semibold">Total de Pedidos</p>
				<p class="fs-sm txt-muted mt-3">Todos los tiempos</p>
			</div>
		</Card>
	</div>

	<!-- Botón para crear nuevo pedido -->
	<div class="text-center">
		<a
			href={resolve('/client/orders/new')}
			class="inline-block px-6 py-3 bg-blue-600 text-white radius-lg hover:bg-blue-700 transition-colors fw-medium"
		>
			+ Crear Nuevo Pedido
		</a>
	</div>

	<!-- Pedidos pendientes -->
	{#if pendingOrders.length > 0}
		<Card title="⏳ Pedidos Pendientes" titleClass="text-amber-300" class="glass-amber">
			<div class="space-y-4 radius-lg panel-surface-soft">
				{#each pendingOrders as order (order.id)}
					<div class="radius-lg p-6 panel-surface-soft hover:bg-panel-soft/55 transition-colors">
						<div class="flex justify-between items-start mb-4">
							<div>
								<p class="fw-bold txt-primary fs-lg">Pedido #{order.id}</p>
								<p class="fs-sm txt-muted mt-1">{formatDate(order.createdAt)}</p>
							</div>
							<Badge status={order.status} />
						</div>

						<div class="bg-panel-soft/50 rounded p-4 mb-4">
							<p class="fs-sm fw-medium txt-subtle mb-3">Items ({countItems(order.items)})</p>
							<div class="fs-sm txt-soft space-y-2">
								{#each order.items as item (item.productId)}
									<p>• {item.quantity}× unidades - {formatCurrency(item.unitPrice * item.quantity)}</p>
								{/each}
							</div>
						</div>

						<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b bd-soft">
							<div>
								<p class="fs-sm txt-muted">Entrega programada</p>
								<p class="fw-semibold txt-primary">{formatDate(order.scheduledDelivery)}</p>
							</div>
							<div class="text-right">
								<p class="fs-sm txt-muted">Total</p>
								<p class="fs-xl fw-bold text-blue-400">{formatCurrency(order.totalAmount)}</p>
							</div>
						</div>

						<Button
							variant="danger"
							size="sm"
							onclick={() => openIncidentModal(order.id)}
						>
							⚠️ Reportar Problema
						</Button>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Pedidos entregados -->
	{#if deliveredOrders.length > 0}
		<Card title="✅ Historial de Entregas" titleClass="text-emerald-300" class="glass-emerald">
			<div class="space-y-3 radius-lg panel-surface-soft">
				{#each deliveredOrders.slice(0, 5) as order (order.id)}
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-panel-soft/30 radius-lg hover:bg-panel-soft/50 transition-colors">
						<div>
							<p class="fw-medium txt-primary">Pedido #{order.id}</p>
							<p class="fs-sm txt-muted mt-1">
								{countItems(order.items)} items • {formatDate(order.deliveredAt || order.createdAt)}
							</p>
						</div>
						<div class="flex items-center gap-4">
							<div class="text-right">
								<p class="fw-semibold txt-primary">{formatCurrency(order.totalAmount)}</p>
								<Badge status={order.status} />
							</div>
							<Button
								variant="secondary"
								size="sm"
								onclick={() => openIncidentModal(order.id)}
							>
								⚠️ Reportar
							</Button>
						</div>
					</div>
				{/each}

				{#if deliveredOrders.length > 5}
					<p class="text-center fs-sm txt-muted py-2">...y {deliveredOrders.length - 5} más</p>
				{/if}
			</div>
		</Card>
	{/if}

	<!-- Sin pedidos -->
	{#if clientOrders.length === 0}
		<Card class="glass-slate">
			<div class="text-center py-12">
				<p class="txt-muted fs-lg mb-4">Aún no tienes pedidos</p>
				<a
					href={resolve('/client/orders/new')}
					class="inline-block px-6 py-2 bg-blue-600 text-white radius-lg hover:bg-blue-700 transition-colors"
				>
					Crear tu primer pedido
				</a>
			</div>
		</Card>
	{/if}

	<!-- Modal de Incidencias -->
	{#if showIncidentModal}
		<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div class="bg-panel border bd-mid radius-xl shadow-2xl w-full max-w-md animate-fadeIn">
				<!-- Header -->
				<div class="border-b bd-mid p-6">
					<h3 class="fs-xl fw-bold txt-primary">Reportar Problema - Pedido #{selectedOrderId}</h3>
					<p class="fs-sm txt-muted mt-2">Cuéntanos qué sucedió con tu pedido</p>
				</div>

				<!-- Form -->
				<div class="p-6 space-y-5">
					<!-- Tipo de Incidencia -->
					<div>
						<label for="incident-type" class="block fs-sm fw-medium txt-subtle mb-2">
							Tipo de Problema
						</label>
						<select
							id="incident-type"
							bind:value={incidentForm.type}
							class="w-full px-4 py-2 bg-panel-soft border bd-soft radius-lg txt-primary focus:outline-none focus:border-blue-500 transition-colors"
						>
							<option value="damaged">🔨 Producto Dañado</option>
							<option value="delayed">⏰ Retraso en Entrega</option>
							<option value="wrong_quantity">📦 Cantidad Incorrecta</option>
							<option value="other">❓ Otro Problema</option>
						</select>
					</div>

					<!-- Prioridad -->
					<div>
						<label for="incident-priority" class="block fs-sm fw-medium txt-subtle mb-2">
							Prioridad
						</label>
						<select
							id="incident-priority"
							bind:value={incidentForm.priority}
							class="w-full px-4 py-2 bg-panel-soft border bd-soft radius-lg txt-primary focus:outline-none focus:border-blue-500 transition-colors"
						>
							<option value="low">🟢 Baja</option>
							<option value="medium">🟡 Media</option>
							<option value="high">🔴 Alta</option>
						</select>
					</div>

					<!-- Descripción -->
					<div>
						<label for="incident-description" class="block fs-sm fw-medium txt-subtle mb-2">
							Descripción Detallada *
						</label>
						<textarea
							id="incident-description"
							bind:value={incidentForm.description}
							placeholder="Describe el problema con tanto detalle como sea posible..."
							rows="4"
							class="w-full px-4 py-2 bg-panel-soft border bd-soft radius-lg txt-primary placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
						></textarea>
						<p class="text-xs txt-muted mt-1">Campo requerido</p>
					</div>
				</div>

				<!-- Footer -->
				<div class="border-t bd-mid p-6 flex gap-3 justify-end">
					<Button
						variant="secondary"
						size="sm"
						onclick={closeIncidentModal}
						disabled={incidentSubmitting}
					>
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

	<!-- Toast/Banner de notificaciones -->
	{#if showToast}
		<div class="fixed top-4 right-4 z-50 animate-slideInRight">
			<div
				class={`radius-lg shadow-lg border px-6 py-4 flex items-center gap-3 backdrop-blur-sm ${
					toastType === 'success'
						? 'bg-emerald-900/30 border-emerald-600 text-emerald-200'
						: toastType === 'error'
							? 'bg-red-900/30 border-red-600 text-red-200'
							: 'bg-blue-900/30 border-blue-600 text-blue-200'
				}`}
			>
				{#if toastType === 'success'}
					<span class="fs-2xl">✓</span>
				{:else if toastType === 'error'}
					<span class="fs-2xl">✕</span>
				{:else}
					<span class="fs-2xl">ℹ</span>
				{/if}
				<p class="fw-medium">{toastMessage}</p>
			</div>
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

	@keyframes slideInRight {
		from {
			opacity: 0;
			transform: translateX(400px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.5s ease-in-out;
	}

	.animate-slideInRight {
		animation: slideInRight 0.3s ease-out;
	}
</style>
