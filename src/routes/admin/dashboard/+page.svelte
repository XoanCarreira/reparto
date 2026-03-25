<!-- PÁGINA: Dashboard Admin -->
<script>
	/**
	 * DASHBOARD DEL ADMINISTRADOR
	 * Vista general con estadísticas y resumen de la operación
	 * Muestra: pedidos pendientes, stock bajo, incidencias abiertas, etc.
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import {
		ordersStore,
		lowStockProducts,
		openIncidents,
		productsStore,
		zoneClientMetricsStore,
		zonesStore,
		deliveryStaffStore
	} from '$lib/stores/dataStore.js';
	import { resolve } from '$app/paths';
	import { formatCurrency } from '$lib/utils/helpers.js';
	import { users, zones } from '$lib/data/mockData.js';

	let pendingOrders = $state([]);
	let lowStock = $state([]);
	let openIssues = $state([]);
	let zoneClientRows = $state([]);
	let allZones = $state([]);
	let allStaff = $state([]);
	let totalProducts = $state(0);
	const totalClients = users.filter((u) => u.role === 'client').length;
	const totalZones = zones.length;

	// Se suscribe a los stores para obtener datos en tiempo real
	ordersStore.subscribe(($orders) => {
		pendingOrders = $orders.filter((o) => o.status === 'pending');
	});

	lowStockProducts.subscribe(($lowStock) => {
		lowStock = $lowStock;
	});

	openIncidents.subscribe(($incidents) => {
		openIssues = $incidents;
	});

	productsStore.subscribe(($products) => {
		totalProducts = $products.length;
	});

	zoneClientMetricsStore.subscribe(($rows) => {
		zoneClientRows = $rows;
	});

	zonesStore.subscribe(($zones) => {
		allZones = $zones;
	});

	deliveryStaffStore.subscribe(($staff) => {
		allStaff = $staff;
	});

	/**
	 * Calcula el total de dinero en pedidos pendientes
	 */
	function getPendingOrdersTotal() {
		return pendingOrders.reduce((total, order) => total + order.totalAmount, 0);
	}

	/**
	 * Obtiene el nombre del cliente por su ID
	 */
	function getClientName(clientId) {
		const client = users.find((u) => u.id === clientId);
		return client?.name || 'Cliente desconocido';
	}

	/**
	 * Obtiene el nombre de la zona por su ID
	 */
	function getZoneName(zoneId) {
		const zone = zones.find((z) => z.id === zoneId);
		return zone?.name || 'Zona desconocida';
	}

	function getClientZone(clientId) {
		const client = users.find((u) => u.id === clientId);
		return client?.zone || zones[0]?.id || 1;
	}

	function getOrderZone(order) {
		return order.zoneId || getClientZone(order.clientId);
	}

	function formatAverage(value) {
		return Number(value || 0).toFixed(2);
	}

	/**
	 * Calcula el número de rutas sin asignar (sin repartidor)
	 */
	function getUncoveredRoutesCount() {
		return allZones.filter(
			(zone) => !allStaff.some((staff) => Number(staff.zoneId) === Number(zone.id))
		).length;
	}

	const groupedRowsByZone = $derived(
		zones.map((zone) => ({
			...zone,
			rows: zoneClientRows.filter((row) => Number(row.zoneId) === zone.id)
		}))
	);
</script>

