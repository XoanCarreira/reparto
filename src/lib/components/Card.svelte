<!-- COMPONENTE: Tarjeta contenedor -->
<script>
	/**
	 * CARD CONTENEDOR
	 * Componente reutilizable para mostrar información en tarjetas
	 *
	 * Props:
	 * - title: título de la tarjeta (opcional)
	 * - noPadding: boolean - elimina el padding (default: false)
	 */
	let { title = '', noPadding = false, children } = $props();
</script>

<div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
	{#if title}
		<div class="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-200">
			<h3 class="text-lg font-semibold text-gray-800">{title}</h3>
		</div>
	{/if}

	<div class={noPadding ? '' : 'p-6'}>
		{@render children?.()}
	</div>
</div>

<style>
	/* Los estilos están en las clases tailwind */
</style>
