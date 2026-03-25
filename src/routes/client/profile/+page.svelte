<!-- PÁGINA: Perfil Cliente -->
<script>
	/**
	 * PÁGINA DE PERFIL DEL CLIENTE
	 * Muestra información de la account y estadísticas personales
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore.js';
	import { ordersStore } from '$lib/stores/dataStore.js';
	import { formatCurrency, formatDate } from '$lib/utils/helpers.js';
	import { zones } from '$lib/data/mockData.js';

	let currentUser = $state(null);
	let userOrders = $state([]);
	let userZone = $state(null);

	// Se suscribe a autenticación
	authStore.subscribe((user) => {
		currentUser = user;
		if (user?.zone) {
			userZone = zones.find((z) => z.id === user.zone);
		} else {
			userZone = null;
		}
	});

	// Se suscribe a órdenes
	ordersStore.subscribe(($orders) => {
		if (currentUser?.id) {
			userOrders = $orders.filter((o) => o.clientId === currentUser.id);
		} else {
			userOrders = [];
		}
	});

	/**
	 * Calcula el total gastado
	 */
	function getTotalSpent() {
		return userOrders.reduce((sum, order) => sum + order.totalAmount, 0);
	}

	/**
	 * Cuenta pedidos por estado
	 */
	function countByStatus(status) {
		return userOrders.filter((o) => o.status === status).length;
	}

	/**
	 * Obtiene el ticket promedio
	 */
	function getAverageOrderValue() {
		if (userOrders.length === 0) return 0;
		return getTotalSpent() / userOrders.length;
	}
</script>

