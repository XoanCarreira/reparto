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

<div class="space-y-6 animate-fadeIn">
	<!-- Encabezado -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">⚠️ Gestión de Incidencias</h1>
		<p class="text-gray-600 mt-2">Total: {allIncidents.length} incidencias registradas</p>
	</div>

	<!-- Estadísticas rápidas -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-red-600 mb-2">
					{allIncidents.filter((i) => i.status === 'open').length}
				</div>
				<p class="text-gray-600 font-medium">Abiertas (Sin resolver)</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-blue-600 mb-2">
					{allIncidents.filter((i) => i.status === 'in_progress').length}
				</div>
				<p class="text-gray-600 font-medium">En Proceso</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-4xl font-bold text-green-600 mb-2">
					{allIncidents.filter((i) => i.status === 'resolved').length}
				</div>
				<p class="text-gray-600 font-medium">Resueltas</p>
			</div>
		</Card>
	</div>

	<!-- Filtros -->
	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<p class="text-sm font-medium text-gray-700 mb-3">Filtrar por estado:</p>
		<div class="flex flex-wrap gap-2">
			{#each ['all', 'open', 'in_progress', 'resolved'] as status (status)}
				{@const count = status === 'all' ? allIncidents.length : allIncidents.filter((i) => i.status === status).length}
				{@const icons = { all: '📋', open: '🔴', in_progress: '🔵', resolved: '✅' }}
				<button
					onclick={() => changeFilter(status)}
					class={`px-4 py-2 rounded-lg font-medium transition-colors ${
						statusFilter === status
							? 'bg-blue-100 text-blue-700 border border-blue-300'
							: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
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
		<Card>
			<div class="text-center py-12">
				<p class="text-gray-500 text-lg">✓ No hay incidencias con este filtro</p>
			</div>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each filteredIncidents as incident (incident.id)}
				<Card>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Información general -->
						<div>
							<div class="mb-4">
								<p class="text-sm text-gray-600">Incidencia #{incident.id}</p>
								<p class="text-lg font-bold text-gray-900">
									{getIncidentType(incident.type)}
								</p>
							</div>

							<div class="mb-4">
								<p class="text-sm text-gray-600">Cliente</p>
								<p class="text-gray-900 font-medium">{getClientName(incident.clientId)}</p>
							</div>

							<div>
								<p class="text-sm text-gray-600">Descripción</p>
								<p class="text-gray-800 mt-1">{incident.description}</p>
							</div>
						</div>

						<!-- Estado y acciones -->
						<div>
							<div class="bg-gray-50 rounded-lg p-4 mb-4">
								<p class="text-sm text-gray-600 mb-2">Estado</p>
								<Badge status={incident.status} />
								<p class="text-sm text-gray-600 mt-3">Prioridad</p>
								<div class="flex items-center gap-2 mt-1">
									<span class="text-xl">{getPriorityIcon(incident.priority)}</span>
									<Badge status={incident.priority} />
								</div>
							</div>

							<div class="text-sm text-gray-600 mb-4">
								<p>Reportado: {formatDate(incident.reportedAt)}</p>
								{#if incident.resolvedAt}
									<p class="text-green-700 font-medium">Resuelto: {formatDate(incident.resolvedAt)}</p>
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
								<p class="text-center text-sm text-green-700 font-medium py-2">Incidencia resuelta</p>
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
