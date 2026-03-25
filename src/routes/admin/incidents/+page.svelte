<!-- PÁGINA: Incidencias Admin -->
<script>
	/**
	 * PÁGINA DE INCIDENCIAS
	 * Gestiona y visualiza problemas o incidencias reportadas
	 * Permite cambiar estado y prioridad
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { incidentsStore, clientsStore } from '$lib/stores/dataStore.js';
	import { formatDate } from '$lib/utils/helpers.js';

	let statusFilter = $state('all'); // all, open, in_progress, resolved
	let allIncidents = $state([]);
	let allClients = $state([]);
	let confirmResolveOpen = $state(false);
	let pendingIncidentId = $state(null);
	const filteredIncidents = $derived(
		allIncidents.filter((incident) => statusFilter === 'all' || incident.status === statusFilter)
	);

	// Se suscribe a incidencias
	incidentsStore.subscribe(($incidents) => {
		allIncidents = $incidents;
	});

	clientsStore.subscribe(($clients) => {
		allClients = $clients;
	});

	/**
	 * Obtiene el nombre del cliente
	 */
	function getClientName(clientId) {
		const client = allClients.find((u) => Number(u.id) === Number(clientId));
		return client?.name || 'Desconocido';
	}

	/**
	 * Obtiene el icono de prioridad
	 */
	function getPriorityIcon(priority) {
		const icons = { high: '🔴', medium: '🟡', low: '🟢' };
		return icons[priority] || '⚪';
	}

	/**
	 * Cambia el estado de una incidencia
	 */
	function changeIncidentStatus(incidentId, newStatus) {
		if (newStatus === 'resolved') {
			pendingIncidentId = incidentId;
			confirmResolveOpen = true;
		}
	}

	function closeResolveConfirm() {
		confirmResolveOpen = false;
		pendingIncidentId = null;
	}

	function confirmResolveIncident() {
		if (!pendingIncidentId) {
			return;
		}

		incidentsStore.resolve(pendingIncidentId);
		closeResolveConfirm();
	}

	/**
	 * Cambia el filtro de estado
	 */
	function changeFilter(newStatus) {
		statusFilter = newStatus;
	}

	/**
	 * Obtiene el tipo de incidencia traducido
	 */
	function getIncidentType(type) {
		const types = {
			delayed: 'Retraso',
			damaged: 'Dañado',
			wrong_quantity: 'Cantidad incorrecta',
			other: 'Otro problema'
		};
		return types[type] || type;
	}
</script>

