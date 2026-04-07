<!-- PÁGINA: Crear Nuevo Pedido Cliente -->
<script>
	/**
	 * PÁGINA PARA CREAR UN NUEVO PEDIDO
	 * Permite al cliente seleccionar productos y cantidades
	 * Visualiza el carrito antes de enviar el pedido
	 */

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import { authStore } from '$lib/stores/authStore.js';
	import { ordersStore, productsStore, clientsStore, zonesStore } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';

	let currentUser;
	let allProducts = $state([]);
	let allClients = $state([]);
	let allZones = $state([]);
	let cart = $state({}); // { productId: quantity }
	let notes = $state('');
	let isSubmitting = $state(false);
	let showConfirmStep = $state(false);
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state('success'); // 'success', 'error', 'info'

	// Se suscribe a autenticación
	authStore.subscribe((user) => {
		currentUser = user;
	});

	clientsStore.subscribe(($clients) => {
		allClients = $clients;
	});

	zonesStore.subscribe(($zones) => {
		allZones = $zones;
	});

	// Se suscribe a productos
	productsStore.subscribe(($products) => {
		allProducts = $products;
	});

	/**
	 * Aumenta la cantidad de un producto en el carrito
	 */
	function addToCart(productId) {
		const product = allProducts.find((p) => p.id === productId);
		if (!product) return;

		setCartQuantity(productId, (cart[productId] || 0) + 1);
	}

	/**
	 * Disminuye la cantidad de un producto en el carrito
	 */
	function removeFromCart(productId) {
		setCartQuantity(productId, (cart[productId] || 0) - 1);
	}

	function setCartQuantity(productId, quantity) {
		const product = allProducts.find((p) => p.id === productId);
		if (!product) {
			return;
		}

		const parsedQuantity = Number.parseInt(quantity, 10);
		const safeQuantity = Number.isNaN(parsedQuantity)
			? 0
			: Math.max(0, Math.min(parsedQuantity, product.stock));

		if (safeQuantity === 0) {
			const nextCart = { ...cart };
			delete nextCart[productId];
			cart = nextCart;
			return;
		}

		cart = {
			...cart,
			[productId]: safeQuantity
		};
	}

	/**
	 * Obtiene los productos en el carrito con sus detalles
	 */
	function getCartItems() {
		return Object.entries(cart)
			.filter(([, qty]) => qty > 0)
			.map(([productId, quantity]) => ({
				productId: parseInt(productId),
				quantity,
				product: allProducts.find((p) => p.id === parseInt(productId))
			}));
	}

	/**
	 * Calcula el total del carrito
	 */
	function getCartTotal() {
		return getCartItems().reduce((total, item) => {
			return total + item.product.price * item.quantity;
		}, 0);
	}

	/**
	 * Cuenta los items en el carrito
	 */
	function getCartItemsCount() {
		return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
	}

	/**
	 * Envía el pedido
	 */
	async function submitOrder() {
		const items = getCartItems();

		if (items.length === 0) {
			showToastMessage('Por favor selecciona al menos un producto', 'error');
			return;
		}

		isSubmitting = true;

		try {
			if (!currentUser?.id) {
				showToastMessage('Sesion no valida. Vuelve a iniciar sesion.', 'error');
				isSubmitting = false;
				return;
			}

			// Crea el pedido en modo DB-first para evitar falsos positivos de UI.
			const result = await ordersStore.createDbFirst(currentUser.id, items, notes);
			if (!result?.success) {
				showToastMessage(result?.error || 'No se pudo crear el pedido en base de datos.', 'error');
				isSubmitting = false;
				return;
			}

			// Simula un pequeño delay
			await new Promise((resolve) => setTimeout(resolve, 500));
			showToastMessage(`✓ Pedido #${result.orderId} creado correctamente`, 'success');

			// Espera a que se muestre el Toast antes de redirigir
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Redirige a la página de pedidos
			await goto(resolve('/client/orders'));
		} catch (err) {
			console.error('Error al crear pedido:', err);
			showToastMessage('Error al crear el pedido. Por favor intenta nuevamente.', 'error');
			isSubmitting = false;
		}
	}

	function goToConfirmStep() {
		if (getCartItemsCount() === 0) {
			showToastMessage('Por favor selecciona al menos un producto', 'error');
			return;
		}

		showConfirmStep = true;
	}

	function backToEditStep() {
		showConfirmStep = false;
	}

	/**
	 * Obtiene información de la próxima entrega
	 */
	function getDeliveryInfo() {
		const liveClient = allClients.find((client) => Number(client.id) === Number(currentUser?.id));
		const zoneId = liveClient?.zone ?? currentUser?.zone;
		const zone = allZones.find((z) => Number(z.id) === Number(zoneId));
		return zone || null;
	}

	/**
	 * Muestra un toast/banner con mensaje
	 */
	function showToastMessage(message, type = 'success') {
		toastMessage = message;
		toastType = type;
		showToast = true;

		// Oculta el toast después de 4 segundos
		setTimeout(() => {
			showToast = false;
		}, 4000);
	}
