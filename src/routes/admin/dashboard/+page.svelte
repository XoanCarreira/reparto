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
		zoneClientMetricsStore
	} from '$lib/stores/dataStore.js';
	import { resolve } from '$app/paths';
	import { formatCurrency } from '$lib/utils/helpers.js';
	import { users, zones } from '$lib/data/mockData.js';

	let pendingOrders = $state([]);
	let lowStock = $state([]);
	let openIssues = $state([]);
	let editableRows = $state([]);
	let totalProducts = $state(0);
	const totalClients = users.filter((u) => u.role === 'client').length;
	const totalZones = zones.length;
	const clientOptions = users.filter((u) => u.role === 'client');

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
		editableRows = $rows.map((row) => ({ ...row }));
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

	function updateLocalRow(rowId, key, value) {
		editableRows = editableRows.map((row) => {
			if (row.id !== rowId) {
				return row;
			}

			const parsedValue =
				key === 'clientId' || key === 'zoneId'
					? Number(value)
					: key === 'pendingOrders' || key === 'inDeliveryOrders'
						? Number.parseInt(value || 0, 10)
						: Number.parseFloat(value || 0);

			return {
				...row,
				[key]: Number.isNaN(parsedValue) ? 0 : parsedValue
			};
		});
	}

	function saveRow(row) {
		zoneClientMetricsStore.updateRow(row.id, row);
	}

	function addRow(zoneId) {
		zoneClientMetricsStore.addRow({ zoneId });
	}

	function deleteRow(rowId) {
		zoneClientMetricsStore.deleteRow(rowId);
	}

	function resetTable() {
		zoneClientMetricsStore.resetFromOrders();
	}

	const groupedRowsByZone = $derived(
		zones.map((zone) => ({
			...zone,
			rows: editableRows.filter((row) => Number(row.zoneId) === zone.id)
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
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<!-- Tarjeta: Pedidos Pendientes -->
		<Card class="glass-blue">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-4xl fw-bold text-blue-300 mb-2">{pendingOrders.length}</div>
				<p class="txt-subtle fw-medium">Pedidos Pendientes</p>
				<p class="fs-sm txt-muted mt-2">{formatCurrency(getPendingOrdersTotal())}</p>
			</div>
		</Card>

		<!-- Tarjeta: Productos -->
		<Card class="glass-emerald">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-4xl fw-bold text-emerald-300 mb-2">{totalProducts}</div>
				<p class="txt-subtle fw-medium">Productos Disponibles</p>
				<p class="fs-sm txt-muted mt-2">{lowStock.length} bajo stock</p>
			</div>
		</Card>

		<!-- Tarjeta: Incidencias -->
		<Card class="glass-red">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-4xl fw-bold text-red-300 mb-2">{openIssues.length}</div>
				<p class="txt-subtle fw-medium">Incidencias Abiertas</p>
				<p class="fs-sm txt-muted mt-2">Requieren atención</p>
			</div>
		</Card>

		<!-- Tarjeta: Clientes -->
		<Card class="glass-violet">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-4xl fw-bold text-violet-300 mb-2">{totalClients}</div>
				<p class="txt-subtle fw-medium">Clientes Registrados</p>
				<p class="fs-sm txt-muted mt-2">{totalZones} zonas de reparto</p>
			</div>
		</Card>
	</div>

	<!-- Sección: Pedidos Pendientes Recientes -->
	<Card
		title="📦 Pedidos Pendientes (Próximos 5)"
		titleClass="text-blue-300"
		class="glass-blue"
	>
		{#if pendingOrders.length === 0}
			<p class="txt-muted text-center py-8">No hay pedidos pendientes</p>
		{:else}
			<div class="overflow-x-auto radius-lg panel-surface-soft">
				<table class="w-full fs-sm">
					<thead>
						<tr class="border-b bd-mid bg-slate-900/40">
							<th class="text-left py-3 px-4 fw-semibold txt-subtle">Pedido</th>
							<th class="text-left py-3 px-4 fw-semibold txt-subtle">Cliente</th>
							<th class="text-left py-3 px-4 fw-semibold txt-subtle">Zona</th>
							<th class="text-left py-3 px-4 fw-semibold txt-subtle">Monto</th>
							<th class="text-left py-3 px-4 fw-semibold txt-subtle">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each pendingOrders.slice(0, 5) as order (order.id)}
							<tr class="border-b bd-strong hover:bg-panel/40 transition-colors">
								<td class="py-3 px-4">
									<a
										href={resolve('/admin/orders')}
										class="text-blue-600 hover:underline fw-medium"
									>
										#{order.id}
									</a>
								</td>
								<td class="py-3 px-4">{getClientName(order.clientId)}</td>
								<td class="py-3 px-4">{getZoneName(getOrderZone(order))}</td>
								<td class="py-3 px-4 fw-medium">{formatCurrency(order.totalAmount)}</td>
								<td class="py-3 px-4">
									<Badge status={order.status} />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="mt-4 text-center">
				<a
					href={resolve('/admin/orders')}
					class="inline-block px-4 py-2 panel-surface-soft text-blue-300 rounded hover:bg-panel-soft/70 transition-colors"
				>
					Ver todos los pedidos →
				</a>
			</div>
		{/if}
	</Card>

	<Card
		title="🗺️ Control de Clientes por Zona (Editable)"
		titleClass="text-violet-300"
		class="glass-violet"
	>
		<div class="flex flex-wrap gap-3 mb-4">
			<button
				type="button"
				onclick={resetTable}
				class="px-4 py-2 rounded bg-panel-soft txt-primary hover:bg-slate-600 transition-colors"
			>
				Recargar datos calculados
			</button>
		</div>

		<div class="space-y-6">
			{#each groupedRowsByZone as zone (zone.id)}
				<div class="panel-surface-soft radius-xl overflow-hidden">
					<div
						class="px-4 py-3 border-b border-white/25 flex items-center justify-between"
					>
						<div>
							<p class="fw-semibold text-violet-200">{zone.name}</p>
							<p class="fs-sm text-violet-300/80">{zone.description}</p>
						</div>
						<button
							type="button"
							onclick={() => addRow(zone.id)}
							class="px-3 py-2 rounded bg-blue-600 text-white fs-sm hover:bg-blue-700 transition-colors"
						>
							+ Anadir cliente
						</button>
					</div>

					{#if zone.rows.length === 0}
						<p class="p-4 fs-sm txt-muted">No hay clientes configurados para esta zona.</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full fs-sm">
								<thead>
									<tr class="border-b bd-mid bg-slate-900/40 txt-subtle">
										<th class="text-left py-3 px-4 fw-semibold">Cliente</th>
										<th class="text-left py-3 px-4 fw-semibold">Zona</th>
										<th class="text-left py-3 px-4 fw-semibold">Pendientes</th>
										<th class="text-left py-3 px-4 fw-semibold">En reparto</th>
										<th class="text-left py-3 px-4 fw-semibold">Media mes anterior</th>
										<th class="text-left py-3 px-4 fw-semibold">Media mes actual</th>
										<th class="text-left py-3 px-4 fw-semibold">Acciones</th>
									</tr>
								</thead>
								<tbody>
									{#each zone.rows as row (row.id)}
										<tr class="border-b bd-strong hover:bg-panel/30 transition-colors">
											<td class="py-2 px-4">
												<select
													class="w-full border bd-soft bg-panel txt-primary rounded px-2 py-1"
													value={row.clientId}
													onchange={(e) =>
														updateLocalRow(row.id, 'clientId', e.currentTarget.value)}
												>
													{#each clientOptions as client (client.id)}
														<option value={client.id}>{client.name}</option>
													{/each}
												</select>
											</td>
											<td class="py-2 px-4">
												<select
													class="w-full border bd-soft bg-panel txt-primary rounded px-2 py-1"
													value={row.zoneId}
													onchange={(e) => updateLocalRow(row.id, 'zoneId', e.currentTarget.value)}
												>
													{#each zones as zoneOption (zoneOption.id)}
														<option value={zoneOption.id}>{zoneOption.name}</option>
													{/each}
												</select>
											</td>
											<td class="py-2 px-4">
												<input
													type="number"
													min="0"
													class="w-24 border bd-soft bg-panel txt-primary rounded px-2 py-1"
													value={row.pendingOrders}
													oninput={(e) =>
														updateLocalRow(row.id, 'pendingOrders', e.currentTarget.value)}
												/>
											</td>
											<td class="py-2 px-4">
												<input
													type="number"
													min="0"
													class="w-24 border bd-soft bg-panel txt-primary rounded px-2 py-1"
													value={row.inDeliveryOrders}
													oninput={(e) =>
														updateLocalRow(row.id, 'inDeliveryOrders', e.currentTarget.value)}
												/>
											</td>
											<td class="py-2 px-4">
												<input
													type="number"
													min="0"
													step="0.01"
													class="w-32 border bd-soft bg-panel txt-primary rounded px-2 py-1"
													value={row.avgPrevMonth}
													oninput={(e) =>
														updateLocalRow(row.id, 'avgPrevMonth', e.currentTarget.value)}
												/>
											</td>
											<td class="py-2 px-4">
												<input
													type="number"
													min="0"
													step="0.01"
													class="w-32 border bd-soft bg-panel txt-primary rounded px-2 py-1"
													value={row.avgCurrentMonth}
													oninput={(e) =>
														updateLocalRow(row.id, 'avgCurrentMonth', e.currentTarget.value)}
												/>
											</td>
											<td class="py-2 px-4">
												<div class="flex gap-2">
													<button
														type="button"
														onclick={() => saveRow(row)}
														class="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
													>
														Guardar
													</button>
													<button
														type="button"
														onclick={() => deleteRow(row.id)}
														class="px-3 py-1 rounded bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors"
													>
														Eliminar
													</button>
												</div>
											</td>
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
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Stock bajo -->
		<Card
			title="⚠️ Productos con Stock Bajo"
			titleClass="text-amber-300"
			class="glass-amber"
		>
			{#if lowStock.length === 0}
				<p class="txt-muted text-center py-8">✓ Todo en orden</p>
			{:else}
				<div class="space-y-3 p-4 radius-lg panel-surface-soft">
					{#each lowStock as product (product.id)}
						<div
							class="flex items-center justify-between p-3 panel-surface-soft radius-lg"
						>
							<div>
								<p class="fw-medium txt-primary">{product.name}</p>
								<p class="fs-sm txt-muted">
									Stock actual: {product.stock}/{product.minStock}
								</p>
							</div>
							<div class="text-right">
								<div class="fs-2xl fw-bold text-amber-300">{product.stock}</div>
								<p class="text-xs txt-muted">{product.unit}</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>

		<!-- Incidencias abiertas -->
		<Card
			title="🔔 Incidencias Abiertas"
			titleClass="text-red-300"
			class="glass-red"
		>
			{#if openIssues.length === 0}
				<p class="txt-muted text-center py-8">✓ Sin problemas reportados</p>
			{:else}
				<div class="space-y-3 p-4 radius-lg panel-surface-soft">
					{#each openIssues as incident (incident.id)}
						<div class="p-3 panel-surface-soft radius-lg">
							<div class="flex justify-between items-start mb-2">
								<div>
									<p class="fw-medium txt-primary">{getClientName(incident.clientId)}</p>
									<p class="fs-sm txt-muted">Pedido #{incident.orderId}</p>
								</div>
								<Badge status={incident.priority} />
							</div>
							<p class="fs-sm txt-soft">{incident.description}</p>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	</div>
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