<svelte:head>
	<title>Dashboard - Admin - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<!-- Encabezado -->
	<div class="page-header">
		<h1 class="page-title">📊 Dashboard</h1>
		<p class="page-subtitle">Resumen general del sistema de entregas</p>
	</div>

	<!-- Grid de estadísticas principales -->
	<div class="stats-grid">
		<!-- Tarjeta: Pedidos Pendientes -->
		<Card class="stat-card">
			<div class="stat-content blue">
				<div class="stat-number">{pendingOrders.length}</div>
				<p class="stat-title">Pedidos Pendientes</p>
				<p class="stat-subtitle">{formatCurrency(getPendingOrdersTotal())}</p>
			</div>
		</Card>

		<!-- Tarjeta: Productos -->
		<Card class="stat-card">
			<div class="stat-content emerald">
				<div class="stat-number">{totalProducts}</div>
				<p class="stat-title">Productos Disponibles</p>
				<p class="stat-subtitle">{lowStock.length} bajo stock</p>
			</div>
		</Card>

		<!-- Tarjeta: Incidencias -->
		<Card class="stat-card">
			<div class="stat-content red">
				<div class="stat-number">{openIssues.length}</div>
				<p class="stat-title">Incidencias Abiertas</p>
				<p class="stat-subtitle">Requieren atención</p>
			</div>
		</Card>

		<!-- Tarjeta: Clientes -->
		<Card class="stat-card">
			<div class="stat-content violet">
				<div class="stat-number">{totalClients}</div>
				<p class="stat-title">Clientes Registrados</p>
				<p class="stat-subtitle">{totalZones} zonas de reparto</p>
			</div>
		</Card>

		<!-- Tarjeta: Rutas sin Asignar -->
		<Card class="stat-card">
			<div class="stat-content orange">
				<div class="stat-number">{getUncoveredRoutesCount()}</div>
				<p class="stat-title">Rutas sin Asignar</p>
				<p class="stat-subtitle">
					<a href={resolve('/admin/routes')} class="stat-link">Gestionar →</a>
				</p>
			</div>
		</Card>
	</div>

	<!-- Sección: Pedidos Pendientes Recientes -->
	<Card
		title="📦 Pedidos Pendientes (Próximos 5)"
		titleClass="title-blue"
		class="card-section"
	>
		{#if pendingOrders.length === 0}
			<p class="empty-state">No hay pedidos pendientes</p>
		{:else}
			<div class="table-wrapper">
				<table class="table">
					<thead>
						<tr>
							<th>Pedido</th>
							<th>Cliente</th>
							<th>Zona</th>
							<th>Monto</th>
							<th>Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each pendingOrders.slice(0, 5) as order (order.id)}
							<tr>
								<td>
									<a
										href={resolve('/admin/orders')}
										class="table-link"
									>
										#{order.id}
									</a>
								</td>
								<td>{getClientName(order.clientId)}</td>
								<td>{getZoneName(getOrderZone(order))}</td>
								<td class="amount">{formatCurrency(order.totalAmount)}</td>
								<td>
									<Badge status={order.status} />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="view-all">
				<a
					href={resolve('/admin/orders')}
					class="view-all-link"
				>
					Ver todos los pedidos →
				</a>
			</div>
		{/if}
	</Card>

	<Card
		title="🗺️ Control de Clientes por Zona (Solo Consulta)"
		titleClass="title-violet"
		class="card-section"
	>
		<div class="readonly-note">
			Este panel es de consulta en tiempo real. Para modificar datos accede a los paneles de gestión.
		</div>

		<div class="readonly-links">
			<a href={resolve('/admin/clients')} class="link-btn">Gestionar clientes y zonas</a>
			<a href={resolve('/admin/stock')} class="link-btn">Gestionar stock</a>
			<a href={resolve('/admin/orders')} class="link-btn">Gestionar pedidos</a>
		</div>

		<div class="zone-blocks">
			{#each groupedRowsByZone as zone (zone.id)}
				<div class="zone-block">
					<div class="zone-header">
						<div>
							<p class="zone-name">{zone.name}</p>
							<p class="zone-desc">{zone.description}</p>
						</div>
					</div>

					{#if zone.rows.length === 0}
						<p class="zone-empty">No hay clientes configurados para esta zona.</p>
					{:else}
						<div class="table-wrapper">
							<table class="table">
								<thead>
									<tr>
										<th>Cliente</th>
										<th>Zona</th>
										<th>Pendientes</th>
										<th>En reparto</th>
										<th>Media mes anterior</th>
										<th>Media mes actual</th>
									</tr>
								</thead>
								<tbody>
									{#each zone.rows as row (row.id)}
										<tr>
											<td>{getClientName(row.clientId)}</td>
											<td>{getZoneName(row.zoneId)}</td>
											<td>{row.pendingOrders}</td>
											<td>{row.inDeliveryOrders}</td>
											<td>{formatAverage(row.avgPrevMonth)}</td>
											<td>{formatAverage(row.avgCurrentMonth)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</Card>

	<!-- Grid: Stock y Incidencias -->
	<div class="cards-grid">
		<!-- Stock bajo -->
		<Card
			title="⚠️ Productos con Stock Bajo"
			titleClass="title-amber"
			class="card-section"
		>
			{#if lowStock.length === 0}
				<p class="empty-state">✓ Todo en orden</p>
			{:else}
				<div class="stock-items">
					{#each lowStock as product (product.id)}
						<div class="stock-item">
							<div>
								<p class="item-name">{product.name}</p>
								<p class="item-info">
									Stock actual: {product.stock}/{product.minStock}
								</p>
							</div>
							<div class="item-value">
								<div class="item-number amber">{product.stock}</div>
								<p class="item-unit">{product.unit}</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>

		<!-- Incidencias abiertas -->
		<Card
			title="🔔 Incidencias Abiertas"
			titleClass="title-red"
			class="card-section"
		>
			{#if openIssues.length === 0}
				<p class="empty-state">✓ Sin problemas reportados</p>
			{:else}
				<div class="incidents-list">
					{#each openIssues as incident (incident.id)}
						<div class="incident-item">
							<div class="incident-header">
								<div>
									<p class="incident-name">{getClientName(incident.clientId)}</p>
									<p class="incident-order">Pedido #{incident.orderId}</p>
								</div>
								<Badge status={incident.priority} />
							</div>
							<p class="incident-desc">{incident.description}</p>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	</div>
</div>

<style>
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
	 * GRID DE ESTADÍSTICAS
	 * ============================================ */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	:global(.stat-card) {
		height: 100%;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		border-radius: 0.5rem;
		background: #1e293b;
		border: 1px solid #334155;
		transition: all 0.2s ease;
	}

	.stat-content:hover {
		border-color: #475569;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.stat-number {
		font-size: 3rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.stat-title {
		font-size: 0.95rem;
		color: #cbd5e1;
		margin: 0 0 0.5rem 0;
		font-weight: 500;
	}

	.stat-subtitle {
		font-size: 0.85rem;
		color: #94a3b8;
		margin: 0;
	}

	/* Colores por tarjeta */
	.stat-content.blue .stat-number {
		color: #3b82f6;
	}

	.stat-content.emerald .stat-number {
		color: #10b981;
	}

	.stat-content.red .stat-number {
		color: #ef4444;
	}

	.stat-content.violet .stat-number {
		color: #8b5cf6;
	}

	.stat-content.orange .stat-number {
		color: #f97316;
	}

	.stat-link {
		color: #f97316;
		text-decoration: none;
		font-weight: 500;
		transition: opacity 0.2s ease;
	}

	.stat-link:hover {
		opacity: 0.8;
		text-decoration: underline;
	}

	/* ============================================
	 * CARDS SECTION
	 * ============================================ */
	/* ============================================
	 * CARDS SECTION
	 * ============================================ */
	:global(.card-section) {
		margin-bottom: 2rem;
		overflow: visible;
	}

	:global(.title-blue) {
		color: #3b82f6;
	}

	:global(.title-violet) {
		color: #8b5cf6;
	}

	:global(.title-amber) {
		color: #f59e0b;
	}

	:global(.title-red) {
		color: #ef4444;
	}

	/* ============================================
	 * TABLA GENERAL
	 * ============================================ */
	.table-wrapper {
		overflow-x: auto;
		border-radius: 0.5rem;
		background: #0f172a;
		margin-bottom: 1rem;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.table thead tr {
		border-bottom: 1px solid #334155;
		background: #1e293b;
	}

	.table th {
		text-align: left;
		padding: 0.75rem 1rem;
		color: #cbd5e1;
		font-weight: 600;
	}

	.table tbody tr {
		border-bottom: 1px solid #334155;
		transition: background-color 0.15s ease;
	}

	.table tbody tr:hover {
		background: #1e293b;
	}

	.table td {
		padding: 0.75rem 1rem;
		color: #cbd5e1;
	}

	.table-link {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
		transition: opacity 0.2s ease;
	}

	.table-link:hover {
		opacity: 0.8;
		text-decoration: underline;
	}

	.amount {
		font-weight: 600;
	}

	.empty-state {
		text-align: center;
		color: #94a3b8;
		padding: 2rem;
		font-size: 0.95rem;
	}

	.view-all {
		text-align: center;
		padding-top: 1rem;
	}

	.view-all-link {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #1e293b;
		color: #3b82f6;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.view-all-link:hover {
		background: #253449;
		border-color: #475569;
	}

	/* ============================================
	 * NOTAS Y LINKS
	 * ============================================ */
	.readonly-note {
		margin-bottom: 1rem;
		padding: 0.75rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		background: rgba(30, 41, 59, 0.45);
		color: #cbd5e1;
		font-size: 0.9rem;
	}

	.readonly-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.link-btn {
		display: inline-block;
		padding: 0.5rem 0.85rem;
		border-radius: 0.35rem;
		border: 1px solid rgba(96, 165, 250, 0.5);
		background: rgba(30, 64, 175, 0.2);
		color: #93c5fd;
		text-decoration: none;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.link-btn:hover {
		background: rgba(30, 64, 175, 0.35);
		border-color: rgba(96, 165, 250, 0.8);
	}

	/* ============================================
	 * BLOQUES DE ZONA
	 * ============================================ */
	.zone-blocks {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.zone-block {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.zone-header {
		padding: 1rem;
		border-bottom: 1px solid #334155;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.zone-name {
		color: #cbd5e1;
		font-weight: 600;
		font-size: 1rem;
		margin: 0;
	}

	.zone-desc {
		color: #94a3b8;
		font-size: 0.85rem;
		margin: 0.25rem 0 0 0;
	}

	.zone-empty {
		padding: 1rem;
		color: #94a3b8;
		font-size: 0.9rem;
		margin: 0;
	}

	/* ============================================
	 * GRID DE CARDS
	 * ============================================ */
	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 1.5rem;
	}

	/* ============================================
	 * ITEMS DE STOCK
	 * ============================================ */
	.stock-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.stock-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #0f172a;
		border-radius: 0.35rem;
		border: 1px solid #334155;
		transition: all 0.2s ease;
	}

	.stock-item:hover {
		border-color: #475569;
		background: #1a2a3a;
	}

	.item-name {
		color: #cbd5e1;
		font-weight: 500;
		margin: 0;
		font-size: 0.95rem;
	}

	.item-info {
		color: #94a3b8;
		font-size: 0.85rem;
		margin: 0.25rem 0 0 0;
	}

	.item-value {
		text-align: right;
	}

	.item-number {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.item-number.amber {
		color: #f59e0b;
	}

	.item-unit {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: 0;
	}

	/* ============================================
	 * ITEMS DE INCIDENCIAS
	 * ============================================ */
	.incidents-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.incident-item {
		padding: 1rem;
		background: #0f172a;
		border-radius: 0.35rem;
		border: 1px solid #334155;
		transition: all 0.2s ease;
	}

	.incident-item:hover {
		border-color: #475569;
		background: #1a2a3a;
	}

	.incident-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.incident-name {
		color: #cbd5e1;
		font-weight: 500;
		margin: 0;
		font-size: 0.95rem;
	}

	.incident-order {
		color: #94a3b8;
		font-size: 0.85rem;
		margin: 0.25rem 0 0 0;
	}

	.incident-desc {
		color: #cbd5e1;
		font-size: 0.9rem;
		margin: 0;
		line-height: 1.4;
	}

	/* ============================================
	 * RESPONSIVE
	 * ============================================ */
	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		}

		.cards-grid {
			grid-template-columns: 1fr;
		}

		.page-root {
			padding: 1.5rem;
		}
	}

	@media (max-width: 640px) {
		.page-root {
			padding: 1rem;
		}

		.page-title {
			font-size: 1.5rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.stat-content {
			padding: 1.5rem 1rem;
		}

		.stat-number {
			font-size: 2rem;
		}

		.zone-blocks {
			gap: 1rem;
		}

		.table-wrapper {
			font-size: 0.8rem;
		}

		.table th,
		.table td {
			padding: 0.5rem;
		}
	}
</style>
