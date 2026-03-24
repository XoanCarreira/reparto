<!-- PÁGINA: Catálogo Cliente -->
<script>
	/**
	 * PÁGINA DE CATÁLOGO
	 * Visualiza todos los productos disponibles
	 * Información detallada sobre cada uno
	 */

	import Card from '$lib/components/Card.svelte';
	import { resolve } from '$app/paths';
	import { productsStore } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';

	let allProducts = $state([]);
	let selectedCategory = $state('all');

	// Se suscribe a productos
	productsStore.subscribe(($products) => {
		allProducts = $products;
	});

	/**
	 * Obtiene todas las categorías únicas
	 */
	function getCategories() {
		const categories = [...new Set(allProducts.map((p) => p.category))];
		return categories;
	}

	/**
	 * Filtra productos por categoría
	 */
	function filteredProducts() {
		if (selectedCategory === 'all') {
			return allProducts;
		}
		return allProducts.filter((p) => p.category === selectedCategory);
	}

	/**
	 * Obtiene el indicador de stock disponible
	 */
	function getStockStatus(product) {
		if (product.stock === 0) return { label: 'Agotado', color: 'bg-red-100 text-red-700' };
		if (product.stock <= product.minStock) return { label: 'Bajo stock', color: 'bg-yellow-100 text-yellow-700' };
		return { label: 'Disponible', color: 'bg-green-100 text-green-700' };
	}
</script>

<svelte:head>
	<title>Catálogo - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<!-- Encabezado -->
	<div class="page-header">
		<h1 class="page-title">🛍️ Catálogo de Productos</h1>
		<p class="page-subtitle">Explora nuestros productos disponibles</p>
	</div>

	<!-- Filtro por categoría -->
	{#if allProducts.length > 0}
		<div class="panel-surface radius-lg p-4 sticky top-0 z-10">
			<p class="fs-sm fw-medium txt-subtle mb-3">Filtrar por categoría:</p>
			<div class="flex flex-wrap gap-2">
				<button
					onclick={() => (selectedCategory = 'all')}
					class={`px-4 py-2 radius-lg fw-medium transition-colors ${
						selectedCategory === 'all'
							? 'bg-blue-900/40 text-blue-200 border border-blue-500/50'
							: 'bg-panel txt-soft border bd-soft hover:bg-panel-soft'
					}`}
				>
					Todos ({allProducts.length})
				</button>

				{#each getCategories() as category (category)}
					{@const count = allProducts.filter((p) => p.category === category).length}
					<button
						onclick={() => (selectedCategory = category)}
						class={`px-4 py-2 radius-lg fw-medium transition-colors ${
							selectedCategory === category
								? 'bg-blue-900/40 text-blue-200 border border-blue-500/50'
								: 'bg-panel txt-soft border bd-soft hover:bg-panel-soft'
						}`}
					>
						{category} ({count})
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Grid de productos -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each filteredProducts() as product (product.id)}
			{@const stockStatus = getStockStatus(product)}
			<Card class="glass-slate">
				<div class="h-full flex flex-col">
					<!-- Encabezado del producto -->
					<div class="mb-4">
						<div class="flex justify-between items-start mb-2">
							<h3 class="fs-lg fw-bold txt-primary flex-1">{product.name}</h3>
							<span class={`text-xs fw-medium px-3 py-1 radius-full whitespace-nowrap ml-2 ${stockStatus.color}`}>
								{stockStatus.label}
							</span>
						</div>
						<p class="fs-sm txt-muted">{product.description}</p>
					</div>

					<!-- Info de stock -->
					<div class="panel-surface-soft radius-lg p-3 mb-4">
						<div class="flex justify-between items-center">
							<div>
								<p class="text-xs txt-muted">Stock disponible</p>
								<p class="fs-lg fw-bold txt-primary">{product.stock}</p>
							</div>
							<div class="text-right">
								<p class="text-xs txt-muted">Unidad</p>
								<p class="fw-medium txt-primary">{product.unit}</p>
							</div>
						</div>
					</div>

					<!-- Categoría y precio -->
					<div class="space-y-2 mb-4 flex-1">
						<div>
							<p class="text-xs txt-muted">Categoría</p>
							<p class="fs-sm fw-medium txt-primary">{product.category}</p>
						</div>
						<div class="panel-surface-soft radius-lg p-3">
							<p class="text-xs txt-muted">Precio por {product.unit}</p>
							<p class="fs-2xl fw-bold text-blue-300">{formatCurrency(product.price)}</p>
						</div>
					</div>

					<!-- Botón de agregar -->
					<div>
						<a
							href={resolve('/client/orders/new')}
							class="block w-full text-center px-4 py-2 panel-surface-soft text-blue-300 radius-lg hover:bg-panel-soft/70 transition-colors fw-medium fs-sm"
						>
							→ Agregar al pedido
						</a>
					</div>
				</div>
			</Card>
		{/each}
	</div>

	<!-- Sin productos -->
	{#if filteredProducts().length === 0}
		<Card class="glass-slate">
			<div class="text-center py-12">
				<p class="txt-muted fs-lg">No hay productos en esta categoría</p>
			</div>
		</Card>
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
