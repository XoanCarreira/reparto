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
		if (product.stock === 0) return { label: 'Agotado', tone: 'danger' };
		if (product.stock <= product.minStock) return { label: 'Bajo stock', tone: 'warning' };
		return { label: 'Disponible', tone: 'success' };
	}
</script>

<svelte:head>
	<title>Catálogo - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header">
		<h1 class="page-title">🛍️ Catalogo de Productos</h1>
		<p class="page-subtitle">Explora nuestros productos disponibles</p>
	</div>

	{#if allProducts.length > 0}
		<div class="filters-panel">
			<p class="filters-label">Filtrar por categoria:</p>
			<div class="filters-list">
				<button
					onclick={() => (selectedCategory = 'all')}
					class={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
				>
					Todos ({allProducts.length})
				</button>

				{#each getCategories() as category (category)}
					{@const count = allProducts.filter((p) => p.category === category).length}
					<button
						onclick={() => (selectedCategory = category)}
						class={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
					>
						{category} ({count})
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="products-grid">
		{#each filteredProducts() as product (product.id)}
			{@const stockStatus = getStockStatus(product)}
			<div class="product-card">
				<div class="product-header">
					<h3 class="product-name">{product.name}</h3>
					<span class={`stock-badge ${stockStatus.tone}`}>{stockStatus.label}</span>
				</div>
				<p class="product-description">{product.description}</p>

				<div class="product-stock-box">
					<div>
						<p class="meta-label">Stock disponible</p>
						<p class="meta-value">{product.stock}</p>
					</div>
					<div class="align-right">
						<p class="meta-label">Unidad</p>
						<p class="meta-value">{product.unit}</p>
					</div>
				</div>

				<div class="product-meta">
					<div>
						<p class="meta-label">Categoria</p>
						<p class="meta-value">{product.category}</p>
					</div>
					<div class="product-price-box">
						<p class="meta-label">Precio por {product.unit}</p>
						<p class="product-price">{formatCurrency(product.price)}</p>
					</div>
				</div>

				<a href={resolve('/client/orders/new')} class="add-order-link">Agregar al pedido</a>
			</div>
		{/each}
	</div>

	{#if filteredProducts().length === 0}
		<Card class="card-section">
			<div class="empty-state">
				<p>No hay productos en esta categoria</p>
			</div>
		</Card>
	{/if}
</div>

<style>
	.page-root {
		width: 100%;
		padding: 1.5rem;
		background: #0f172a;
		color: #cbd5e1;
	}

	.page-header {
		margin-bottom: 1.25rem;
	}

	.page-title {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.page-subtitle {
		margin: 0.5rem 0 0;
		font-size: 0.95rem;
		color: #94a3b8;
	}

	.filters-panel {
		position: sticky;
		top: 0;
		z-index: 10;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.filters-label {
		margin: 0 0 0.65rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.filters-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-btn {
		padding: 0.45rem 0.75rem;
		border-radius: 0.4rem;
		border: 1px solid #334155;
		background: #0f172a;
		color: #cbd5e1;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter-btn:hover {
		border-color: #475569;
		background: #172337;
	}

	.filter-btn.active {
		border-color: #3b82f6;
		background: rgba(37, 99, 235, 0.2);
		color: #bfdbfe;
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1rem;
	}

	.product-card {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1rem;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
	}

	.product-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.7rem;
	}

	.product-name {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.stock-badge {
		padding: 0.22rem 0.6rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.stock-badge.success {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.stock-badge.warning {
		background: rgba(245, 158, 11, 0.2);
		color: #fcd34d;
	}

	.stock-badge.danger {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
	}

	.product-description {
		margin: 0;
		font-size: 0.85rem;
		color: #94a3b8;
		line-height: 1.35;
	}

	.product-stock-box,
	.product-price-box {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		padding: 0.75rem;
	}

	.product-stock-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.product-meta {
		display: grid;
		gap: 0.6rem;
		flex: 1;
	}

	.meta-label {
		margin: 0;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.meta-value {
		margin: 0.25rem 0 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: #f1f5f9;
	}

	.product-price {
		margin: 0.25rem 0 0;
		font-size: 1.2rem;
		font-weight: 700;
		color: #60a5fa;
	}

	.align-right {
		text-align: right;
	}

	.add-order-link {
		display: block;
		padding: 0.58rem 0.8rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		text-align: center;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.85rem;
		color: #93c5fd;
		transition: all 0.2s ease;
	}

	.add-order-link:hover {
		border-color: #3b82f6;
		background: #172337;
	}

	.card-section {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.empty-state {
		padding: 1rem;
		text-align: center;
		color: #94a3b8;
	}

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

	.full-width-desktop {
		width: 100%;
	}

	@media (min-width: 768px) {
		.products-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.products-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.page-root {
			padding: 1rem;
		}

		.page-title {
			font-size: 1.6rem;
		}
	}
</style>
