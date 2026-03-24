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

<span class={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
	{label}
</span>
