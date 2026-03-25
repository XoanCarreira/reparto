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
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { productsStore, lowStockProducts } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';

	let allProducts = $state([]);
	let editableProducts = $state([]);
	let stockMovements = $state({});
	let showOnlyInStock = $state(false);
	let searchTerm = $state('');
	let showCreateForm = $state(false);
	let editingProductId = $state(null);
	let showDeleteProductConfirm = $state(false);
	let pendingDeleteProduct = $state(null);
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

	function requestDeleteProduct(productId, productName) {
		pendingDeleteProduct = { id: productId, name: productName };
		showDeleteProductConfirm = true;
	}

	function closeDeleteProductConfirm() {
		showDeleteProductConfirm = false;
		pendingDeleteProduct = null;
	}

	function confirmDeleteProduct() {
		if (!pendingDeleteProduct) {
			return;
		}

		productsStore.remove(pendingDeleteProduct.id);
		if (editingProductId === pendingDeleteProduct.id) {
			editingProductId = null;
		}
		closeDeleteProductConfirm();
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

	<!-- Grid de estadísticas -->
	<div class="stats-grid">
		<!-- Total de unidades -->
		<Card class="stat-card">
			<div class="stat-content blue">
				<div class="stat-number">{totalStock}</div>
				<p class="stat-title">Unidades Totales</p>
				<p class="stat-subtitle">En inventario</p>
			</div>
		</Card>

		<!-- Valor total del inventario -->
		<Card class="stat-card">
			<div class="stat-content emerald">
				<div class="stat-number">
					{#if totalInventoryValue > 999999}
						{(totalInventoryValue / 1000000).toFixed(1)}M
					{:else if totalInventoryValue > 999}
						{(totalInventoryValue / 1000).toFixed(0)}k
					{:else}
						{totalInventoryValue.toFixed(0)}
					{/if}
				</div>
				<p class="stat-title">Valor Inventario</p>
				<p class="stat-subtitle">{formatCurrency(totalInventoryValue)}</p>
			</div>
		</Card>

		<!-- Productos con stock -->
		<Card class="stat-card">
			<div class="stat-content violet">
				<div class="stat-number">{productsWithStock}</div>
				<p class="stat-title">Con Stock</p>
				<p class="stat-subtitle">De {allProducts.length} totales</p>
			</div>
		</Card>

		<!-- Stock bajo -->
		<Card class="stat-card">
			<div class="stat-content red">
				<div class="stat-number">{$lowStockProducts.length}</div>
				<p class="stat-title">Bajo Stock</p>
				<p class="stat-subtitle">Requieren input</p>
			</div>
		</Card>
	</div>

	<Card title="⚙️ Herramientas de Inventario" titleClass="title-blue" class="card-section">
		<!-- Filtros y búsqueda -->
		<div class="tools-grid">
			<div class="tool-group">
				<label for="stock-search" class="filter-label">Buscar producto</label>
				<input
					id="stock-search"
					type="text"
					value={searchTerm}
					oninput={(e) => (searchTerm = e.currentTarget.value)}
					placeholder="Nombre, categoría o descripción"
					class="filter-input"
				/>
			</div>

			<div class="tool-group checkbox-group">
				<label class="checkbox-label">
					<input
						type="checkbox"
						checked={showOnlyInStock}
						onchange={(e) => (showOnlyInStock = e.currentTarget.checked)}
						class="checkbox-input"
					/>
					<span>Solo con stock</span>
				</label>
			</div>

			<div class="tool-group">
				<Button variant="primary" size="sm" onclick={toggleCreateForm}>
					{showCreateForm ? '✕ Cerrar' : '+ Nuevo producto'}
				</Button>
			</div>
		</div>

		<!-- Formulario de nuevo producto -->
		{#if showCreateForm}
			<div class="create-form-section">
				<p class="form-title">Alta de Nuevo Producto</p>
				
				<div class="form-grid form-grid-6">
					<input
						type="text"
						placeholder="Nombre"
						value={newProduct.name}
						oninput={(e) => (newProduct = { ...newProduct, name: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Categoría"
						value={newProduct.category}
						oninput={(e) => (newProduct = { ...newProduct, category: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="text"
						placeholder="Unidad"
						value={newProduct.unit}
						oninput={(e) => (newProduct = { ...newProduct, unit: e.currentTarget.value })}
						class="form-input"
					/>
					<input
						type="number"
						min="0"
						placeholder="Stock inicial"
						value={newProduct.stock}
						oninput={(e) => (newProduct = { ...newProduct, stock: parseNonNegativeInt(e.currentTarget.value) })}
						class="form-input"
					/>
					<input
						type="number"
						min="0"
						placeholder="Stock mínimo"
						value={newProduct.minStock}
						oninput={(e) =>
							(newProduct = { ...newProduct, minStock: parseNonNegativeInt(e.currentTarget.value) })}
						class="form-input"
					/>
					<input
						type="number"
						min="0"
						step="0.01"
						placeholder="Precio"
						value={newProduct.price}
						oninput={(e) =>
							(newProduct = { ...newProduct, price: parseNonNegativeFloat(e.currentTarget.value) })}
						class="form-input"
					/>
				</div>

				<textarea
					placeholder="Descripción (opcional)"
					value={newProduct.description}
					oninput={(e) => (newProduct = { ...newProduct, description: e.currentTarget.value })}
					class="form-textarea"
					rows="2"
				></textarea>

				<div class="form-actions">
					<Button variant="primary" size="sm" onclick={createProduct}>Crear producto</Button>
					<Button variant="secondary" size="sm" onclick={cancelCreateProduct}>Cancelar</Button>
				</div>
			</div>
		{/if}
	</Card>

	<Card title="📦 Tabla de Productos" titleClass="title-violet" class="card-section">
		{#if filteredProducts.length === 0}
			<div class="empty-state">
				<p class="empty-message">No hay productos para los filtros aplicados.</p>
			</div>
		{:else}
			<div class="table-wrapper">
				<table class="products-table">
					<thead>
						<tr>
							<th>Producto</th>
							<th>Categoría</th>
							<th>Unidad</th>
							<th class="align-right">Stock</th>
							<th class="align-right">Mín.</th>
							<th class="align-right">Precio</th>
							<th>Descripción</th>
							<th class="align-center">Estado</th>
							<th class="align-center">Entrante</th>
							<th class="align-center">Saliente</th>
							<th class="align-center">Acción</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredProducts as product (product.id)}
							{@const rowEditing = editingProductId === product.id}
							<tr class="table-row" class:editing={rowEditing}>
								<!-- Nombre -->
								<td class="product-name">
									{#if rowEditing}
										<input
											type="text"
											value={product.name}
											oninput={(e) => updateDraft(product.id, 'name', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										<span>{product.name}</span>
									{/if}
								</td>

								<!-- Categoría -->
								<td class="product-category">
									{#if rowEditing}
										<input
											type="text"
											value={product.category}
											oninput={(e) => updateDraft(product.id, 'category', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										<span>{product.category}</span>
									{/if}
								</td>

								<!-- Unidad -->
								<td class="product-unit">
									{#if rowEditing}
										<input
											type="text"
											value={product.unit}
											oninput={(e) => updateDraft(product.id, 'unit', e.currentTarget.value)}
											class="table-input"
										/>
									{:else}
										<span>{product.unit}</span>
									{/if}
								</td>

								<!-- Stock -->
								<td class="align-right">
									{#if rowEditing}
										<input
											type="number"
											min="0"
											value={product.stock}
											oninput={(e) => updateDraft(product.id, 'stock', e.currentTarget.value)}
											class="table-input align-right"
										/>
									{:else}
										<span>{product.stock}</span>
									{/if}
								</td>

								<!-- Stock mínimo -->
								<td class="align-right">
									{#if rowEditing}
										<input
											type="number"
											min="0"
											value={product.minStock}
											oninput={(e) => updateDraft(product.id, 'minStock', e.currentTarget.value)}
											class="table-input align-right"
										/>
									{:else}
										<span>{product.minStock}</span>
									{/if}
								</td>

								<!-- Precio -->
								<td class="price-cell">
									{#if rowEditing}
										<input
											type="number"
											min="0"
											step="0.01"
											value={product.price}
											oninput={(e) => updateDraft(product.id, 'price', e.currentTarget.value)}
											class="table-input align-right"
										/>
									{:else}
										<div class="price-display">
											<span class="price-main">{formatCurrency(Number(product.price) || 0)}</span>
											<span class="price-total">{formatCurrency((Number(product.price) || 0) * (Number(product.stock) || 0))}</span>
										</div>
									{/if}
								</td>

								<!-- Descripción -->
								<td class="product-desc">
									{#if rowEditing}
										<textarea
											rows="2"
											value={product.description}
											oninput={(e) => updateDraft(product.id, 'description', e.currentTarget.value)}
											class="table-textarea"
										></textarea>
									{:else}
										<span>{product.description || '-'}</span>
									{/if}
								</td>

								<!-- Estado -->
								<td class="align-center">
									<Badge status={Number(product.stock) <= Number(product.minStock) ? 'low' : 'ok'} />
								</td>

								<!-- Entrada de stock -->
								<td class="align-center">
									<div class="movement-group">
										<input
											type="number"
											min="0"
											value={stockMovements[product.id]?.incoming || 0}
											oninput={(e) => updateMovement(product.id, 'incoming', e.currentTarget.value)}
											class="table-input-sm"
										/>
										<button
											type="button"
											onclick={() => registerIncoming(product.id)}
											class="movement-btn incoming"
										>
											+
										</button>
									</div>
								</td>

								<!-- Salida de stock -->
								<td class="align-center">
									<div class="movement-group">
										<input
											type="number"
											min="0"
											value={stockMovements[product.id]?.outgoing || 0}
											oninput={(e) => updateMovement(product.id, 'outgoing', e.currentTarget.value)}
											class="table-input-sm"
										/>
										<button
											type="button"
											onclick={() => registerOutgoing(product.id)}
											class="movement-btn outgoing"
										>
											-
										</button>
									</div>
								</td>

								<!-- Acciones -->
								<td class="align-center">
									{#if rowEditing}
										<div class="action-buttons">
											<Button variant="primary" size="sm" onclick={() => saveProduct(product.id)}>
												Guardar
											</Button>
											<Button variant="secondary" size="sm" onclick={() => cancelProductEdit(product.id)}>
												Cancelar
											</Button>
											<Button variant="danger" size="sm" onclick={() => requestDeleteProduct(product.id, product.name)}>
												Eliminar
											</Button>
										</div>
									{:else}
										<div class="action-buttons">
											<Button variant="secondary" size="sm" onclick={() => startProductEdit(product.id)}>
												Editar
											</Button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>

	<ConfirmDialog
		open={showDeleteProductConfirm}
		title="Eliminar Producto"
		message={`Se eliminará ${pendingDeleteProduct?.name || 'este producto'}. Esta acción no se puede deshacer.`}
		confirmText="Sí, eliminar"
		cancelText="Cancelar"
		variant="danger"
		onCancel={closeDeleteProductConfirm}
		onConfirm={confirmDeleteProduct}
	/>
</div>

<style>
	/* ============================================
	 * ANIMACIONES
	 * ============================================ */
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

	/* ============================================
	 * ESTRUCTURA GENERAL
	 * ============================================ */
	.page-root {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.3px;
	}

	.page-subtitle {
		font-size: 1rem;
		color: #cbd5e1;
		margin: 0;
		font-weight: 400;
	}

	/* ============================================
	 * GRID DE ESTADÍSTICAS
	 * ============================================ */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	:global(.stat-card) {
		height: 100%;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		border-radius: 0.5rem;
		background: #1e293b;
		border: 1px solid #334155;
		transition: all 0.2s ease;
	}

	.stat-content:hover {
		border-color: #475569;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.stat-number {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	.stat-title {
		font-size: 0.95rem;
		color: #cbd5e1;
		margin: 0 0 0.5rem 0;
		font-weight: 500;
	}

	.stat-subtitle {
		font-size: 0.85rem;
		color: #94a3b8;
		margin: 0;
	}

	/* Colores por tarjeta */
	.stat-content.blue .stat-number {
		color: #3b82f6;
	}

	.stat-content.emerald .stat-number {
		color: #10b981;
	}

	.stat-content.red .stat-number {
		color: #ef4444;
	}

	.stat-content.violet .stat-number {
		color: #8b5cf6;
	}

	/* ============================================
	 * CARD SECTION
	 * ============================================ */
	:global(.card-section) {
		margin-bottom: 2rem;
		overflow: visible;
	}

	:global(.title-blue) {
		color: #3b82f6;
	}

	:global(.title-violet) {
		color: #8b5cf6;
	}

	/* ============================================
	 * HERRAMIENTAS DE INVENTARIO
	 * ============================================ */
	.tools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.25rem;
		align-items: flex-end;
		margin-bottom: 1.5rem;
	}

	.tool-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tool-group.checkbox-group {
		flex-direction: row;
		align-items: center;
	}

	.filter-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.filter-input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		background: #0f172a;
		color: #cbd5e1;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.filter-input:hover {
		border-color: #475569;
	}

	.filter-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #cbd5e1;
		font-size: 0.9rem;
		cursor: pointer;
		user-select: none;
	}

	.checkbox-input {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
		accent-color: #3b82f6;
	}

	/* ============================================
	 * FORMULARIO DE NUEVO PRODUCTO
	 * ============================================ */
	.create-form-section {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-top: 1.5rem;
	}

	.form-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #f59e0b;
		margin: 0 0 1rem 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.form-grid {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.form-grid-6 {
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		background: #1e293b;
		color: #cbd5e1;
		font-size: 0.9rem;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.form-input:hover,
	.form-textarea:hover {
		border-color: #475569;
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.form-textarea {
		resize: vertical;
		min-height: 2.5rem;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-start;
		flex-wrap: wrap;
	}

	/* ============================================
	 * TABLA DE PRODUCTOS
	 * ============================================ */
	.empty-state {
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.empty-message {
		color: #94a3b8;
		font-size: 1rem;
		margin: 0;
	}

	.table-wrapper {
		overflow-x: auto;
		border-radius: 0.5rem;
		background: #0f172a;
	}

	.products-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.products-table thead tr {
		border-bottom: 2px solid #334155;
		background: #1e293b;
	}

	.products-table th {
		text-align: left;
		padding: 0.875rem 0.75rem;
		color: #cbd5e1;
		font-weight: 600;
		white-space: nowrap;
	}

	.products-table th.align-right {
		text-align: right;
	}

	.products-table th.align-center {
		text-align: center;
	}

	.products-table tbody tr {
		border-bottom: 1px solid #334155;
		transition: background-color 0.15s ease;
	}

	.products-table tbody tr:hover {
		background: #1e293b;
	}

	.products-table tbody tr.editing {
		background: #0f172a;
	}

	.products-table td {
		padding: 0.75rem;
		color: #cbd5e1;
		vertical-align: top;
	}

	.product-name,
	.product-category,
	.product-unit,
	.product-desc {
		max-width: 200px;
		word-break: break-word;
	}

	.product-name {
		font-weight: 500;
	}

	.align-right {
		text-align: right;
	}

	.align-center {
		text-align: center;
	}

	.price-display {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.price-main {
		font-weight: 600;
		color: #cbd5e1;
	}

	.price-total {
		font-size: 0.75rem;
		color: #3b82f6;
		font-weight: 500;
	}

	/* Inputs en tabla */
	.table-input,
	.table-input-sm,
	.table-textarea {
		border: 1px solid #334155;
		background: #0f172a;
		color: #cbd5e1;
		border-radius: 0.3rem;
		padding: 0.4rem 0.5rem;
		font-size: 0.85rem;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.table-input {
		width: 100%;
	}

	.table-input-sm {
		width: 70px;
	}

	.table-input.align-right {
		text-align: right;
	}

	.table-input:focus,
	.table-input-sm:focus,
	.table-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.table-textarea {
		width: 100%;
		resize: vertical;
		min-height: 2rem;
	}

	/* Movimientos de stock */
	.movement-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
	}

	.movement-btn {
		width: 2rem;
		height: 1.75rem;
		border: none;
		border-radius: 0.3rem;
		font-weight: 600;
		color: white;
		cursor: pointer;
		transition: all 0.15s ease;
		font-size: 0.9rem;
	}

	.movement-btn.incoming {
		background: #10b981;
	}

	.movement-btn.incoming:hover {
		background: #059669;
	}

	.movement-btn.outgoing {
		background: #ef4444;
	}

	.movement-btn.outgoing:hover {
		background: #dc2626;
	}

	/* Botones de acción */
	.action-buttons {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	/* ============================================
	 * RESPONSIVE
	 * ============================================ */
	@media (max-width: 1024px) {
		.page-root {
			padding: 1.5rem;
		}

		.stats-grid {
			grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		}

		.tools-grid {
			grid-template-columns: 1fr;
		}

		.form-grid-6 {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 768px) {
		.page-root {
			padding: 1rem;
		}

		.page-title {
			font-size: 1.5rem;
		}

		.page-subtitle {
			font-size: 0.9rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.stat-content {
			padding: 1.5rem 1rem;
		}

		.stat-number {
			font-size: 2rem;
		}

		.tools-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.form-grid-6 {
			grid-template-columns: repeat(2, 1fr);
		}

		.products-table {
			font-size: 0.75rem;
		}

		.products-table th,
		.products-table td {
			padding: 0.5rem 0.5rem;
		}

		.product-name,
		.product-category,
		.product-unit,
		.product-desc {
			max-width: 120px;
		}
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.form-grid-6 {
			grid-template-columns: 1fr;
		}

		.products-table {
			font-size: 0.7rem;
		}

		.products-table th,
		.products-table td {
			padding: 0.4rem 0.3rem;
		}

		.movement-btn {
			width: 1.5rem;
			height: 1.5rem;
			font-size: 0.75rem;
		}

		.table-input-sm {
			width: 50px;
		}
	}
</style>
