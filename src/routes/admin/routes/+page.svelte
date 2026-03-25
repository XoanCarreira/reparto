<!-- PÁGINA: Gestión de Rutas -->
<script>
	/**
	 * ADMIN - GESTIÓN DE RUTAS
	 * Panel para asignar repartidores a zonas de reparto
	 * Muestra: rutas asignadas, repartidores libres, rutas sin cobertura
	 * Funcionalidad: cambiar asignaciones de repartidores
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { zonesStore, deliveryStaffStore } from '$lib/stores/dataStore.js';

	// Estado reactivo
	let allZones = $state([]);
	let allStaff = $state([]);
	let zoneDrafts = $state([]);
	let staffDrafts = $state([]);
	let editingZoneId = $state(null);
	let editingStaffId = $state(null);
	let selectedAssignmentStaff = $state(null); // Para el modal de asignación
	let selectedAssignmentZone = $state(null); // Para el modal de asignación
	let showZoneCreate = $state(false);
	let showStaffCreate = $state(false);
	let showDeleteZoneConfirm = $state(false);
	let pendingDeleteZone = $state(null);
	let showDeleteStaffConfirm = $state(false);
	let pendingDeleteStaff = $state(null);
	let newZone = $state({
		name: '',
		deliveryDays: '',
		deliveryTime: '',
		notes: ''
	});
	let newStaff = $state({
		name: '',
		phone: '',
		vehicle: '',
		status: 'active',
		zoneId: ''
	});

	// Suscripciones a stores con cleanup automático
	$effect(() => {
		const unsubscribeZones = zonesStore.subscribe((z) => {
			allZones = z;
			zoneDrafts = z.map((zone) => ({
				id: zone.id,
				name: zone.name || '',
				deliveryDays: Array.isArray(zone.deliveryDays) ? zone.deliveryDays.join(', ') : '',
				deliveryTime: zone.deliveryTime || '',
				notes: zone.notes || zone.description || ''
			}));
		});

		const unsubscribeStaff = deliveryStaffStore.subscribe((s) => {
			allStaff = s;
			staffDrafts = s.map((staff) => ({
				id: staff.id,
				name: staff.name || '',
				phone: staff.phone || '',
				vehicle: staff.vehicle || '',
				status: staff.status || 'active',
				zoneId: staff.zoneId ?? ''
			}));
		});

		// Retorna función cleanup que se ejecuta al desmontar o cuando el effect reinicia
		return () => {
			unsubscribeZones();
			unsubscribeStaff();
		};
	});

	// Estado derivado computado
	const freeStaff = $derived(allStaff.filter((s) => s.zoneId === null));
	const assignedRoutes = $derived(
		allZones.map((zone) => ({
			...zone,
			staff: allStaff.filter((s) => Number(s.zoneId) === Number(zone.id))
		}))
	);
	const uncoveredRoutes = $derived(assignedRoutes.filter((route) => route.staff.length === 0));

	/**
	 * Asigna un repartidor a una zona
	 * @param {number} staffId - ID del repartidor
	 * @param {number|null} zoneId - ID de la zona (null para desasignar)
	 */
	function assignStaffToZone(staffId, zoneId) {
		if (!staffId) return;
		const validZoneId = zoneId === null || zoneId === '' ? null : Number(zoneId);
		deliveryStaffStore.assignZone(staffId, validZoneId);
		selectedAssignmentStaff = null;
		selectedAssignmentZone = null;
	}

	/**
	 * Desasigna un repartidor de su zona
	 * @param {number} staffId - ID del repartidor
	 */
	function unassignStaff(staffId) {
		deliveryStaffStore.assignZone(staffId, null);
	}

	/**
	 * Abre el modal para asignar un repartidor
	 * @param {number} staffId - ID del repartidor a asignar
	 * @param {number} zoneId - ID de la zona destino
	 */
	function openAssignmentModal(staffId, zoneId) {
		selectedAssignmentStaff = staffId;
		selectedAssignmentZone = zoneId;
	}

	/**
	 * Cierra el modal de asignación
	 */
	function closeAssignmentModal() {
		selectedAssignmentStaff = null;
		selectedAssignmentZone = null;
	}

	/**
	 * Obtiene el nombre de un repartidor por su ID
	 * @param {number} staffId - ID del repartidor
	 * @returns {string} Nombre del repartidor
	 */
	function getStaffName(staffId) {
		const staff = allStaff.find((s) => s.id === staffId);
		return staff?.name || 'Desconocido';
	}

	function getZoneName(zoneId) {
		if (zoneId === null || zoneId === undefined || zoneId === '') {
			return 'Sin zona';
		}
		const zone = allZones.find((item) => Number(item.id) === Number(zoneId));
		return zone?.name || 'Sin zona';
	}

	function getStatusLabel(status) {
		if (status === 'on_delivery') return 'En reparto';
		if (status === 'off') return 'No disponible';
		return 'Activo';
	}

	function parseDays(value) {
		return String(value || '')
			.split(',')
			.map((day) => day.trim())
			.filter(Boolean);
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

	function updateZoneDraft(zoneId, key, value) {
		zoneDrafts = zoneDrafts.map((zone) => (zone.id === zoneId ? { ...zone, [key]: value } : zone));
	}

	function startEditZone(zoneId) {
		editingZoneId = zoneId;
	}

	function cancelEditZone(zoneId) {
		const original = allZones.find((zone) => zone.id === zoneId);
		if (original) {
			zoneDrafts = zoneDrafts.map((zone) =>
				zone.id === zoneId
					? {
						...zone,
						name: original.name || '',
						deliveryDays: Array.isArray(original.deliveryDays) ? original.deliveryDays.join(', ') : '',
						deliveryTime: original.deliveryTime || '',
						notes: original.notes || original.description || ''
					}
					: zone
			);
		}
		editingZoneId = null;
	}

	function saveZone(zoneId) {
		const draft = zoneDrafts.find((zone) => zone.id === zoneId);
		if (!draft || !draft.name.trim()) {
			return;
		}

		zonesStore.updateZone(zoneId, {
			name: draft.name,
			deliveryDays: parseDays(draft.deliveryDays),
			deliveryTime: draft.deliveryTime,
			notes: draft.notes
		});

		editingZoneId = null;
	}

	function requestDeleteZone(zoneId, zoneName) {
		pendingDeleteZone = { id: zoneId, name: zoneName };
		showDeleteZoneConfirm = true;
	}

	function closeDeleteZoneConfirm() {
		showDeleteZoneConfirm = false;
		pendingDeleteZone = null;
	}

	function confirmDeleteZone() {
		if (!pendingDeleteZone) {
			return;
		}

		zonesStore.remove(pendingDeleteZone.id);
		if (editingZoneId === pendingDeleteZone.id) {
			editingZoneId = null;
		}
		closeDeleteZoneConfirm();
	}

	function resetNewStaff() {
		newStaff = {
			name: '',
			phone: '',
			vehicle: '',
			status: 'active',
			zoneId: ''
		};
	}

	function createStaffMember() {
		if (!newStaff.name.trim()) {
			return;
		}

		deliveryStaffStore.create({
			name: newStaff.name,
			phone: newStaff.phone,
			vehicle: newStaff.vehicle,
			status: newStaff.status,
			zoneId: newStaff.zoneId === '' ? null : Number(newStaff.zoneId)
		});

		resetNewStaff();
		showStaffCreate = false;
	}

	function requestDeleteStaff(staffId, staffName) {
		pendingDeleteStaff = { id: staffId, name: staffName };
		showDeleteStaffConfirm = true;
	}

	function closeDeleteStaffConfirm() {
		showDeleteStaffConfirm = false;
		pendingDeleteStaff = null;
	}

	function confirmDeleteStaff() {
		if (!pendingDeleteStaff) {
			return;
		}

		deliveryStaffStore.remove(pendingDeleteStaff.id);
		if (editingStaffId === pendingDeleteStaff.id) {
			editingStaffId = null;
		}
		closeDeleteStaffConfirm();
	}

	function updateStaffDraft(staffId, key, value) {
		staffDrafts = staffDrafts.map((staff) => (staff.id === staffId ? { ...staff, [key]: value } : staff));
	}

	function saveStaffMember(staffId) {
		const draft = staffDrafts.find((staff) => staff.id === staffId);
		if (!draft || !draft.name.trim()) {
			return;
		}

		deliveryStaffStore.updateStaff(staffId, {
			name: draft.name,
			phone: draft.phone,
			vehicle: draft.vehicle,
			status: draft.status,
			zoneId: draft.zoneId === '' ? null : Number(draft.zoneId)
		});
		editingStaffId = null;
	}

	function startEditStaff(staffId) {
		editingStaffId = staffId;
	}

	function cancelEditStaff(staffId) {
		const original = allStaff.find((staff) => staff.id === staffId);
		if (original) {
			staffDrafts = staffDrafts.map((staff) =>
				staff.id === staffId
					? {
						...staff,
						name: original.name || '',
						phone: original.phone || '',
						vehicle: original.vehicle || '',
						status: original.status || 'active',
						zoneId: original.zoneId ?? ''
					}
					: staff
			);
		}
		editingStaffId = null;
	}
</script>

<!-- Contenedor principal -->
<div class="routes-container">
	<!-- Encabezado -->
	<div class="routes-header">
		<h1 class="routes-title">🗺️ Gestión de Rutas</h1>
		<p class="routes-subtitle">Asigna repartidores a zonas de reparto</p>
	</div>

	<!-- Grid de secciones -->
	<div class="routes-grid">
		<!-- SECCIÓN 1: RUTAS ASIGNADAS -->
		<Card title="📍 Rutas Asignadas">
			<div class="routes-list">
				{#if assignedRoutes.length === 0}
					<p class="empty-state">No hay rutas registradas</p>
				{:else}
					{#each assignedRoutes as route (route.id)}
						<div class="route-card">
							<div class="route-header">
								<h3 class="route-name">{route.name}</h3>
								<Badge
									label={route.staff.length > 0 ? `${route.staff.length} repartidor(es)` : 'Sin cobertura'}
									color={route.staff.length > 0 ? 'success' : 'warning'}
								/>
							</div>

							<p class="route-info">
								📍 {route.description}
							</p>
							<p class="route-info">
								⏰ {route.deliveryDays.join(', ')} - {route.deliveryTime}
							</p>

							<!-- lista de repartidores asignados -->
							<div class="route-staff-list">
								{#if route.staff.length === 0}
									<p class="no-staff">Sin repartidor asignado</p>
									<button
										onclick={() => openAssignmentModal(null, route.id)}
										class="btn-assign"
									>
										+ Asignar repartidor
									</button>
								{:else}
									{#each route.staff as staff (staff.id)}
										<div class="staff-item">
											<div class="staff-info">
												<p class="staff-name">
													🚚 {staff.name}
													<span class="staff-phone">({staff.phone})</span>
												</p>
												<p class="staff-vehicle">🚗 {staff.vehicle}</p>
											</div>
											<button
												onclick={() => unassignStaff(staff.id)}
												class="btn-unassign"
												title="Desasignar del ruta"
											>
												✕
											</button>
										</div>
									{/each}
									<button
										onclick={() => openAssignmentModal(null, route.id)}
										class="btn-assign-more"
									>
										+ Agregar más repartidores
									</button>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</Card>

		<!-- SECCIÓN 2: REPARTIDORES LIBRES -->
		<Card title="🟢 Repartidores Disponibles">
			<div class="free-staff-list">
				{#if freeStaff.length === 0}
					<div class="empty-state">
						<p>✓ Todos los repartidores están asignados</p>
					</div>
				{:else}
					<p class="free-staff-count">Total disponibles: <strong>{freeStaff.length}</strong></p>

					<div class="staff-cards">
						{#each freeStaff as staff (staff.id)}
							<div class="free-staff-card">
								<div class="staff-header">
									<h4 class="staff-name-large">{staff.name}</h4>
									<Badge
										label={staff.status === 'active' ? 'Activo' : staff.status}
										color={staff.status === 'active' ? 'success' : 'default'}
									/>
								</div>

								<div class="staff-details">
									<p class="detail-line">
										<span class="label">📞 Teléfono:</span>
										<span>{staff.phone}</span>
									</p>
									<p class="detail-line">
										<span class="label">🚗 Vehículo:</span>
										<span>{staff.vehicle}</span>
									</p>
									<p class="detail-line">
										<span class="label">🟡 Estado:</span>
										<span>{staff.status}</span>
									</p>
								</div>

								<!-- Dropdown para seleccionar zona -->
								<div class="zone-selector-wrap">
									<select
										class="zone-selector"
										onchange={(e) => {
											const zoneId = e.target.value;
											if (zoneId) {
												assignStaffToZone(staff.id, Number(zoneId));
												e.target.value = ''; // Reset dropdown
											}
										}}
									>
										<option value="">← Asignar a una zona</option>
										{#each allZones as zone (zone.id)}
											<option value={zone.id}>{zone.name}</option>
										{/each}
									</select>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Card>

		<!-- SECCIÓN 3: RUTAS SIN COBERTURA -->
		<Card title="⚠️ Rutas sin Cobertura">
			<div class="uncovered-routes-list">
				{#if uncoveredRoutes.length === 0}
					<div class="empty-state">
						<p>✓ Todas las rutas tienen cobertura asignada</p>
					</div>
				{:else}
					<p class="uncovered-count">Total sin cubrir: <strong>{uncoveredRoutes.length}</strong></p>

					<div class="uncovered-grid">
						{#each uncoveredRoutes as route (route.id)}
							<div class="uncovered-route-card">
								<div class="uncovered-header">
									<h4 class="uncovered-title">{route.name}</h4>
									<span class="priority-badge">URGENTE</span>
								</div>

								<div class="uncovered-details">
									<p class="detail-line">
										<span class="label">📍 Zona:</span>
										<span>{route.description}</span>
									</p>
									<p class="detail-line">
										<span class="label">⏰ Horarios:</span>
										<span>{route.deliveryDays.join(', ')}</span>
									</p>
									<p class="detail-line">
										<span class="label">🕐 Franja:</span>
										<span>{route.deliveryTime}</span>
									</p>
								</div>

								<!-- Selector rápido de repartidores disponibles -->
								{#if freeStaff.length > 0}
									<div class="quick-assign">
										<p class="quick-assign-label">Asignar repartidor:</p>
										<select
											class="quick-assign-select"
											onchange={(e) => {
												if (e.target.value) {
													assignStaffToZone(Number(e.target.value), route.id);
													e.target.value = '';
												}
											}}
										>
											<option value="">Selecciona un repartidor...</option>
											{#each freeStaff as staff (staff.id)}
												<option value={staff.id}>{staff.name} - {staff.phone}</option>
											{/each}
										</select>
									</div>
								{:else}
									<div class="no-available-staff">
										<p>No hay repartidores disponibles</p>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Card>
	</div>

	<Card title="🗺️ Gestión de Zonas" titleClass="title-blue" class="card-section">
		<div class="form-header">
			<Button variant="primary" size="sm" onclick={() => (showZoneCreate = !showZoneCreate)}>
				{showZoneCreate ? '✕ Cerrar' : '+ Nueva zona'}
			</Button>
		</div>

		{#if showZoneCreate}
			<div class="form-section">
				<div class="form-grid form-grid-4">
					<input
						type="text"
						placeholder="Nombre"
						value={newZone.name}
						oninput={(e) => (newZone = { ...newZone, name: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Días (Lunes, Miércoles...)"
						value={newZone.deliveryDays}
						oninput={(e) => (newZone = { ...newZone, deliveryDays: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Horario reparto"
						value={newZone.deliveryTime}
						oninput={(e) => (newZone = { ...newZone, deliveryTime: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Notas"
						value={newZone.notes}
						oninput={(e) => (newZone = { ...newZone, notes: e.currentTarget.value })}
						class="form-input"
					/>
				</div>
				<div class="form-actions">
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

		<div class="table-wrapper">
			<table class="admin-table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Nombre</th>
						<th>Días reparto</th>
						<th>Horas</th>
						<th>Notas</th>
						<th class="align-center">Acción</th>
					</tr>
				</thead>
				<tbody>
					{#if zoneDrafts.length === 0}
						<tr>
							<td colspan="6" class="table-empty">No hay zonas registradas</td>
						</tr>
					{:else}
						{#each zoneDrafts as zone (zone.id)}
							<tr>
								<td class="table-id">{zone.id}</td>
								<td>
									{#if editingZoneId === zone.id}
										<input
											type="text"
											value={zone.name}
											oninput={(e) => updateZoneDraft(zone.id, 'name', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{zone.name}
									{/if}
								</td>
								<td>
									{#if editingZoneId === zone.id}
										<input
											type="text"
											value={zone.deliveryDays}
											oninput={(e) => updateZoneDraft(zone.id, 'deliveryDays', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{zone.deliveryDays || '-'}
									{/if}
								</td>
								<td>
									{#if editingZoneId === zone.id}
										<input
											type="text"
											value={zone.deliveryTime}
											oninput={(e) => updateZoneDraft(zone.id, 'deliveryTime', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{zone.deliveryTime || '-'}
									{/if}
								</td>
								<td>
									{#if editingZoneId === zone.id}
										<input
											type="text"
											value={zone.notes}
											oninput={(e) => updateZoneDraft(zone.id, 'notes', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{zone.notes || '-'}
									{/if}
								</td>
								<td class="align-center">
									<div class="action-buttons">
										{#if editingZoneId === zone.id}
											<Button variant="primary" size="sm" onclick={() => saveZone(zone.id)}>
												Guardar
											</Button>
											<Button variant="secondary" size="sm" onclick={() => cancelEditZone(zone.id)}>
												Cancelar
											</Button>
											<Button variant="danger" size="sm" onclick={() => requestDeleteZone(zone.id, zone.name)}>
												Eliminar
											</Button>
										{:else}
											<Button variant="secondary" size="sm" onclick={() => startEditZone(zone.id)}>
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

	<Card title="👷 Gestión de Repartidores" titleClass="title-violet" class="card-section">
		<div class="form-header">
			<Button variant="primary" size="sm" onclick={() => (showStaffCreate = !showStaffCreate)}>
				{showStaffCreate ? '✕ Cerrar' : '+ Nuevo repartidor'}
			</Button>
		</div>

		{#if showStaffCreate}
			<div class="form-section">
				<div class="form-grid form-grid-5">
					<input
						type="text"
						placeholder="Nombre"
						value={newStaff.name}
						oninput={(e) => (newStaff = { ...newStaff, name: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Teléfono"
						value={newStaff.phone}
						oninput={(e) => (newStaff = { ...newStaff, phone: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Vehículo"
						value={newStaff.vehicle}
						oninput={(e) => (newStaff = { ...newStaff, vehicle: e.currentTarget.value })}
						class="form-input"
					/>
					<select
						value={newStaff.status}
						onchange={(e) => (newStaff = { ...newStaff, status: e.currentTarget.value })}
						class="form-input"
					>
						<option value="active">Activo</option>
						<option value="off">No disponible</option>
						<option value="on_delivery">En reparto</option>
					</select>
					<select
						value={newStaff.zoneId}
						onchange={(e) => (newStaff = { ...newStaff, zoneId: e.currentTarget.value })}
						class="form-input"
					>
						<option value="">Sin zona asignada</option>
						{#each allZones as zone (zone.id)}
							<option value={zone.id}>{zone.name}</option>
						{/each}
					</select>
				</div>
				<div class="form-actions">
					<Button variant="primary" size="sm" onclick={createStaffMember}>Crear repartidor</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={() => {
							resetNewStaff();
							showStaffCreate = false;
						}}
					>
						Cancelar
					</Button>
				</div>
			</div>
		{/if}

		<div class="table-wrapper">
			<table class="admin-table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Nombre</th>
						<th>Teléfono</th>
						<th>Vehículo</th>
						<th>Estado</th>
						<th>Zona</th>
						<th class="align-center">Acción</th>
					</tr>
				</thead>
				<tbody>
					{#if allStaff.length === 0}
						<tr>
							<td colspan="7" class="table-empty">No hay repartidores registrados</td>
						</tr>
					{:else}
						{#each staffDrafts as staff (staff.id)}
							<tr>
								<td class="table-id">{staff.id}</td>
								<td>
									{#if editingStaffId === staff.id}
										<input
											type="text"
											value={staff.name}
											oninput={(e) => updateStaffDraft(staff.id, 'name', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{staff.name}
									{/if}
								</td>
								<td>
									{#if editingStaffId === staff.id}
										<input
											type="text"
											value={staff.phone}
											oninput={(e) => updateStaffDraft(staff.id, 'phone', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{staff.phone || '-'}
									{/if}
								</td>
								<td>
									{#if editingStaffId === staff.id}
										<input
											type="text"
											value={staff.vehicle}
											oninput={(e) => updateStaffDraft(staff.id, 'vehicle', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										{staff.vehicle || '-'}
									{/if}
								</td>
								<td>
									{#if editingStaffId === staff.id}
										<select
											value={staff.status}
											onchange={(e) => updateStaffDraft(staff.id, 'status', e.currentTarget.value)}
											class="table-input"
										>
											<option value="active">active</option>
											<option value="off">off</option>
											<option value="on_delivery">on_delivery</option>
										</select>
									{:else}
										{getStatusLabel(staff.status)}
									{/if}
								</td>
								<td>
									{#if editingStaffId === staff.id}
										<select
											value={staff.zoneId ?? ''}
											onchange={(e) => updateStaffDraft(staff.id, 'zoneId', e.currentTarget.value)}
											class="table-input"
										>
											<option value="">Sin zona</option>
											{#each allZones as zone (zone.id)}
												<option value={zone.id}>{zone.name}</option>
											{/each}
										</select>
									{:else}
										{getZoneName(staff.zoneId)}
									{/if}
								</td>
								<td class="align-center">
									<div class="action-buttons">
										{#if editingStaffId === staff.id}
											<Button variant="primary" size="sm" onclick={() => saveStaffMember(staff.id)}>
												Guardar
											</Button>
											<Button variant="secondary" size="sm" onclick={() => cancelEditStaff(staff.id)}>
												Cancelar
											</Button>
											<Button variant="danger" size="sm" onclick={() => requestDeleteStaff(staff.id, staff.name)}>
												Eliminar
											</Button>
										{:else}
											<Button variant="secondary" size="sm" onclick={() => startEditStaff(staff.id)}>
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

	<!-- MODAL de confirmación de asignación -->
	{#if selectedAssignmentStaff !== null && selectedAssignmentZone !== null}
		<div
			class="modal-overlay"
			role="presentation"
			onclick={closeAssignmentModal}
			onkeydown={(e) => e.key === 'Escape' && closeAssignmentModal()}
		>
			<div
				class="modal-content"
				role="dialog"
				aria-modal="true"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<h3 class="modal-title">Confirmar Asignación</h3>
				<p class="modal-message">
					¿Asignar a <strong>{getStaffName(selectedAssignmentStaff)}</strong> a esta zona?
				</p>

				<div class="modal-actions">
					<button
						onclick={() => assignStaffToZone(selectedAssignmentStaff, selectedAssignmentZone)}
						class="btn-confirm"
					>
						✓ Confirmar
					</button>
					<button
						onclick={closeAssignmentModal}
						class="btn-cancel"
					>
						✕ Cancelar
					</button>
				</div>
			</div>
		</div>
	{/if}

	<ConfirmDialog
		open={showDeleteZoneConfirm}
		title="Eliminar Zona"
		message={`Se eliminará ${pendingDeleteZone?.name || 'esta zona'}. Esta acción no se puede deshacer.`}
		confirmText="Sí, eliminar"
		cancelText="Cancelar"
		variant="danger"
		onCancel={closeDeleteZoneConfirm}
		onConfirm={confirmDeleteZone}
	/>

	<ConfirmDialog
		open={showDeleteStaffConfirm}
		title="Eliminar Repartidor"
		message={`Se eliminará a ${pendingDeleteStaff?.name || 'este repartidor'}. Esta acción no se puede deshacer.`}
		confirmText="Sí, eliminar"
		cancelText="Cancelar"
		variant="danger"
		onCancel={closeDeleteStaffConfirm}
		onConfirm={confirmDeleteStaff}
	/>
</div>

<style>
	/* ============================================
	 * CONTENEDOR PRINCIPAL
	 * ============================================ */
	.routes-container {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	/* ============================================
	 * ENCABEZADO
	 * ============================================ */
	.routes-header {
		margin-bottom: 2rem;
	}

	.routes-title {
		font-size: 2rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.3px;
	}

	.routes-subtitle {
		font-size: 1rem;
		color: #cbd5e1;
		margin: 0;
		font-weight: 400;
	}

	/* ============================================
	 * GESTION DE REPARTIDORES
	 * ============================================ */
	:global(.card-section) {
		margin-bottom: 2rem;
	}

	:global(.title-violet) {
		color: #8b5cf6;
	}

	:global(.title-blue) {
		color: #3b82f6;
	}

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

	.form-grid-5 {
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	}

	.form-grid-4 {
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

	.table-empty {
		text-align: center;
		color: #94a3b8;
		font-style: italic;
	}

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

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* ============================================
	 * GRID DE SECCIONES
	 * ============================================ */
	.routes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 768px) {
		.routes-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.form-grid-5 {
			grid-template-columns: 1fr;
		}

		.form-grid-4 {
			grid-template-columns: 1fr;
		}
	}

	/* ============================================
	 * SECCIÓN 1: RUTAS ASIGNADAS
	 * ============================================ */
	.routes-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.route-card {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.5rem;
		transition: all 0.2s ease;
	}

	.route-card:hover {
		border-color: #475569;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.route-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.route-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: #f1f5f9;
		margin: 0;
	}

	.route-info {
		font-size: 0.9rem;
		color: #cbd5e1;
		margin: 0.5rem 0;
		line-height: 1.4;
	}

	.route-staff-list {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #334155;
	}

	.no-staff {
		color: #e0e7ff;
		font-size: 0.9rem;
		margin: 0.5rem 0;
		font-style: italic;
	}

	.staff-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: #0f172a;
		border-radius: 0.35rem;
		margin-bottom: 0.75rem;
		transition: background 0.15s ease;
	}

	.staff-item:hover {
		background: #1a2a3a;
	}

	.staff-info {
		flex: 1;
	}

	.staff-name {
		color: #f1f5f9;
		font-weight: 500;
		font-size: 0.95rem;
		margin: 0;
	}

	.staff-phone {
		color: #94a3b8;
		font-weight: 400;
		font-size: 0.85rem;
	}

	.staff-vehicle {
		color: #cbd5e1;
		font-size: 0.85rem;
		margin: 0.25rem 0 0 0;
	}

	.btn-unassign {
		background: #7f1d1d;
		color: #fca5a5;
		border: none;
		border-radius: 0.35rem;
		width: 2rem;
		height: 2rem;
		cursor: pointer;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.btn-unassign:hover {
		background: #991b1b;
		color: #fecaca;
	}

	.btn-assign,
	.btn-assign-more {
		width: 100%;
		padding: 0.75rem;
		background: #1e40af;
		color: #bfdbfe;
		border: 1px solid #3b82f6;
		border-radius: 0.35rem;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.2s ease;
		margin-top: 0.5rem;
	}

	.btn-assign:hover,
	.btn-assign-more:hover {
		background: #1d3a8a;
		border-color: #60a5fa;
	}

	/* ============================================
	 * SECCIÓN 2: REPARTIDORES LIBRES
	 * ============================================ */
	.free-staff-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.free-staff-count {
		font-size: 0.95rem;
		color: #cbd5e1;
		margin: 0 0 1rem 0;
	}

	.staff-cards {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.free-staff-card {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
		transition: all 0.2s ease;
	}

	.free-staff-card:hover {
		border-color: #475569;
		background: #253449;
	}

	.staff-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.staff-name-large {
		font-size: 1rem;
		font-weight: 600;
		color: #f1f5f9;
		margin: 0;
	}

	.staff-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #0f172a;
		border-radius: 0.35rem;
	}

	.detail-line {
		font-size: 0.9rem;
		color: #cbd5e1;
		margin: 0;
		display: flex;
		gap: 0.75rem;
	}

	.label {
		color: #94a3b8;
		font-weight: 500;
		min-width: 120px;
	}

	.zone-selector-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.zone-selector {
		width: 100%;
		padding: 0.75rem;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		color: #f1f5f9;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.zone-selector:hover {
		border-color: #475569;
		background: #253449;
	}

	.zone-selector:focus {
		outline: none;
		border-color: #3b82f6;
		background: #253449;
	}

	/* ============================================
	 * SECCIÓN 3: RUTAS SIN COBERTURA
	 * ============================================ */
	.uncovered-routes-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.uncovered-count {
		font-size: 0.95rem;
		color: #fca5a5;
		margin: 0 0 1rem 0;
		font-weight: 500;
	}

	.uncovered-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.uncovered-route-card {
		background: #3d2629;
		border: 1px solid #7f1d1d;
		border-radius: 0.5rem;
		padding: 1rem;
		transition: all 0.2s ease;
	}

	.uncovered-route-card:hover {
		border-color: #991b1b;
		background: #5a3637;
	}

	.uncovered-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.uncovered-title {
		font-size: 1rem;
		font-weight: 600;
		color: #fecaca;
		margin: 0;
	}

	.priority-badge {
		background: #991b1b;
		color: #fca5a5;
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.uncovered-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #2a1c1f;
		border-radius: 0.35rem;
	}

	.quick-assign {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #1e293b;
		border-radius: 0.35rem;
		border: 1px dashed #334155;
	}

	.quick-assign-label {
		font-size: 0.9rem;
		color: #cbd5e1;
		margin: 0;
		font-weight: 500;
	}

	.quick-assign-select {
		width: 100%;
		padding: 0.75rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		color: #f1f5f9;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.quick-assign-select:hover {
		border-color: #475569;
	}

	.quick-assign-select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.no-available-staff {
		padding: 0.75rem;
		background: #3d2629;
		border: 1px solid #7f1d1d;
		border-radius: 0.35rem;
		text-align: center;
	}

	.no-available-staff p {
		color: #fca5a5;
		margin: 0;
		font-size: 0.9rem;
	}

	/* ============================================
	 * ESTADO VACÍO
	 * ============================================ */
	.empty-state {
		padding: 2rem;
		text-align: center;
		color: #94a3b8;
		font-size: 0.95rem;
		background: #0f172a;
		border-radius: 0.5rem;
		border: 1px dashed #334155;
	}

	.empty-state p {
		margin: 0;
	}

	/* ============================================
	 * MODAL
	 * ============================================ */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-content {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.75rem;
		padding: 2rem;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 20px 25px rgba(0, 0, 0, 0.4);
		animation: slideUp 0.3s ease;
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #f1f5f9;
		margin: 0 0 1rem 0;
	}

	.modal-message {
		font-size: 1rem;
		color: #cbd5e1;
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
	}

	.btn-confirm {
		flex: 1;
		padding: 0.75rem 1rem;
		background: #16a34a;
		color: #dcfce7;
		border: 1px solid #22c55e;
		border-radius: 0.35rem;
		cursor: pointer;
		font-size: 0.95rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.btn-confirm:hover {
		background: #15803d;
		border-color: #4ade80;
	}

	.btn-cancel {
		flex: 1;
		padding: 0.75rem 1rem;
		background: #475569;
		color: #f1f5f9;
		border: 1px solid #64748b;
		border-radius: 0.35rem;
		cursor: pointer;
		font-size: 0.95rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.btn-cancel:hover {
		background: #334155;
		border-color: #94a3b8;
	}

	/* ============================================
	 * RESPONSIVE MOBILE
	 * ============================================ */
	@media (max-width: 480px) {
		.routes-container {
			padding: 1rem;
		}

		.routes-title {
			font-size: 1.5rem;
		}

		.route-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.staff-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.modal-content {
			width: 95%;
			padding: 1.5rem;
		}
	}
</style>
