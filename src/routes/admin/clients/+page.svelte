<!-- PAGINA: Clientes Admin -->
<script>
	/**
	 * Gestion administrativa de clientes.
	 * Permite ver, crear y editar clientes con referencia a zonas.
	 */

	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { clientsStore, zonesStore, ordersStore } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';

	let zones = $state([]);
	let clients = $state([]);
	let allOrders = $state([]);
	let clientDrafts = $state([]);
	let editingClientId = $state(null);
	let showClientCreate = $state(false);
	let confirmDeleteOpen = $state(false);
	let pendingDelete = $state({
		id: null,
		name: ''
	});
	let newClient = $state({
		name: '',
		email: '',
		password: 'cliente123',
		zone: 1,
		phone: '',
		address: '',
		gpsLat: '',
		gpsLng: ''
	});

	zonesStore.subscribe(($zones) => {
		zones = $zones;

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

	function updateClientDraft(clientId, key, value) {
		clientDrafts = clientDrafts.map((client) =>
			client.id === clientId ? { ...client, [key]: value } : client
		);
	}

	function saveClient(clientId) {
		const draft = clientDrafts.find((client) => client.id === clientId);
		if (!draft || !draft.name?.trim() || !draft.email?.trim()) {
			return;
		}

		clientsStore.updateClient(clientId, {
			name: draft.name,
			email: draft.email,
			password: draft.password,
			zone: Number(draft.zone),
			phone: draft.phone,
			address: draft.address,
			gpsLat: draft.gpsLat,
			gpsLng: draft.gpsLng
		});

		editingClientId = null;
	}

	function startEditClient(clientId) {
		editingClientId = clientId;
	}

	function cancelEditClient(clientId) {
		const original = clients.find((client) => client.id === clientId);
		if (original) {
			clientDrafts = clientDrafts.map((client) =>
				client.id === clientId ? { ...original } : client
			);
		}
		editingClientId = null;
	}

	function resetNewClient() {
		newClient = {
			name: '',
			email: '',
			password: 'cliente123',
			zone: zones[0]?.id || 1,
			phone: '',
			address: '',
			gpsLat: '',
			gpsLng: ''
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
			address: newClient.address,
			gpsLat: newClient.gpsLat,
			gpsLng: newClient.gpsLng
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

	function requestDelete(id, name) {
		pendingDelete = { id, name };
		confirmDeleteOpen = true;
	}

	function closeDeleteConfirm() {
		confirmDeleteOpen = false;
		pendingDelete = { id: null, name: '' };
	}

	function confirmDelete() {
		if (!pendingDelete.id) {
			return;
		}

		clientsStore.remove(pendingDelete.id);
		if (editingClientId === pendingDelete.id) {
			editingClientId = null;
		}

		closeDeleteConfirm();
	}
</script>

<svelte:head>
	<title>Clientes - Admin - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header">
		<h1 class="page-title">👥 Gestión de Clientes</h1>
		<p class="page-subtitle">Gestion centralizada de clientes y métricas generales</p>
	</div>

	<Card title="📊 Resumen General" titleClass="title-blue" class="card-section">
		<div class="summary-cards">
			<!-- Zonas de reparto -->
			<div class="summary-item">
				<div class="summary-number">{zones.length}</div>
				<p class="summary-label">Zonas</p>
			</div>

			<!-- Clientes -->
			<div class="summary-item">
				<div class="summary-number">{clients.length}</div>
				<p class="summary-label">Clientes</p>
			</div>

			<!-- Facturación total -->
			<div class="summary-item">
				<div class="summary-number">
					{#if totalRevenue > 999999}
						{(totalRevenue / 1000000).toFixed(1)}M
					{:else if totalRevenue > 999}
						{(totalRevenue / 1000).toFixed(0)}k
					{:else}
						{formatCurrency(totalRevenue)}
					{/if}
				</div>
				<p class="summary-label">Facturación</p>
			</div>
		</div>
	</Card>

	<Card title="🏪 Gestión de Clientes" titleClass="title-violet" class="card-section">
		<!-- Botón de nuevo cliente -->
		<div class="form-header">
			<Button variant="primary" size="sm" onclick={() => (showClientCreate = !showClientCreate)}>
				{showClientCreate ? '✕ Cerrar' : '+ Nuevo cliente'}
			</Button>
		</div>

		<!-- Formulario de crear cliente -->
		{#if showClientCreate}
			<div class="form-section">
				<div class="form-grid form-grid-6">
					<input
						type="text"
						placeholder="Nombre"
						value={newClient.name}
						oninput={(e) => (newClient = { ...newClient, name: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="email"
						placeholder="Email"
						value={newClient.email}
						oninput={(e) => (newClient = { ...newClient, email: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Password"
						value={newClient.password}
						oninput={(e) => (newClient = { ...newClient, password: e.currentTarget.value })}
						class="form-input"
					/>
					<select
						value={newClient.zone}
						onchange={(e) => (newClient = { ...newClient, zone: Number(e.currentTarget.value) })}
						class="form-input"
					>
						{#each zones as zone (zone.id)}
							<option value={zone.id}>{zone.name}</option>
						{/each}
					</select>
					<input
						type="text"
						placeholder="Teléfono"
						value={newClient.phone}
						oninput={(e) => (newClient = { ...newClient, phone: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Dirección"
						value={newClient.address}
						oninput={(e) => (newClient = { ...newClient, address: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="number"
						step="0.000001"
						min="-90"
						max="90"
						placeholder="GPS Latitud"
						value={newClient.gpsLat}
						oninput={(e) => (newClient = { ...newClient, gpsLat: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="number"
						step="0.000001"
						min="-180"
						max="180"
						placeholder="GPS Longitud"
						value={newClient.gpsLng}
						oninput={(e) => (newClient = { ...newClient, gpsLng: e.currentTarget.value })}
						class="form-input"
					/>
				</div>
				<div class="form-actions">
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

		<!-- Tabla de clientes -->
		<div class="table-wrapper">
			<table class="admin-table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Nombre</th>
						<th>Email</th>
						<th>Password</th>
						<th>Zona</th>
						<th>Teléfono</th>
						<th>Dirección</th>
						<th>GPS</th>
						<th class="align-center">Pedidos</th>
						<th class="align-center">Acción</th>
					</tr>
				</thead>
				<tbody>
					{#if clientDrafts.length === 0}
						<tr>
							<td colspan="10" class="table-empty">No hay clientes registrados</td>
						</tr>
					{:else}
						{#each clientDrafts as client (client.id)}
							<tr>
								<td class="table-id">{client.id}</td>
								<td>
									{#if editingClientId === client.id}
										<input
											type="text"
											value={client.name}
											oninput={(e) => updateClientDraft(client.id, 'name', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{client.name}
									{/if}
								</td>
								<td>
									{#if editingClientId === client.id}
										<input
											type="email"
											value={client.email}
											oninput={(e) => updateClientDraft(client.id, 'email', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{client.email}
									{/if}
								</td>
								<td>
									{#if editingClientId === client.id}
										<input
											type="text"
											value={client.password}
											oninput={(e) => updateClientDraft(client.id, 'password', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{client.password}
									{/if}
								</td>
								<td>
									{#if editingClientId === client.id}
										<select
											value={client.zone}
											onchange={(e) => updateClientDraft(client.id, 'zone', Number(e.currentTarget.value))}
											class="table-input"
										>
											{#each zones as zone (zone.id)}
												<option value={zone.id}>{zone.name}</option>
											{/each}
										</select>
									{:else}
										{getZoneName(client.zone)}
									{/if}
								</td>
								<td>
									{#if editingClientId === client.id}
										<input
											type="text"
											value={client.phone}
											oninput={(e) => updateClientDraft(client.id, 'phone', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{client.phone || '-'}
									{/if}
								</td>
								<td>
									{#if editingClientId === client.id}
										<input
											type="text"
											value={client.address}
											oninput={(e) => updateClientDraft(client.id, 'address', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{client.address || '-'}
									{/if}
								</td>
								<td>
									{#if editingClientId === client.id}
										<div class="gps-edit-grid">
											<input
												type="number"
												step="0.000001"
												min="-90"
												max="90"
												value={client.gpsLat ?? ''}
												oninput={(e) => updateClientDraft(client.id, 'gpsLat', e.currentTarget.value)}
												class="table-input"
											/>
											<input
												type="number"
												step="0.000001"
												min="-180"
												max="180"
												value={client.gpsLng ?? ''}
												oninput={(e) => updateClientDraft(client.id, 'gpsLng', e.currentTarget.value)}
												class="table-input"
											/>
										</div>
									{:else if client.gpsLat !== null && client.gpsLat !== undefined && client.gpsLng !== null && client.gpsLng !== undefined}
										{client.gpsLat}, {client.gpsLng}
									{:else}
										-
									{/if}
								</td>
								<td class="align-center table-summary">
									{getClientOrdersCount(client.id)} {getZoneName(client.zone)}
								</td>
								<td class="align-center">
									<div class="action-buttons">
										{#if editingClientId === client.id}
											<Button variant="primary" size="sm" onclick={() => saveClient(client.id)}>
												Guardar
											</Button>
											<Button variant="secondary" size="sm" onclick={() => cancelEditClient(client.id)}>
												Cancelar
											</Button>
											<Button
												variant="danger"
												size="sm"
												onclick={() => requestDelete(client.id, client.name)}
											>
												Eliminar
											</Button>
										{:else}
											<Button variant="secondary" size="sm" onclick={() => startEditClient(client.id)}>
												Editar
											</Button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</Card>

	<ConfirmDialog
		open={confirmDeleteOpen}
		title="Eliminar Cliente"
		message={`Se eliminará ${pendingDelete.name || 'este registro'}. Esta acción no se puede deshacer.`}
		confirmText="Sí, eliminar"
		cancelText="Cancelar"
		variant="danger"
		onCancel={closeDeleteConfirm}
		onConfirm={confirmDelete}
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
	 * CARD SECTIONS
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

	/* ============================================
	 * RESUMEN DE CARDS
	 * ============================================ */
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1.5rem;
	}

	.summary-item {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.5rem;
		text-align: center;
		transition: all 0.2s ease;
	}

	.summary-item:hover {
		border-color: #475569;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.summary-number {
		font-size: 2.5rem;
		font-weight: 700;
		color: #3b82f6;
		margin: 0 0 0.5rem 0;
	}

	.summary-label {
		font-size: 0.9rem;
		color: #cbd5e1;
		margin: 0;
		font-weight: 500;
	}

	/* ============================================
	 * FORMULARIOS
	 * ============================================ */
	.form-header {
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: flex-end;
	}

	.form-section {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.form-grid {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.form-grid-6 {
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	}

	.form-input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		background: #1e293b;
		color: #cbd5e1;
		font-size: 0.9rem;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.form-input:hover {
		border-color: #475569;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.table-empty {
		text-align: center;
		color: #94a3b8;
		font-style: italic;
	}

	/* ============================================
	 * TABLAS
	 * ============================================ */
	.table-wrapper {
		overflow-x: auto;
		border-radius: 0.5rem;
		background: #0f172a;
	}

	.admin-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.admin-table thead tr {
		border-bottom: 2px solid #334155;
		background: #1e293b;
	}

	.admin-table th {
		text-align: left;
		padding: 0.875rem 0.75rem;
		color: #cbd5e1;
		font-weight: 600;
		white-space: nowrap;
	}

	.admin-table th.align-center {
		text-align: center;
	}

	.admin-table tbody tr {
		border-bottom: 1px solid #334155;
		transition: background-color 0.15s ease;
	}

	.admin-table tbody tr:hover {
		background: #1e293b;
	}

	.admin-table td {
		padding: 0.75rem;
		color: #cbd5e1;
		vertical-align: middle;
	}

	.table-id {
		width: 50px;
		text-align: center;
		color: #94a3b8;
		font-weight: 500;
	}

	.align-center {
		text-align: center;
	}

	.table-summary {
		font-size: 0.85rem;
		color: #94a3b8;
	}

	/* Inputs en tabla */
	.table-input {
		width: 100%;
		border: 1px solid #334155;
		background: #0f172a;
		color: #cbd5e1;
		border-radius: 0.3rem;
		padding: 0.4rem 0.5rem;
		font-size: 0.85rem;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.table-input:hover {
		border-color: #475569;
	}

	.table-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.gps-edit-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(95px, 1fr));
		gap: 0.4rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* ============================================
	 * RESPONSIVE
	 * ============================================ */
	@media (max-width: 1024px) {
		.page-root {
			padding: 1.5rem;
		}

		.form-grid-6 {
			grid-template-columns: repeat(3, 1fr);
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

		.summary-cards {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.summary-item {
			padding: 1rem;
		}

		.summary-number {
			font-size: 2rem;
		}

		.form-grid-6 {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.admin-table {
			font-size: 0.75rem;
		}

		.admin-table th,
		.admin-table td {
			padding: 0.5rem 0.5rem;
		}
	}

	@media (max-width: 640px) {
		.summary-cards {
			grid-template-columns: 1fr;
		}

		.form-grid-6 {
			grid-template-columns: 1fr;
		}

		.admin-table {
			font-size: 0.7rem;
		}

		.admin-table th,
		.admin-table td {
			padding: 0.4rem 0.3rem;
		}
	}
</style>
