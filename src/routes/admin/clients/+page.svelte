<!-- PAGINA: Clientes Admin -->
<script>
	/**
	 * Gestion administrativa de zonas y clientes.
	 * Permite ver, crear y editar zonas de reparto y clientes.
	 */

	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import { clientsStore, zonesStore, ordersStore } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';

	let zones = $state([]);
	let clients = $state([]);
	let allOrders = $state([]);
	let zoneDrafts = $state([]);
	let clientDrafts = $state([]);
	let showZoneCreate = $state(false);
	let showClientCreate = $state(false);
	let newZone = $state({
		name: '',
		deliveryDays: '',
		deliveryTime: '',
		notes: ''
	});
	let newClient = $state({
		name: '',
		email: '',
		password: 'cliente123',
		zone: 1,
		phone: '',
		address: ''
	});

	zonesStore.subscribe(($zones) => {
		zones = $zones;
		zoneDrafts = $zones.map((zone) => ({
			id: zone.id,
			name: zone.name || '',
			deliveryDays: Array.isArray(zone.deliveryDays) ? zone.deliveryDays.join(', ') : '',
			deliveryTime: zone.deliveryTime || '',
			notes: zone.notes || zone.description || ''
		}));

		if (!newClient.zone && $zones.length > 0) {
			newClient = { ...newClient, zone: $zones[0].id };
		}
	});

	clientsStore.subscribe(($clients) => {
		clients = $clients;
		clientDrafts = $clients.map((client) => ({ ...client }));
	});

	ordersStore.subscribe(($orders) => {
		allOrders = $orders;
	});

	const totalRevenue = $derived(
		allOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0)
	);

	function parseDays(value) {
		return String(value || '')
			.split(',')
			.map((day) => day.trim())
			.filter(Boolean);
	}

	function updateZoneDraft(zoneId, key, value) {
		zoneDrafts = zoneDrafts.map((zone) => (zone.id === zoneId ? { ...zone, [key]: value } : zone));
	}

	function saveZone(zoneId) {
		const draft = zoneDrafts.find((zone) => zone.id === zoneId);
		if (!draft) {
			return;
		}

		zonesStore.updateZone(zoneId, {
			name: draft.name,
			deliveryDays: parseDays(draft.deliveryDays),
			deliveryTime: draft.deliveryTime,
			notes: draft.notes
		});
	}

	function resetNewZone() {
		newZone = {
			name: '',
			deliveryDays: '',
			deliveryTime: '',
			notes: ''
		};
	}

	function createZone() {
		if (!newZone.name.trim()) {
			return;
		}

		zonesStore.create({
			name: newZone.name,
			deliveryDays: parseDays(newZone.deliveryDays),
			deliveryTime: newZone.deliveryTime,
			notes: newZone.notes
		});
		resetNewZone();
		showZoneCreate = false;
	}

	function updateClientDraft(clientId, key, value) {
		clientDrafts = clientDrafts.map((client) =>
			client.id === clientId ? { ...client, [key]: value } : client
		);
	}

	function saveClient(clientId) {
		const draft = clientDrafts.find((client) => client.id === clientId);
		if (!draft) {
			return;
		}

		clientsStore.updateClient(clientId, {
			name: draft.name,
			email: draft.email,
			password: draft.password,
			zone: Number(draft.zone),
			phone: draft.phone,
			address: draft.address
		});
	}

	function resetNewClient() {
		newClient = {
			name: '',
			email: '',
			password: 'cliente123',
			zone: zones[0]?.id || 1,
			phone: '',
			address: ''
		};
	}

	function createClient() {
		if (!newClient.name.trim() || !newClient.email.trim()) {
			return;
		}

		clientsStore.create({
			name: newClient.name,
			email: newClient.email,
			password: newClient.password,
			zone: Number(newClient.zone),
			phone: newClient.phone,
			address: newClient.address
		});
		resetNewClient();
		showClientCreate = false;
	}

	function getClientOrdersCount(clientId) {
		return allOrders.filter((order) => order.clientId === clientId).length;
	}

	function getZoneName(zoneId) {
		const zone = zones.find((item) => item.id === Number(zoneId));
		return zone?.name || 'Zona desconocida';
	}
</script>

