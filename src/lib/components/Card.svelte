<!-- COMPONENTE: Tarjeta contenedor -->
<script>
	/**
	 * CARD CONTENEDOR - Tema Oscuro
	 * Componente reutilizable para mostrar información en tarjetas
	 *
	 * Props:
	 * - title: título de la tarjeta (opcional)
	 * - className: clases CSS adicionales para el contenedor (opcional)
	 * - noPadding: boolean - elimina el padding (default: false)
	 */
	let { title = '', titleClass = '', class: className = '', noPadding = false, children } = $props();
</script>

<div
	class={`card ${className}`}
>
	{#if title}
		<div class="card-header">
			<h3 class="card-title {titleClass}">{title}</h3>
		</div>
	{/if}

	<div class={`card-body ${noPadding ? 'card-body-no-padding' : ''}`}>
		{@render children?.()}
	</div>
</div>

<style>
	.card {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		transition: border-color 0.2s ease;
	}

	.card:hover {
		border-color: #475569;
	}

	.card-header {
		background: linear-gradient(90deg, #1e293b, #334155);
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #334155;
	}

	.card-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #f1f5f9;
	}

	.card-body {
		padding: 1.5rem;
	}

	.card-body-no-padding {
		padding: 0;
	}

	@media (min-width: 640px) {
		.card-header {
			padding: 1.25rem 2rem;
		}

		.card-body {
			padding: 2rem;
		}
	}
</style>