<svelte:head>
	<title>Incidencias - Admin - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<!-- Encabezado -->
	<div class="page-header">
		<h1 class="page-title">⚠️ Gestión de Incidencias</h1>
		<p class="page-subtitle">Total: {allIncidents.length} incidencias registradas</p>
	</div>

	<!-- Grid de estadísticas -->
	<div class="stats-grid">
		<!-- Abiertas -->
		<Card class="stat-card">
			<div class="stat-content red">
				<div class="stat-number">{allIncidents.filter((i) => i.status === 'open').length}</div>
				<p class="stat-title">Abiertas</p>
				<p class="stat-subtitle">Sin resolver</p>
			</div>
		</Card>

		<!-- En proceso -->
		<Card class="stat-card">
			<div class="stat-content blue">
				<div class="stat-number">{allIncidents.filter((i) => i.status === 'in_progress').length}</div>
				<p class="stat-title">En Proceso</p>
				<p class="stat-subtitle">Siendo atendidas</p>
			</div>
		</Card>

		<!-- Resueltas -->
		<Card class="stat-card">
			<div class="stat-content emerald">
				<div class="stat-number">{allIncidents.filter((i) => i.status === 'resolved').length}</div>
				<p class="stat-title">Resueltas</p>
				<p class="stat-subtitle">Completadas</p>
			</div>
		</Card>
	</div>

	<!-- Filtros de estado -->
	<div class="filters-panel">
		<p class="filters-label">Filtrar por estado:</p>
		<div class="filters-buttons">
			{#each ['all', 'open', 'in_progress', 'resolved'] as status (status)}
				{@const count = status === 'all' ? allIncidents.length : allIncidents.filter((i) => i.status === status).length}
				{@const labels = { all: 'Todas', open: 'Abiertas', in_progress: 'En proceso', resolved: 'Resueltas' }}
				<button
					onclick={() => changeFilter(status)}
					class="filter-btn"
					class:active={statusFilter === status}
				>
					<span class="filter-text">{labels[status]}</span>
					<span class="filter-count">({count})</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Lista de incidencias -->
	{#if filteredIncidents.length === 0}
		<div class="empty-state">
			<p class="empty-message">✓ No hay incidencias con este filtro</p>
		</div>
	{:else}
		<div class="incidents-list">
			{#each filteredIncidents as incident (incident.id)}
				<Card class="incident-card">
					<!-- Header: Info general -->
					<div class="incident-header">
						<div class="incident-title-section">
							<p class="incident-label">Incidencia #{incident.id}</p>
							<p class="incident-type">{getIncidentType(incident.type)}</p>
						</div>

						<div class="incident-client-section">
							<p class="incident-label">Cliente</p>
							<p class="incident-client">{getClientName(incident.clientId)}</p>
						</div>

						<div class="incident-priority-section">
							<p class="incident-label">Prioridad</p>
							<div class="priority-badge">
								<span class="priority-icon">{getPriorityIcon(incident.priority)}</span>
								<Badge status={incident.priority} />
							</div>
						</div>
					</div>

					<!-- Body: Descripción -->
					<div class="incident-body">
						<p class="incident-label">Descripción</p>
						<p class="incident-description">{incident.description}</p>
					</div>

					<!-- Footer: Estado y acciones -->
					<div class="incident-footer">
						<div class="incident-status-section">
							<div class="status-info">
								<p class="incident-label">Estado</p>
								<Badge status={incident.status} />
							</div>
							<div class="status-dates">
								<p class="date-text">Reportado: {formatDate(incident.reportedAt)}</p>
								{#if incident.resolvedAt}
									<p class="date-text resolved">Resuelto: {formatDate(incident.resolvedAt)}</p>
								{/if}
							</div>
						</div>

						<div class="incident-action">
							{#if incident.status !== 'resolved'}
								<Button
									variant="primary"
									size="sm"
									onclick={() => changeIncidentStatus(incident.id, 'resolved')}
								>
									✓ Marcar resuelta
								</Button>
							{:else}
								<p class="status-resolved">Resuelta</p>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}

	<ConfirmDialog
		open={confirmResolveOpen}
		title="Resolver Incidencia"
		message="Se marcará esta incidencia como resuelta."
		confirmText="Sí, resolver"
		cancelText="Volver"
		variant="primary"
		onCancel={closeResolveConfirm}
		onConfirm={confirmResolveIncident}
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
	.stat-content.red .stat-number {
		color: #ef4444;
	}

	.stat-content.blue .stat-number {
		color: #3b82f6;
	}

	.stat-content.emerald .stat-number {
		color: #10b981;
	}

	/* ============================================
	 * PANEL DE FILTROS
	 * ============================================ */
	.filters-panel {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.filters-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #cbd5e1;
		margin: 0 0 1rem 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.filters-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.filter-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		background: #0f172a;
		color: #cbd5e1;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter-btn:hover {
		border-color: #475569;
		background: #1e293b;
	}

	.filter-btn.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: #ffffff;
		font-weight: 600;
	}

	.filter-text {
		display: inline-block;
	}

	.filter-count {
		display: inline-block;
		font-size: 0.85rem;
		opacity: 0.9;
	}

	/* ============================================
	 * ESTADO VACÍO
	 * ============================================ */
	.empty-state {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 3rem 1.5rem;
		text-align: center;
		margin-bottom: 2rem;
	}

	.empty-message {
		color: #94a3b8;
		font-size: 1rem;
		margin: 0;
	}

	/* ============================================
	 * LISTA DE INCIDENCIAS
	 * ============================================ */
	.incidents-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	:global(.incident-card) {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* Header de incidencia */
	.incident-header {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1.5rem;
		padding: 1.5rem;
		border-bottom: 1px solid #334155;
	}

	.incident-title-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.incident-client-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.incident-priority-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.incident-label {
		font-size: 0.8rem;
		color: #94a3b8;
		font-weight: 500;
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.incident-type {
		font-size: 1.1rem;
		font-weight: 600;
		color: #ef4444;
		margin: 0;
	}

	.incident-client {
		font-size: 0.95rem;
		color: #cbd5e1;
		font-weight: 500;
		margin: 0;
	}

	.priority-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.priority-icon {
		font-size: 1.25rem;
		line-height: 1;
	}

	/* Body: Descripción -->
	.incident-body {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #334155;
		background: #0f172a;
	}

	.incident-description {
		color: #cbd5e1;
		font-size: 0.95rem;
		margin: 0.5rem 0 0 0;
		line-height: 1.5;
	}

	/* Footer de incidencia */
	.incident-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.5rem;
		flex-wrap: wrap;
	}

	.incident-status-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.status-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.status-dates {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.date-text {
		font-size: 0.85rem;
		color: #94a3b8;
		margin: 0;
	}

	.date-text.resolved {
		color: #10b981;
		font-weight: 500;
	}

	.incident-action {
		display: flex;
		align-items: center;
	}

	.status-resolved {
		font-size: 0.9rem;
		font-weight: 600;
		color: #10b981;
		margin: 0;
		padding: 0.5rem 1rem;
	}

	/* ============================================
	 * RESPONSIVE
	 * ============================================ */
	@media (max-width: 1024px) {
		.page-root {
			padding: 1.5rem;
		}

		.stats-grid {
			grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		}

		.incident-header {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			gap: 1rem;
			padding: 1rem;
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

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-content {
			padding: 1.5rem 1rem;
		}

		.stat-number {
			font-size: 2.25rem;
		}

		.filters-buttons {
			gap: 0.5rem;
		}

		.filter-btn {
			padding: 0.5rem 0.75rem;
			font-size: 0.85rem;
		}

		.incident-header {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
			padding: 1rem;
		}

		.incident-footer {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.stat-content {
			padding: 1.25rem 1rem;
		}

		.stat-number {
			font-size: 2rem;
		}

		.page-title {
			font-size: 1.25rem;
		}

		.incident-header {
			grid-template-columns: 1fr;
			gap: 0.75rem;
			padding: 0.75rem;
		}

		.incident-body {
			padding: 1rem 0.75rem;
		}

		.incident-footer {
			padding: 0.75rem;
			gap: 1rem;
		}
	}
</style>
