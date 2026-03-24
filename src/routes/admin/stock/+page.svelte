<!-- PAGINA: Stock Admin -->
<script>
	/**
	 * Gestion completa de inventario:
	 * - Tabla editable de productos
	 * - Filtro para mostrar solo productos con stock
	 * - Entradas y salidas de stock por producto
	 * - Alta de nuevos productos
	 */

	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import { productsStore, lowStockProducts } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';

	let allProducts = $state([]);
	let editableProducts = $state([]);
	let stockMovements = $state({});
	let showOnlyInStock = $state(false);
	let searchTerm = $state('');
	let showCreateForm = $state(false);
	let editingProductId = $state(null);
	let newProduct = $state({
		name: '',
		category: '',
		unit: 'unidad',
		stock: 0,
		minStock: 0,
		price: 0,
		description: ''
	});

	productsStore.subscribe(($products) => {
		allProducts = $products;
		editableProducts = $products.map((product) => ({ ...product }));
		if (editingProductId !== null && !$products.some((product) => product.id === editingProductId)) {
			editingProductId = null;
		}
		stockMovements = $products.reduce((acc, product) => {
			acc[product.id] = stockMovements[product.id] || { incoming: 0, outgoing: 0 };
			return acc;
		}, {});
	});

	const filteredProducts = $derived(
		editableProducts.filter((product) => {
			const query = searchTerm.trim().toLowerCase();
			const matchesSearch =
				query.length === 0 ||
				product.name.toLowerCase().includes(query) ||
				product.category.toLowerCase().includes(query) ||
				product.description.toLowerCase().includes(query);
			const matchesStock = !showOnlyInStock || Number(product.stock) > 0;
			return matchesSearch && matchesStock;
		})
	);

	const totalStock = $derived(
		allProducts.reduce((total, product) => total + (Number(product.stock) || 0), 0)
	);

	const totalInventoryValue = $derived(
		allProducts.reduce(
			(total, product) => total + (Number(product.stock) || 0) * (Number(product.price) || 0),
			0
		)
	);

	const productsWithStock = $derived(allProducts.filter((product) => Number(product.stock) > 0).length);

	function updateDraft(productId, key, value) {
		editableProducts = editableProducts.map((product) =>
			product.id === productId ? { ...product, [key]: value } : product
		);
	}

	function parseNonNegativeInt(value) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) {
			return 0;
		}
		return Math.max(0, parsed);
	}

	function parseNonNegativeFloat(value) {
		const parsed = Number.parseFloat(value);
		if (Number.isNaN(parsed)) {
			return 0;
		}
		return Math.max(0, Number(parsed.toFixed(2)));
	}

	function saveProduct(productId) {
		const draft = editableProducts.find((product) => product.id === productId);
		if (!draft) {
			return;
		}

		productsStore.updateProduct(productId, {
			name: String(draft.name || '').trim(),
			category: String(draft.category || '').trim(),
			unit: String(draft.unit || '').trim(),
			description: String(draft.description || '').trim(),
			stock: parseNonNegativeInt(draft.stock),
			minStock: parseNonNegativeInt(draft.minStock),
			price: parseNonNegativeFloat(draft.price)
		});

		editingProductId = null;
	}

	function startProductEdit(productId) {
		const source = allProducts.find((product) => product.id === productId);
		if (!source) {
			return;
		}

		editableProducts = editableProducts.map((product) =>
			product.id === productId ? { ...source } : product
		);
		editingProductId = productId;
	}

	function cancelProductEdit(productId) {
		const source = allProducts.find((product) => product.id === productId);
		if (!source) {
			editingProductId = null;
			return;
		}

		editableProducts = editableProducts.map((product) =>
			product.id === productId ? { ...source } : product
		);
		editingProductId = null;
	}

	function updateMovement(productId, type, value) {
		const current = stockMovements[productId] || { incoming: 0, outgoing: 0 };
		stockMovements = {
			...stockMovements,
			[productId]: {
				...current,
				[type]: parseNonNegativeInt(value)
			}
		};
	}

	function registerIncoming(productId) {
		const quantity = parseNonNegativeInt(stockMovements[productId]?.incoming);
		if (quantity <= 0) {
			return;
		}

		productsStore.increaseStock(productId, quantity);
		updateMovement(productId, 'incoming', 0);
	}

	function registerOutgoing(productId) {
		const quantity = parseNonNegativeInt(stockMovements[productId]?.outgoing);
		if (quantity <= 0) {
			return;
		}

		productsStore.decreaseStock(productId, quantity);
		updateMovement(productId, 'outgoing', 0);
	}

	function toggleCreateForm() {
		showCreateForm = !showCreateForm;
	}

	function resetNewProductForm() {
		newProduct = {
			name: '',
			category: '',
			unit: 'unidad',
			stock: 0,
			minStock: 0,
			price: 0,
			description: ''
		};
	}

	function cancelCreateProduct() {
		resetNewProductForm();
		showCreateForm = false;
	}

	function createProduct() {
		if (!String(newProduct.name || '').trim()) {
			return;
		}

		productsStore.create({
			name: newProduct.name,
			category: newProduct.category,
			unit: newProduct.unit,
			stock: newProduct.stock,
			minStock: newProduct.minStock,
			price: newProduct.price,
			description: newProduct.description
		});

		cancelCreateProduct();
	}
