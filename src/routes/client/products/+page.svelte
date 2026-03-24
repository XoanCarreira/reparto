<!-- PÁGINA: Catálogo Cliente -->
<script>
	/**
	 * PÁGINA DE CATÁLOGO
	 * Visualiza todos los productos disponibles
	 * Información detallada sobre cada uno
	 */

	import Card from '$lib/components/Card.svelte';
	import { productsStore } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';

	let allProducts = [];
	let selectedCategory = 'all';

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

<div class="space-y-6 animate-fadeIn">
	<!-- Encabezado -->
	<div>
		<h1 class="text-3xl font-bold text-gray-900">🛍️ Catálogo de Productos</h1>
		<p class="text-gray-600 mt-2">Explora nuestros productos disponibles</p>
	</div>

	<!-- Filtro por categoría -->
	{#if allProducts.length > 0}
		<div class="bg-white rounded-lg border border-gray-200 p-4 sticky top-0 z-10">
			<p class="text-sm font-medium text-gray-700 mb-3">Filtrar por categoría:</p>
			<div class="flex flex-wrap gap-2">
				<button
					onclick={() => (selectedCategory = 'all')}
					class={`px-4 py-2 rounded-lg font-medium transition-colors ${
						selectedCategory === 'all'
							? 'bg-blue-100 text-blue-700 border border-blue-300'
							: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
					}`}
				>
					Todos ({allProducts.length})
				</button>

				{#each getCategories() as category (category)}
					{@const count = allProducts.filter((p) => p.category === category).length}
					<button
						onclick={() => (selectedCategory = category)}
						class={`px-4 py-2 rounded-lg font-medium transition-colors ${
							selectedCategory === category
								? 'bg-blue-100 text-blue-700 border border-blue-300'
								: 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
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
			<Card>
				<div class="h-full flex flex-col">
					<!-- Encabezado del producto -->
					<div class="mb-4">
						<div class="flex justify-between items-start mb-2">
							<h3 class="text-lg font-bold text-gray-900 flex-1">{product.name}</h3>
							<span class={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ml-2 ${stockStatus.color}`}>
								{stockStatus.label}
							</span>
						</div>
						<p class="text-sm text-gray-600">{product.description}</p>
					</div>

					<!-- Info de stock -->
					<div class="bg-gray-50 rounded-lg p-3 mb-4">
						<div class="flex justify-between items-center">
							<div>
								<p class="text-xs text-gray-600">Stock disponible</p>
								<p class="text-lg font-bold text-gray-900">{product.stock}</p>
							</div>
							<div class="text-right">
								<p class="text-xs text-gray-600">Unidad</p>
								<p class="font-medium text-gray-900">{product.unit}</p>
							</div>
						</div>
					</div>

					<!-- Categoría y precio -->
					<div class="space-y-2 mb-4 flex-1">
						<div>
							<p class="text-xs text-gray-600">Categoría</p>
							<p class="text-sm font-medium text-gray-900">{product.category}</p>
						</div>
						<div class="bg-blue-50 rounded-lg p-3">
							<p class="text-xs text-gray-600">Precio por {product.unit}</p>
							<p class="text-2xl font-bold text-blue-600">{formatCurrency(product.price)}</p>
						</div>
					</div>

					<!-- Botón de agregar -->
					<div>
						<a
							href="/client/orders/new"
							class="block w-full text-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
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
		<Card>
			<div class="text-center py-12">
				<p class="text-gray-500 text-lg">No hay productos en esta categoría</p>
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
