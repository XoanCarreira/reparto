<!-- COMPONENTE: Badge de estado -->
<script>
	/**
	 * BADGE DE ESTADO
	 * Muestra el estado con color y etiqueta
	 *
	 * Props:
	 * - status: estado del elemento ('pending', 'delivered', etc)
	 */

	import { getStatusColor, getStatusLabel } from '../utils/helpers.js';
	let { status = 'pending' } = $props();

	const colorClass = $derived(getStatusColor(status));
	const label = $derived(getStatusLabel(status));
</script>

<span class={`badge ${colorClass}`}>
	{label}
</span>

<style>
	.badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid transparent;
	}

	.badge.status-pending,
	.badge.status-medium {
		background: rgba(202, 138, 4, 0.25);
		color: #fde68a;
		border-color: rgba(202, 138, 4, 0.55);
	}

	.badge.status-delivered,
	.badge.status-resolved,
	.badge.status-active{
		background: rgba(5, 150, 105, 0.25);
		color: #6ee7b7;
		border-color: rgba(16, 185, 129, 0.55);
	}

	.badge.status-returned {
		background: rgba(217, 119, 6, 0.22);
		color: #fcd34d;
		border-color: rgba(217, 119, 6, 0.5);
	}

	.badge.status-cancelled,
	.badge.status-open,
	.badge.status-high,
	.badge.status-low {
		background: rgba(185, 28, 28, 0.25);
		color: #fca5a5;
		border-color: rgba(220, 38, 38, 0.55);
	}

	.badge.status-in-progress,
	.badge.status-on-delivery {
		background: rgba(30, 64, 175, 0.25);
		color: #93c5fd;
		border-color: rgba(37, 99, 235, 0.55);
	}

	.badge.status-off,
	.badge.status-default {
		background: rgba(51, 65, 85, 0.45);
		color: #cbd5e1;
		border-color: rgba(100, 116, 139, 0.6);
	}
</style>