<svelte:head>
	<title>Mi Perfil - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header">
		<h1 class="page-title">👤 Mi Perfil</h1>
		<p class="page-subtitle">Informacion de tu cuenta y estadisticas personales</p>
	</div>

	{#if currentUser}
		<div class="profile-grid">
			<Card title="📋 Informacion Personal" titleClass="title-cyan" class="card-section">
				<div class="info-list">
					<div>
						<p class="field-label">Nombre de la Empresa</p>
						<p class="field-value field-value-strong">{currentUser.name}</p>
					</div>
					<div>
						<p class="field-label">Email</p>
						<p class="field-value">{currentUser.email}</p>
					</div>
					<div>
						<p class="field-label">Rol en el sistema</p>
						<div class="field-value"><Badge status={currentUser.role === 'client' ? 'active' : 'pending'} /></div>
					</div>
					<div>
						<p class="field-label">Miembro desde</p>
						<p class="field-value">{formatDate(currentUser.loginAt)}</p>
					</div>
				</div>
			</Card>

			{#if userZone}
				<Card title="📍 Zona de Reparto" titleClass="title-violet" class="card-section">
					<div class="info-list">
						<div>
							<p class="field-label">Zona asignada</p>
							<p class="field-value field-value-strong">{userZone.name}</p>
						</div>
						<div>
							<p class="field-label">Descripcion</p>
							<p class="field-value">{userZone.description}</p>
						</div>
						<div>
							<p class="field-label">Ubicacion</p>
							<p class="field-value">{userZone.address}</p>
						</div>
						<div>
							<p class="field-label">Horario de reparto</p>
							<p class="field-value">{userZone.deliveryTime}</p>
						</div>
						<div>
							<p class="field-label">Dias de reparto</p>
							<p class="field-value">{userZone.deliveryDays.join(', ')}</p>
						</div>
					</div>
				</Card>
			{/if}
		</div>
	{/if}

	<div class="stats-grid stats-grid-4">
		<div class="stat-card blue"><div class="stat-content"><div class="stat-main">{userOrders.length}</div><p class="stat-label">Pedidos Totales</p></div></div>
		<div class="stat-card emerald"><div class="stat-content"><div class="stat-main">{countByStatus('delivered')}</div><p class="stat-label">Entregados</p></div></div>
		<div class="stat-card amber"><div class="stat-content"><div class="stat-main">{countByStatus('pending')}</div><p class="stat-label">Pendientes</p></div></div>
		<div class="stat-card violet"><div class="stat-content"><div class="stat-main stat-money">{formatCurrency(getAverageOrderValue())}</div><p class="stat-label">Ticket Promedio</p></div></div>
	</div>

	<Card title="💰 Resumen Financiero" titleClass="title-emerald" class="card-section">
		<div class="financial-grid">
			<div class="financial-item"><p class="field-label">Total Gastado</p><p class="financial-value emerald">{formatCurrency(getTotalSpent())}</p></div>
			<div class="financial-item"><p class="field-label">Pedidos Realizados</p><p class="financial-value blue">{userOrders.length}</p></div>
			<div class="financial-item"><p class="field-label">Valor Promedio</p><p class="financial-value violet">{formatCurrency(getAverageOrderValue())}</p></div>
		</div>
	</Card>

	{#if userOrders.length > 0}
		<Card title="📊 Distribucion de Pedidos" titleClass="title-blue" class="card-section">
			<div class="distribution-list">
				<div class="distribution-item">
					<div class="distribution-head"><span class="distribution-name">Entregados</span><span class="count-badge success">{countByStatus('delivered')}</span></div>
					<div class="bar-track"><div class="bar-fill success" style="width: {(countByStatus('delivered') / userOrders.length) * 100}%"></div></div>
				</div>
				<div class="distribution-item">
					<div class="distribution-head"><span class="distribution-name">Pendientes</span><span class="count-badge warning">{countByStatus('pending')}</span></div>
					<div class="bar-track"><div class="bar-fill warning" style="width: {(countByStatus('pending') / userOrders.length) * 100}%"></div></div>
				</div>
				<div class="distribution-item">
					<div class="distribution-head"><span class="distribution-name">Cancelados</span><span class="count-badge danger">{countByStatus('cancelled')}</span></div>
					<div class="bar-track"><div class="bar-fill danger" style="width: {(countByStatus('cancelled') / userOrders.length) * 100}%"></div></div>
				</div>
			</div>
		</Card>
	{/if}

	<div class="quick-actions-grid">
		<a href={resolve('/client/orders')} class="quick-action-card">
			<p class="quick-action-title blue">📦 Ver mis pedidos</p>
			<p class="quick-action-subtitle">Gestiona tus solicitudes de entrega</p>
		</a>
		<a href={resolve('/client/products')} class="quick-action-card">
			<p class="quick-action-title emerald">🛍️ Ver catalogo</p>
			<p class="quick-action-subtitle">Explora nuestros productos</p>
		</a>
	</div>
</div>

<style>
	.page-root {
		width: 100%;
		padding: 1.5rem;
		background: #0f172a;
		color: #cbd5e1;
	}

	.page-header {
		margin-bottom: 1.4rem;
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

	:global(.card-section) {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1.1rem;
	}

	.profile-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	:global(.title-cyan) {
		color: #67e8f9 !important;
	}

	:global(.title-violet) {
		color: #c4b5fd !important;
	}

	:global(.title-emerald) {
		color: #86efac !important;
	}

	:global(.title-blue) {
		color: #93c5fd !important;
	}

	.info-list {
		display: grid;
		gap: 0.8rem;
	}

	.field-label {
		margin: 0;
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.field-value {
		margin: 0.3rem 0 0;
		font-size: 0.95rem;
		color: #cbd5e1;
	}

	.field-value-strong {
		font-size: 1rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stat-card {
		border-radius: 0.5rem;
		padding: 1px;
	}

	.stat-content {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
		text-align: center;
	}

	.stat-card.blue {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(15, 23, 42, 0.2));
	}

	.stat-card.emerald {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(15, 23, 42, 0.2));
	}

	.stat-card.amber {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.2));
	}

	.stat-card.violet {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(15, 23, 42, 0.2));
	}

	.stat-main {
		font-size: 1.9rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.stat-main.stat-money {
		font-size: 1.2rem;
	}

	.stat-label {
		margin: 0.4rem 0 0;
		font-size: 0.85rem;
		color: #cbd5e1;
		font-weight: 600;
	}

	.financial-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.financial-item {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		padding: 0.85rem;
	}

	.financial-value {
		margin: 0.35rem 0 0;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.financial-value.emerald {
		color: #34d399;
	}

	.financial-value.blue {
		color: #60a5fa;
	}

	.financial-value.violet {
		color: #a78bfa;
	}

	.distribution-list {
		display: grid;
		gap: 0.85rem;
	}

	.distribution-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.35rem;
	}

	.distribution-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.count-badge {
		padding: 0.2rem 0.65rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.count-badge.success {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.count-badge.warning {
		background: rgba(245, 158, 11, 0.2);
		color: #fcd34d;
	}

	.count-badge.danger {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
	}

	.bar-track {
		width: 100%;
		height: 0.45rem;
		background: #1e293b;
		border-radius: 999px;
		overflow: hidden;
		border: 1px solid #334155;
	}

	.bar-fill {
		height: 100%;
		border-radius: 999px;
	}

	.bar-fill.success {
		background: #10b981;
	}

	.bar-fill.warning {
		background: #f59e0b;
	}

	.bar-fill.danger {
		background: #ef4444;
	}

	.quick-actions-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.quick-action-card {
		display: block;
		padding: 0.9rem;
		text-align: center;
		text-decoration: none;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.quick-action-card:hover {
		background: #253449;
		border-color: #475569;
	}

	.quick-action-title {
		margin: 0;
		font-weight: 700;
	}

	.quick-action-title.blue {
		color: #60a5fa;
	}

	.quick-action-title.emerald {
		color: #34d399;
	}

	.quick-action-subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: #94a3b8;
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

	.animate-fadeIn {
		animation: fadeIn 0.5s ease-in-out;
	}

	.full-width-desktop {
		width: 100%;
	}

	@media (min-width: 768px) {
		.profile-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.stats-grid-4 {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}

		.financial-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.quick-actions-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.page-root {
			padding: 1rem;
		}

		.page-title {
			font-size: 1.6rem;
		}
	}
</style>