<svelte:head>
	<title>Clientes - Admin - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header">
		<h1 class="page-title">👥 Zonas y Clientes</h1>
		<p class="page-subtitle">Gestion centralizada de zonas de reparto y datos de clientes</p>
	</div>

	<Card
		title="📊 Resumen General"
		titleClass="text-cyan-200"
		class="panel-surface"
	>
		<div class="flex flex-wrap gap-4 md:gap-5">
			<div class="text-center py-5 px-6 radius-lg panel-surface-soft min-w-[220px] w-fit">
				<div class="fs-3xl fw-bold txt-primary mb-1">{zones.length}</div>
				<p class="txt-subtle fw-medium">Zonas de Reparto</p>
			</div>
			<div class="text-center py-5 px-6 radius-lg panel-surface-soft min-w-[220px] w-fit">
				<div class="fs-3xl fw-bold txt-primary mb-1">{clients.length}</div>
				<p class="txt-subtle fw-medium">Clientes</p>
			</div>
			<div class="text-center py-5 px-6 radius-lg panel-surface-soft min-w-[260px] w-fit">
				<div class="fs-2xl fw-bold txt-primary mb-1">{formatCurrency(totalRevenue)}</div>
				<p class="txt-subtle fw-medium">Facturacion Pedidos</p>
			</div>
		</div>
	</Card>

	<Card
		title="🗺️ Zonas de Reparto"
		titleClass="text-cyan-200"
		class="panel-surface"
	>
		<div class="flex justify-end mb-4">
			<Button variant="primary" size="sm" onclick={() => (showZoneCreate = !showZoneCreate)}>
				{showZoneCreate ? 'Cerrar alta de zona' : 'Nueva zona'}
			</Button>
		</div>

		{#if showZoneCreate}
			<div class="mb-5 radius-lg p-4 panel-surface-soft">
				<div class="grid grid-cols-1 md:grid-cols-4 gap-3">
					<input
						type="text"
						placeholder="Nombre"
						value={newZone.name}
						oninput={(e) => (newZone = { ...newZone, name: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Dias (Lunes, Miercoles...)"
						value={newZone.deliveryDays}
						oninput={(e) => (newZone = { ...newZone, deliveryDays: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Horario reparto"
						value={newZone.deliveryTime}
						oninput={(e) => (newZone = { ...newZone, deliveryTime: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Notas"
						value={newZone.notes}
						oninput={(e) => (newZone = { ...newZone, notes: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
				</div>
				<div class="mt-3 flex gap-2">
					<Button variant="primary" size="sm" onclick={createZone}>Crear zona</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={() => {
							resetNewZone();
							showZoneCreate = false;
						}}
					>
						Cancelar
					</Button>
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto radius-lg panel-surface-soft">
			<table class="w-full fs-sm min-w-[920px]">
				<thead>
					<tr class="border-b-2 bd-mid bg-slate-900/40 txt-subtle">
						<th class="text-left py-3 px-3 fw-semibold">ID</th>
						<th class="text-left py-3 px-3 fw-semibold">Nombre</th>
						<th class="text-left py-3 px-3 fw-semibold">Dias reparto</th>
						<th class="text-left py-3 px-3 fw-semibold">Horas reparto</th>
						<th class="text-left py-3 px-3 fw-semibold">Notas</th>
						<th class="text-center py-3 px-3 fw-semibold">Accion</th>
					</tr>
				</thead>
				<tbody>
					{#each zoneDrafts as zone (zone.id)}
						<tr class="border-b bd-strong hover:bg-panel/30">
							<td class="py-2 px-3 fw-medium txt-soft">{zone.id}</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={zone.name}
									oninput={(e) => updateZoneDraft(zone.id, 'name', e.currentTarget.value)}
									class="w-44 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={zone.deliveryDays}
									oninput={(e) => updateZoneDraft(zone.id, 'deliveryDays', e.currentTarget.value)}
									class="w-52 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={zone.deliveryTime}
									oninput={(e) => updateZoneDraft(zone.id, 'deliveryTime', e.currentTarget.value)}
									class="w-36 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={zone.notes}
									oninput={(e) => updateZoneDraft(zone.id, 'notes', e.currentTarget.value)}
									class="w-64 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3 text-center">
								<Button variant="primary" size="sm" onclick={() => saveZone(zone.id)}>Guardar</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>

	<Card
		title="🏪 Clientes"
		titleClass="text-violet-200"
		class="panel-surface"
	>
		<div class="flex justify-end mb-4">
			<Button variant="primary" size="sm" onclick={() => (showClientCreate = !showClientCreate)}>
				{showClientCreate ? 'Cerrar alta de cliente' : 'Nuevo cliente'}
			</Button>
		</div>

		{#if showClientCreate}
			<div class="mb-5 radius-lg p-4 panel-surface-soft">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<input
						type="text"
						placeholder="Nombre"
						value={newClient.name}
						oninput={(e) => (newClient = { ...newClient, name: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="email"
						placeholder="Email"
						value={newClient.email}
						oninput={(e) => (newClient = { ...newClient, email: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Password"
						value={newClient.password}
						oninput={(e) => (newClient = { ...newClient, password: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<select
						value={newClient.zone}
						onchange={(e) => (newClient = { ...newClient, zone: Number(e.currentTarget.value) })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					>
						{#each zones as zone (zone.id)}
							<option value={zone.id}>{zone.name}</option>
						{/each}
					</select>
					<input
						type="text"
						placeholder="Telefono"
						value={newClient.phone}
						oninput={(e) => (newClient = { ...newClient, phone: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Direccion"
						value={newClient.address}
						oninput={(e) => (newClient = { ...newClient, address: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
				</div>
				<div class="mt-3 flex gap-2">
					<Button variant="primary" size="sm" onclick={createClient}>Crear cliente</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={() => {
							resetNewClient();
							showClientCreate = false;
						}}
					>
						Cancelar
					</Button>
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto radius-lg panel-surface-soft">
			<table class="w-full fs-sm min-w-[1180px]">
				<thead>
					<tr class="border-b-2 bd-mid bg-slate-900/40 txt-subtle">
						<th class="text-left py-3 px-3 fw-semibold">ID</th>
						<th class="text-left py-3 px-3 fw-semibold">Nombre</th>
						<th class="text-left py-3 px-3 fw-semibold">Email</th>
						<th class="text-left py-3 px-3 fw-semibold">Password</th>
						<th class="text-left py-3 px-3 fw-semibold">Zona</th>
						<th class="text-left py-3 px-3 fw-semibold">Telefono</th>
						<th class="text-left py-3 px-3 fw-semibold">Direccion</th>
						<th class="text-left py-3 px-3 fw-semibold">Pedidos</th>
						<th class="text-center py-3 px-3 fw-semibold">Accion</th>
					</tr>
				</thead>
				<tbody>
					{#each clientDrafts as client (client.id)}
						<tr class="border-b bd-strong hover:bg-panel/30">
							<td class="py-2 px-3 fw-medium txt-soft">{client.id}</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={client.name}
									oninput={(e) => updateClientDraft(client.id, 'name', e.currentTarget.value)}
									class="w-44 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3">
								<input
									type="email"
									value={client.email}
									oninput={(e) => updateClientDraft(client.id, 'email', e.currentTarget.value)}
									class="w-56 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={client.password}
									oninput={(e) => updateClientDraft(client.id, 'password', e.currentTarget.value)}
									class="w-36 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3">
								<select
									value={client.zone}
									onchange={(e) => updateClientDraft(client.id, 'zone', Number(e.currentTarget.value))}
									class="w-44 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								>
									{#each zones as zone (zone.id)}
										<option value={zone.id}>{zone.name}</option>
									{/each}
								</select>
							</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={client.phone}
									oninput={(e) => updateClientDraft(client.id, 'phone', e.currentTarget.value)}
									class="w-36 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3">
								<input
									type="text"
									value={client.address}
									oninput={(e) => updateClientDraft(client.id, 'address', e.currentTarget.value)}
									class="w-64 border bd-soft bg-panel txt-primary rounded px-2 py-1"
								/>
							</td>
							<td class="py-2 px-3 fs-sm txt-muted">
								{getClientOrdersCount(client.id)} ({getZoneName(client.zone)})
							</td>
							<td class="py-2 px-3 text-center">
								<Button variant="primary" size="sm" onclick={() => saveClient(client.id)}>Guardar</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
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
