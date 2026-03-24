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
	import { incidentsStore } from '$lib/stores/dataStore.js';
	import { formatDate } from '$lib/utils/helpers.js';
	import { users } from '$lib/data/mockData.js';

	let statusFilter = $state('all'); // all, open, in_progress, resolved
	let allIncidents = $state([]);
	const filteredIncidents = $derived(
		allIncidents.filter((incident) => statusFilter === 'all' || incident.status === statusFilter)
	);

	// Se suscribe a incidencias
	incidentsStore.subscribe(($incidents) => {
		allIncidents = $incidents;
	});

	/**
	 * Obtiene el nombre del cliente
	 */
	function getClientName(clientId) {
		const client = users.find((u) => u.id === clientId);
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
			if (!confirm('¿Marcar esta incidencia como resuelta?')) return;
			incidentsStore.resolve(incidentId);
		}
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

	<!-- Estadísticas rápidas -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<Card class="glass-red">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-4xl fw-bold text-red-300 mb-2">
					{allIncidents.filter((i) => i.status === 'open').length}
				</div>
				<p class="txt-subtle fw-medium">Abiertas (Sin resolver)</p>
			</div>
		</Card>

		<Card class="glass-blue">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-4xl fw-bold text-blue-300 mb-2">
					{allIncidents.filter((i) => i.status === 'in_progress').length}
				</div>
				<p class="txt-subtle fw-medium">En Proceso</p>
			</div>
		</Card>

		<Card class="glass-emerald">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-4xl fw-bold text-emerald-300 mb-2">
					{allIncidents.filter((i) => i.status === 'resolved').length}
				</div>
				<p class="txt-subtle fw-medium">Resueltas</p>
			</div>
		</Card>
	</div>

	<!-- Filtros -->
	<div class="panel-surface radius-lg p-6">
		<p class="fs-sm fw-medium txt-subtle mb-3">Filtrar por estado:</p>
		<div class="flex flex-wrap gap-2">
			{#each ['all', 'open', 'in_progress', 'resolved'] as status (status)}
				{@const count = status === 'all' ? allIncidents.length : allIncidents.filter((i) => i.status === status).length}
				{@const icons = { all: '📋', open: '🔴', in_progress: '🔵', resolved: '✅' }}
				<button
					onclick={() => changeFilter(status)}
					class={`px-4 py-2 radius-lg fw-medium transition-colors ${
						statusFilter === status
							? 'bg-indigo-900/40 text-indigo-200 border border-indigo-500/50'
							: 'bg-panel txt-soft border bd-soft hover:bg-panel-soft'
					}`}
				>
					{icons[status] || status}
					{status === 'all' ? 'Todas' : status === 'open' ? 'Abiertas' : status === 'in_progress' ? 'En proceso' : 'Resueltas'}
					({count})
				</button>
			{/each}
		</div>
	</div>

	<!-- Lista de incidencias -->
	{#if filteredIncidents.length === 0}
		<Card class="glass-slate">
			<div class="text-center py-12">
				<p class="txt-muted fs-lg">✓ No hay incidencias con este filtro</p>
			</div>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredIncidents as incident (incident.id)}
				<Card class="glass-rose">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 radius-lg panel-surface-soft">
						<!-- Información general -->
						<div>
							<div class="mb-4">
								<p class="fs-sm txt-muted">Incidencia #{incident.id}</p>
								<p class="fs-lg fw-bold txt-primary">
									{getIncidentType(incident.type)}
								</p>
							</div>

							<div class="mb-4">
								<p class="fs-sm txt-muted">Cliente</p>
								<p class="txt-primary fw-medium">{getClientName(incident.clientId)}</p>
							</div>

							<div>
								<p class="fs-sm txt-muted">Descripción</p>
								<p class="txt-subtle mt-1">{incident.description}</p>
							</div>
						</div>

						<!-- Estado y acciones -->
						<div>
							<div class="panel-surface-soft radius-lg p-4 mb-4">
								<p class="fs-sm txt-muted mb-2">Estado</p>
								<Badge status={incident.status} />
								<p class="fs-sm txt-muted mt-3">Prioridad</p>
								<div class="flex items-center gap-2 mt-1">
									<span class="fs-xl">{getPriorityIcon(incident.priority)}</span>
									<Badge status={incident.priority} />
								</div>
							</div>

							<div class="fs-sm txt-muted mb-4">
								<p>Reportado: {formatDate(incident.reportedAt)}</p>
								{#if incident.resolvedAt}
									<p class="text-emerald-300 fw-medium">Resuelto: {formatDate(incident.resolvedAt)}</p>
								{/if}
							</div>

							{#if incident.status !== 'resolved'}
								<Button
									variant="primary"
									size="sm"
									class="w-full"
									onclick={() => changeIncidentStatus(incident.id, 'resolved')}
								>
									✓ Marcar como resuelta
								</Button>
							{:else}
								<p class="text-center fs-sm text-emerald-300 fw-medium py-2">Incidencia resuelta</p>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
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

	.animate-fadeIn {
		animation: fadeIn 0.5s ease-in-out;
	}
</style>