</script>

<svelte:head>
	<title>Crear Pedido - Reparto</title>
</svelte:head>

{#if showToast}
	<div class="toast-wrap animate-slideInRight">
		<div class={`toast-box ${toastType}`}>
			{#if toastType === 'success'}
				<span class="toast-icon">✓</span>
			{:else if toastType === 'error'}
				<span class="toast-icon">✕</span>
			{:else}
				<span class="toast-icon">i</span>
			{/if}
			<p class="toast-message">{toastMessage}</p>
		</div>
	</div>
{/if}

<div class="page-root animate-fadeIn full-width-desktop">
	<div class="page-header page-header-row">
		<div>
			<h1 class="page-title">➕ Crear Nuevo Pedido</h1>
			<p class="page-subtitle">Selecciona los productos que necesitas</p>
		</div>
		<a href={resolve('/client/orders')} class="back-link">Volver a pedidos</a>
	</div>

	<div class="new-order-grid">
		<div class="catalog-column">
			<Card title="🛍️ Catálogo de Productos" titleClass="title-blue" class="card-section">
				{#if allProducts.length === 0}
					<p class="empty-text">No hay productos disponibles</p>
				{:else}
					<div class="products-grid">
						{#each allProducts as product (product.id)}
							<div class="product-card">
								<div class="product-info">
									<p class="product-name">{product.name}</p>
									<p class="product-description">{product.description}</p>
									<div class="product-meta-row">
										<div>
											<p class="meta-label">Precio por {product.unit}</p>
											<p class="meta-value price">{formatCurrency(product.price)}</p>
										</div>
										<div class="meta-right">
											<p class="meta-label">Stock disponible</p>
											<p class="meta-value stock">{product.stock}</p>
										</div>
									</div>
								</div>

								<div class="quantity-row">
									<button
										onclick={() => removeFromCart(product.id)}
										disabled={!cart[product.id] || cart[product.id] === 0}
										class="qty-btn minus"
									>
										-
									</button>

									<div class="quantity-input-wrap">
										<input
											type="number"
											min="0"
											max={product.stock}
											value={cart[product.id] || 0}
											oninput={(e) => setCartQuantity(product.id, e.currentTarget.value)}
											class="quantity-input"
										/>
									</div>

									<button
										onclick={() => addToCart(product.id)}
										disabled={product.stock === 0}
										class="qty-btn plus"
									>
										+
									</button>
								</div>

								{#if cart[product.id] && cart[product.id] > 0}
									<div class="line-total-box">
										{formatCurrency(product.price * cart[product.id])} por {cart[product.id]} {product.unit}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		</div>

		<div class="cart-column">
			<Card title="🛒 Tu Carrito" titleClass="title-amber" class="card-section" noPadding={true}>
				<div class="cart-body">
					{#if getCartItemsCount() === 0}
						<p class="empty-text">El carrito esta vacio</p>
					{:else}
						<div class="cart-items-list">
							{#each getCartItems() as item (item.productId)}
								<div class="cart-item-row">
									<div>
										<p class="cart-item-name">{item.product.name}</p>
										<p class="cart-item-sub">{item.quantity}x {formatCurrency(item.product.price)}</p>
									</div>
									<p class="cart-item-price">{formatCurrency(item.product.price * item.quantity)}</p>
								</div>
							{/each}
						</div>

						<div class="cart-total-box">
							<div class="cart-total-row">
								<span class="total-label">Total:</span>
								<span class="total-value">{formatCurrency(getCartTotal())}</span>
							</div>
							<p class="total-count">{getCartItemsCount()} items</p>
						</div>

						{@const deliveryInfo = getDeliveryInfo()}
						{#if deliveryInfo}
							<div class="delivery-info-box">
								<p class="delivery-title">Proxima entrega</p>
								<p class="delivery-line">{deliveryInfo.name}</p>
								<p class="delivery-line">{deliveryInfo.deliveryTime}</p>
							</div>
						{/if}

						<div class="notes-wrap">
							<label for="order-notes" class="form-label">Notas especiales</label>
							<textarea
								id="order-notes"
								bind:value={notes}
								placeholder="Instrucciones adicionales para la entrega..."
								class="form-textarea"
								rows="3"
							></textarea>
						</div>
					{/if}
				</div>
			</Card>

			{#if getCartItemsCount() > 0}
				<div class="actions-stack">
					{#if !showConfirmStep}
						<Button variant="secondary" size="lg" class="btn-full" onclick={goToConfirmStep}>
							Revisar y confirmar
						</Button>
					{:else}
						<div class="confirm-box">
							<p class="confirm-title">Confirmacion del pedido</p>

							<div class="confirm-items-list">
								<p class="confirm-items-heading">Productos en el pedido</p>
								{#each getCartItems() as item (item.productId)}
									<div class="confirm-item-row">
										<div class="confirm-item-main">
											<p class="confirm-item-name">{item.product.name}</p>
											<p class="confirm-item-sub">{item.quantity} x {formatCurrency(item.product.price)}</p>
										</div>
										<p class="confirm-item-price">{formatCurrency(item.product.price * item.quantity)}</p>
									</div>
								{/each}
							</div>

							<div class="confirm-summary">
								<p>Total de productos: <strong>{getCartItemsCount()}</strong></p>
								<p>Lineas de pedido: <strong>{getCartItems().length}</strong></p>
								<div class="confirm-total-line">
									<p>Total a pagar: {formatCurrency(getCartTotal())}</p>
								</div>
							</div>

							<Button variant="primary" size="lg" class="btn-full" loading={isSubmitting} onclick={submitOrder}>
								{#if isSubmitting}
									Creando pedido...
								{:else}
									Confirmar pedido
								{/if}
							</Button>
							<Button variant="secondary" size="sm" class="btn-full" onclick={backToEditStep}>
								Volver a editar
							</Button>
						</div>
					{/if}

					<a href={resolve('/client/orders')} class="cancel-link">Cancelar</a>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page-root {
		width: 100%;
		padding: 1.5rem;
		background: #0f172a;
		color: #cbd5e1;
	}

	.page-header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.4rem;
	}

	.page-title {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.page-subtitle {
		margin: 0.45rem 0 0;
		color: #94a3b8;
		font-size: 0.95rem;
	}

	.back-link {
		color: #60a5fa;
		font-weight: 600;
		text-decoration: none;
	}

	.back-link:hover {
		color: #93c5fd;
	}

	.new-order-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 1rem;
	}

	:global(.card-section) {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	:global(.title-blue) {
		color: #93c5fd !important;
	}

	:global(.title-amber) {
		color: #fcd34d !important;
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.product-card {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		padding: 0.9rem;
	}

	.product-name {
		margin: 0;
		font-weight: 700;
		color: #f1f5f9;
	}

	.product-description {
		margin: 0.3rem 0 0.6rem;
		font-size: 0.85rem;
		color: #94a3b8;
	}

	.product-meta-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.7rem;
		margin-bottom: 0.7rem;
	}

	.meta-label {
		margin: 0;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.meta-value {
		margin: 0.25rem 0 0;
		font-size: 1rem;
		font-weight: 700;
	}

	.meta-value.price {
		color: #60a5fa;
	}

	.meta-value.stock {
		color: #34d399;
	}

	.meta-right {
		text-align: right;
	}

	.quantity-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.7rem;
	}

	.qty-btn {
		border: 1px solid transparent;
		border-radius: 0.4rem;
		padding: 0.35rem 0.65rem;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.qty-btn.minus {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
	}

	.qty-btn.plus {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.qty-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.quantity-input-wrap {
		flex: 1;
	}

	.quantity-input {
		width: 100%;
		padding: 0.38rem 0.5rem;
		text-align: center;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.35rem;
		color: #f1f5f9;
		font: inherit;
	}

	.quantity-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.line-total-box {
		padding: 0.5rem;
		border-radius: 0.35rem;
		text-align: center;
		font-size: 0.82rem;
		font-weight: 600;
		background: rgba(37, 99, 235, 0.2);
		color: #bfdbfe;
	}

	.cart-body {
		padding: 1rem;
	}

	.empty-text {
		margin: 0;
		text-align: center;
		color: #94a3b8;
		padding: 1rem 0;
	}

	.cart-items-list {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.cart-item-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.7rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid #334155;
	}

	.cart-item-name {
		margin: 0;
		font-weight: 600;
		color: #f1f5f9;
	}

	.cart-item-sub {
		margin: 0.2rem 0 0;
		font-size: 0.82rem;
		color: #94a3b8;
	}

	.cart-item-price {
		margin: 0;
		font-weight: 700;
		color: #60a5fa;
	}

	.cart-total-box,
	.delivery-info-box {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		padding: 0.75rem;
		margin-bottom: 0.8rem;
	}

	.cart-total-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.total-label {
		font-weight: 600;
		color: #cbd5e1;
	}

	.total-value {
		font-size: 1.4rem;
		font-weight: 700;
		color: #60a5fa;
	}

	.total-count {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
		color: #94a3b8;
	}

	.delivery-title {
		margin: 0 0 0.35rem;
		font-weight: 600;
		color: #f1f5f9;
	}

	.delivery-line {
		margin: 0.1rem 0;
		font-size: 0.82rem;
		color: #94a3b8;
	}

	.notes-wrap {
		margin-bottom: 0.8rem;
	}

	.form-label {
		display: block;
		margin: 0 0 0.4rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: #cbd5e1;
	}

	.form-textarea {
		width: 100%;
		padding: 0.55rem 0.65rem;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		background: #0f172a;
		color: #f1f5f9;
		font: inherit;
		resize: none;
	}

	.form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.actions-stack {
		display: grid;
		gap: 0.6rem;
	}

	:global(.btn-full) {
		width: 100%;
	}

	.confirm-box {
		padding: 0.85rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		display: grid;
		gap: 0.8rem;
	}

	.confirm-title {
		margin: 0;
		font-weight: 700;
		color: #f1f5f9;
	}

	.confirm-items-list {
		padding: 0.65rem;
		border: 1px solid #334155;
		border-radius: 0.45rem;
		max-height: 12rem;
		overflow-y: auto;
	}

	.confirm-items-heading {
		margin: 0 0 0.45rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: #94a3b8;
	}

	.confirm-item-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.45rem 0;
		border-bottom: 1px solid #334155;
	}

	.confirm-item-row:last-child {
		border-bottom: none;
	}

	.confirm-item-name {
		margin: 0;
		font-size: 0.85rem;
		color: #f1f5f9;
	}

	.confirm-item-sub {
		margin: 0.15rem 0 0;
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.confirm-item-price {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 700;
		color: #60a5fa;
	}

	.confirm-summary {
		font-size: 0.82rem;
		color: #cbd5e1;
	}

	.confirm-summary p {
		margin: 0.2rem 0;
	}

	.confirm-total-line {
		margin-top: 0.45rem;
		padding-top: 0.45rem;
		border-top: 1px solid #334155;
		font-weight: 700;
		color: #f1f5f9;
	}

	.cancel-link {
		display: block;
		text-align: center;
		padding: 0.5rem;
		text-decoration: none;
		color: #94a3b8;
		font-weight: 600;
	}

	.cancel-link:hover {
		color: #cbd5e1;
	}

	.toast-wrap {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 50;
	}

	.toast-box {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.85rem;
		border-radius: 0.45rem;
		border: 1px solid;
		background: #0f172a;
	}

	.toast-box.success {
		border-color: #10b981;
		color: #a7f3d0;
	}

	.toast-box.error {
		border-color: #ef4444;
		color: #fecaca;
	}

	.toast-box.info {
		border-color: #3b82f6;
		color: #bfdbfe;
	}

	.toast-icon {
		font-size: 1.15rem;
		font-weight: 700;
	}

	.toast-message {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.full-width-desktop {
		width: 100%;
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

	@keyframes slideInRight {
		from {
			opacity: 0;
			transform: translateX(280px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.5s ease-in-out;
	}

	.animate-slideInRight {
		animation: slideInRight 0.4s ease-out;
	}

	@media (min-width: 768px) {
		.products-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.new-order-grid {
			grid-template-columns: 2fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.page-root {
			padding: 1rem;
		}

		.page-header-row {
			flex-direction: column;
		}

		.page-title {
			font-size: 1.6rem;
		}

		.toast-wrap {
			left: 1rem;
			right: 1rem;
		}
	}
</style>