</script>

<svelte:head>
	<title>Stock - Admin - Reparto</title>
</svelte:head>

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header">
		<h1 class="page-title">📋 Gestión de Stock</h1>
		<p class="page-subtitle">Control total de inventario y parámetros de producto</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<Card class="glass-blue">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-3xl fw-bold text-blue-300 mb-1">{totalStock}</div>
				<p class="txt-subtle fw-medium">Unidades Totales</p>
			</div>
		</Card>

		<Card class="glass-emerald">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-2xl fw-bold text-emerald-300 mb-1">{formatCurrency(totalInventoryValue)}</div>
				<p class="txt-subtle fw-medium">Valor Inventario</p>
			</div>
		</Card>

		<Card class="glass-violet">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-3xl fw-bold text-violet-300 mb-1">{productsWithStock}</div>
				<p class="txt-subtle fw-medium">Productos Con Stock</p>
			</div>
		</Card>

		<Card class="glass-red">
			<div class="text-center py-6 px-4 radius-lg panel-surface-soft">
				<div class="fs-3xl fw-bold text-red-300 mb-1">{$lowStockProducts.length}</div>
				<p class="txt-subtle fw-medium">Bajo Stock</p>
			</div>
		</Card>
	</div>

	<Card
		title="⚙️ Herramientas de Inventario"
		titleClass="text-blue-300"
		class="glass-blue"
	>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<label for="stock-search" class="block fs-sm fw-medium txt-subtle mb-1">Buscar producto</label>
				<input
					id="stock-search"
					type="text"
					value={searchTerm}
					oninput={(e) => (searchTerm = e.currentTarget.value)}
					placeholder="Nombre, categoria o descripcion"
					class="w-full border bd-soft bg-panel txt-primary rounded px-3 py-2"
				/>
			</div>

			<div class="flex items-end">
				<label class="inline-flex items-center gap-2 fs-sm txt-soft">
					<input
						type="checkbox"
						checked={showOnlyInStock}
						onchange={(e) => (showOnlyInStock = e.currentTarget.checked)}
					/>
					Mostrar solo productos con stock
				</label>
			</div>

			<div class="flex items-end justify-start md:justify-end">
				<Button variant="primary" size="sm" onclick={toggleCreateForm}>
					{showCreateForm ? 'Cerrar alta de producto' : 'Nuevo producto'}
				</Button>
			</div>
		</div>

		{#if showCreateForm}
			<div class="mt-5 radius-lg p-4 panel-surface-soft">
				<p class="fw-semibold text-blue-200 mb-3">Alta de producto</p>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<input
						type="text"
						placeholder="Nombre"
						value={newProduct.name}
						oninput={(e) => (newProduct = { ...newProduct, name: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Categoria"
						value={newProduct.category}
						oninput={(e) => (newProduct = { ...newProduct, category: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Unidad"
						value={newProduct.unit}
						oninput={(e) => (newProduct = { ...newProduct, unit: e.currentTarget.value })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="number"
						min="0"
						placeholder="Stock inicial"
						value={newProduct.stock}
						oninput={(e) => (newProduct = { ...newProduct, stock: parseNonNegativeInt(e.currentTarget.value) })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="number"
						min="0"
						placeholder="Stock minimo"
						value={newProduct.minStock}
						oninput={(e) =>
							(newProduct = { ...newProduct, minStock: parseNonNegativeInt(e.currentTarget.value) })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
					<input
						type="number"
						min="0"
						step="0.01"
						placeholder="Precio"
						value={newProduct.price}
						oninput={(e) =>
							(newProduct = { ...newProduct, price: parseNonNegativeFloat(e.currentTarget.value) })}
						class="border bd-soft bg-panel txt-primary rounded px-3 py-2"
					/>
				</div>
				<textarea
					placeholder="Descripcion"
					value={newProduct.description}
					oninput={(e) => (newProduct = { ...newProduct, description: e.currentTarget.value })}
					class="mt-3 w-full border bd-soft bg-panel txt-primary rounded px-3 py-2"
					rows="2"
				></textarea>
				<div class="mt-3 flex gap-2">
					<Button variant="primary" size="sm" onclick={createProduct}>Crear producto</Button>
					<Button variant="secondary" size="sm" onclick={cancelCreateProduct}>Cancelar</Button>
				</div>
			</div>
		{/if}
	</Card>

	<Card
		title="📦 Tabla de Productos (Editable)"
		titleClass="text-violet-300"
		class="glass-violet"
	>
		{#if filteredProducts.length === 0}
			<p class="txt-muted text-center py-8">No hay productos para los filtros aplicados.</p>
		{:else}
			<div class="overflow-x-auto radius-lg panel-surface-soft">
				<table class="w-full fs-sm min-w-[1200px]">
					<thead>
						<tr class="border-b-2 bd-mid bg-slate-900/40 txt-subtle">
							<th class="text-left py-3 px-3 fw-semibold">Producto</th>
							<th class="text-left py-3 px-3 fw-semibold">Categoria</th>
							<th class="text-left py-3 px-3 fw-semibold">Unidad</th>
							<th class="text-right py-3 px-3 fw-semibold">Stock</th>
							<th class="text-right py-3 px-3 fw-semibold">Min.</th>
							<th class="text-right py-3 px-3 fw-semibold">Precio</th>
							<th class="text-left py-3 px-3 fw-semibold">Descripcion</th>
							<th class="text-center py-3 px-3 fw-semibold">Estado</th>
							<th class="text-center py-3 px-3 fw-semibold">Entrante</th>
							<th class="text-center py-3 px-3 fw-semibold">Saliente</th>
							<th class="text-center py-3 px-3 fw-semibold">Accion</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredProducts as product (product.id)}
							{@const rowEditing = editingProductId === product.id}
							<tr class="border-b bd-strong hover:bg-panel/30 align-top">
								<td class="py-2 px-3">
									{#if rowEditing}
										<input
											type="text"
											value={product.name}
											oninput={(e) => updateDraft(product.id, 'name', e.currentTarget.value)}
											class="w-44 border bd-soft bg-panel txt-primary rounded px-2 py-1"
										/>
									{:else}
										<p class="w-44 truncate fw-medium txt-primary">{product.name}</p>
									{/if}
								</td>
								<td class="py-2 px-3">
									{#if rowEditing}
										<input
											type="text"
											value={product.category}
											oninput={(e) => updateDraft(product.id, 'category', e.currentTarget.value)}
											class="w-32 border bd-soft bg-panel txt-primary rounded px-2 py-1"
										/>
									{:else}
										<span class="txt-soft">{product.category}</span>
									{/if}
								</td>
								<td class="py-2 px-3">
									{#if rowEditing}
										<input
											type="text"
											value={product.unit}
											oninput={(e) => updateDraft(product.id, 'unit', e.currentTarget.value)}
											class="w-24 border bd-soft bg-panel txt-primary rounded px-2 py-1"
										/>
									{:else}
										<span class="txt-soft">{product.unit}</span>
									{/if}
								</td>
								<td class="py-2 px-3 text-right">
									{#if rowEditing}
										<input
											type="number"
											min="0"
											value={product.stock}
											oninput={(e) => updateDraft(product.id, 'stock', e.currentTarget.value)}
											class="w-20 border bd-soft bg-panel txt-primary rounded px-2 py-1 text-right"
										/>
									{:else}
										<span class="fw-medium txt-primary">{product.stock}</span>
									{/if}
								</td>
								<td class="py-2 px-3 text-right">
									{#if rowEditing}
										<input
											type="number"
											min="0"
											value={product.minStock}
											oninput={(e) => updateDraft(product.id, 'minStock', e.currentTarget.value)}
											class="w-20 border bd-soft bg-panel txt-primary rounded px-2 py-1 text-right"
										/>
									{:else}
										<span class="txt-soft">{product.minStock}</span>
									{/if}
								</td>
								<td class="py-2 px-3 text-right">
									{#if rowEditing}
										<input
											type="number"
											min="0"
											step="0.01"
											value={product.price}
											oninput={(e) => updateDraft(product.id, 'price', e.currentTarget.value)}
											class="w-24 border bd-soft bg-panel txt-primary rounded px-2 py-1 text-right"
										/>
									{:else}
										<span class="txt-soft">{formatCurrency(Number(product.price) || 0)}</span>
									{/if}
									<p class="text-xs text-blue-300 mt-1">
										{formatCurrency((Number(product.price) || 0) * (Number(product.stock) || 0))}
									</p>
								</td>
								<td class="py-2 px-3">
									{#if rowEditing}
										<textarea
											rows="2"
											value={product.description}
											oninput={(e) => updateDraft(product.id, 'description', e.currentTarget.value)}
											class="w-52 border bd-soft bg-panel txt-primary rounded px-2 py-1"
										></textarea>
									{:else}
										<p class="w-52 txt-soft">{product.description || '-'}</p>
									{/if}
								</td>
								<td class="py-2 px-3 text-center">
									<Badge status={Number(product.stock) <= Number(product.minStock) ? 'low' : 'ok'} />
								</td>
								<td class="py-2 px-3 text-center">
									<div class="flex items-center gap-2 justify-center">
										<input
											type="number"
											min="0"
											value={stockMovements[product.id]?.incoming || 0}
											oninput={(e) => updateMovement(product.id, 'incoming', e.currentTarget.value)}
											class="w-20 border bd-soft bg-panel txt-primary rounded px-2 py-1 text-right"
										/>
										<button
											type="button"
											onclick={() => registerIncoming(product.id)}
											class="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
										>
											+
										</button>
									</div>
								</td>
								<td class="py-2 px-3 text-center">
									<div class="flex items-center gap-2 justify-center">
										<input
											type="number"
											min="0"
											value={stockMovements[product.id]?.outgoing || 0}
											oninput={(e) => updateMovement(product.id, 'outgoing', e.currentTarget.value)}
											class="w-20 border bd-soft bg-panel txt-primary rounded px-2 py-1 text-right"
										/>
										<button
											type="button"
											onclick={() => registerOutgoing(product.id)}
											class="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
										>
											-
										</button>
									</div>
								</td>
								<td class="py-2 px-3 text-center">
									{#if rowEditing}
										<div class="flex items-center justify-center gap-2">
											<Button variant="primary" size="sm" onclick={() => saveProduct(product.id)}>
												Guardar
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onclick={() => cancelProductEdit(product.id)}
											>
												Cancelar
											</Button>
										</div>
									{:else}
										<Button variant="secondary" size="sm" onclick={() => startProductEdit(product.id)}>
											Editar
										</Button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
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
