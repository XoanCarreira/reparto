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
	import { ordersStore, productsStore } from '$lib/stores/dataStore.js';
	import { formatCurrency } from '$lib/utils/helpers.js';
	import { zones } from '$lib/data/mockData.js';

	let currentUser;
	let allProducts = $state([]);
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
			// Crea el pedido usando el store
			const orderId = ordersStore.create(currentUser.id, items, notes);

			// Simula un pequeño delay
			await new Promise((resolve) => setTimeout(resolve, 500));
			showToastMessage(`✓ Pedido #${orderId} creado correctamente`, 'success');

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
		const zone = zones.find((z) => z.id === currentUser?.zone);
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

<!-- Toast/Banner elegante -->
{#if showToast}
	<div class="fixed top-4 right-4 z-50 animate-slideInRight">
		<div
			class={`radius-lg shadow-lg border px-6 py-4 flex items-center gap-3 ${
				toastType === 'success'
					? 'bg-green-50 border-green-300 text-green-900'
					: toastType === 'error'
						? 'bg-red-50 border-red-300 text-red-900'
						: 'bg-blue-50 border-blue-300 text-blue-900'
			}`}
		>
			{#if toastType === 'success'}
				<span class="fs-2xl">✓</span>
			{:else if toastType === 'error'}
				<span class="fs-2xl">✕</span>
			{:else}
				<span class="fs-2xl">ℹ</span>
			{/if}
			<p class="fw-medium">{toastMessage}</p>
		</div>
	</div>
{/if}

<div class="page-root animate-fadeIn full-width-desktop">
	<!-- Encabezado -->
	<div class="page-header page-header-row">
		<div>
			<h1 class="page-title">➕ Crear Nuevo Pedido</h1>
			<p class="page-subtitle">Selecciona los productos que necesitas</p>
		</div>
		<a
			href={resolve('/client/orders')}
			class="text-blue-600 hover:text-blue-800 fw-medium flex items-center gap-2"
		>
			← Volver a pedidos
		</a>
	</div>

	<!-- Grid: Productos y Carrito -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Catálogo de productos (columna izquierda - 2 columnas) -->
		<div class="lg:col-span-2">
			<Card title="🛍️ Catálogo de Productos" titleClass="text-blue-300" class="glass-blue">
				{#if allProducts.length === 0}
					<p class="txt-muted text-center py-8">No hay productos disponibles</p>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each allProducts as product (product.id)}
							<div class="panel-surface-soft radius-lg p-4 hover:shadow-md transition-shadow">
								<!-- Info del producto -->
								<div class="mb-3">
									<p class="fw-bold txt-primary fs-lg">{product.name}</p>
									<p class="fs-sm txt-muted mb-2">{product.description}</p>
									<div class="flex justify-between items-center mb-3">
										<div>
											<p class="text-xs txt-muted">Precio por {product.unit}</p>
											<p class="fs-lg fw-bold text-blue-600">{formatCurrency(product.price)}</p>
										</div>
										<div class="text-right">
											<p class="text-xs txt-muted">Stock disponible</p>
											<p class="fs-lg fw-bold text-green-600">{product.stock}</p>
										</div>
									</div>
								</div>

								<!-- Contador de cantidad -->
								<div class="flex items-center gap-2 mb-3">
									<button
										onclick={() => removeFromCart(product.id)}
										disabled={!cart[product.id] || cart[product.id] === 0}
										class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										−
									</button>

									<div class="flex-1 text-center">
										<input
											type="number"
											min="0"
											max={product.stock}
											value={cart[product.id] || 0}
											oninput={(e) => setCartQuantity(product.id, e.currentTarget.value)}
											class="w-full px-2 py-1 text-center border bd-soft bg-panel txt-primary rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>

									<button
										onclick={() => addToCart(product.id)}
										disabled={product.stock === 0}
										class="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										+
									</button>
								</div>

								{#if cart[product.id] && cart[product.id] > 0}
									<div class="panel-surface-soft rounded p-2 text-center fs-sm text-blue-300 fw-medium">
										{formatCurrency(product.price * cart[product.id])} por {cart[product.id]} {product.unit}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		</div>

		<!-- Carrito (columna derecha) -->
		<div class="lg:col-span-1">
			<!-- Resumen del carrito -->
			<Card title="🛒 Tu Carrito" titleClass="text-amber-300" class="glass-amber" noPadding={true}>
				<div class="p-6">
					{#if getCartItemsCount() === 0}
						<p class="txt-muted text-center py-8">El carrito está vacío</p>
					{:else}
						<!-- Items en el carrito -->
						<div class="space-y-3 mb-4">
							{#each getCartItems() as item (item.productId)}
								<div class="flex justify-between items-start pb-3 border-b border-white/20">
									<div>
										<p class="fw-medium txt-primary">{item.product.name}</p>
										<p class="fs-sm txt-muted">
											{item.quantity}× {formatCurrency(item.product.price)}
										</p>
									</div>
									<p class="fw-bold text-blue-600">
										{formatCurrency(item.product.price * item.quantity)}
									</p>
								</div>
							{/each}
						</div>

						<!-- Total -->
						<div class="panel-surface-soft radius-lg p-4 mb-4">
							<div class="flex justify-between items-center">
								<span class="fw-medium txt-soft">Total:</span>
								<span class="fs-2xl fw-bold text-blue-600">{formatCurrency(getCartTotal())}</span>
							</div>
							<p class="fs-sm txt-muted mt-2">{getCartItemsCount()} items</p>
						</div>

						<!-- Info de entrega -->
						{@const deliveryInfo = getDeliveryInfo()}
						{#if deliveryInfo}
							<div class="panel-surface-soft radius-lg p-3 mb-4 fs-sm">
								<p class="fw-medium txt-primary mb-2">Próxima entrega</p>
								<p class="txt-muted">{deliveryInfo.name}</p>
								<p class="txt-muted">{deliveryInfo.deliveryTime}</p>
							</div>
						{/if}

						<!-- Campo de notas -->
						<div class="mb-4">
							<label for="order-notes" class="block fs-sm fw-medium txt-soft mb-2">Notas especiales</label>
							<textarea
								id="order-notes"
								bind:value={notes}
								placeholder="Instrucciones adicionales para la entrega..."
								class="w-full px-3 py-2 border bd-soft bg-panel txt-primary radius-lg focus:outline-none focus:ring-2 focus:ring-blue-500 fs-sm resize-none"
								rows="3"
							></textarea>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Botones de acción -->
			{#if getCartItemsCount() > 0}
				<div class="space-y-2">
					{#if !showConfirmStep}
						<Button variant="secondary" size="lg" class="w-full" onclick={goToConfirmStep}>
							Revisar y confirmar
						</Button>
					{:else}
						<div class="radius-lg panel-surface-soft p-4 space-y-4">
							<p class="fw-semibold text-blue-900">Confirmación del pedido</p>

							<!-- Listado detallado de productos -->
							<div class="panel-surface-soft radius-lg p-3 space-y-2 max-h-48 overflow-y-auto">
								<p class="text-xs fw-semibold txt-soft uppercase tracking-wide">Productos en el pedido</p>
								{#each getCartItems() as item (item.productId)}
									<div class="flex justify-between items-start fs-sm pb-2 border-b border-white/15 last:border-b-0">
										<div class="flex-1">
											<p class="fw-medium txt-primary">{item.product.name}</p>
											<p class="text-xs txt-muted">
												{item.quantity} × {formatCurrency(item.product.price)}
											</p>
										</div>
										<p class="fw-semibold text-blue-600 text-right">
											{formatCurrency(item.product.price * item.quantity)}
										</p>
									</div>
								{/each}
							</div>

							<!-- Resumen de totales -->
							<div class="space-y-1 fs-sm text-blue-200">
								<p>Total de productos: <strong>{getCartItemsCount()}</strong></p>
								<p>Líneas de pedido: <strong>{getCartItems().length}</strong></p>
								<div class="pt-2 border-t border-white/20 mt-2">
									<p class="fs-lg fw-bold">Total a pagar: {formatCurrency(getCartTotal())}</p>
								</div>
							</div>

							<Button
								variant="primary"
								size="lg"
								class="w-full"
								loading={isSubmitting}
								onclick={submitOrder}
							>
								{#if isSubmitting}
									Creando pedido...
								{:else}
									Confirmar pedido
								{/if}
							</Button>
							<Button variant="secondary" size="sm" class="w-full" onclick={backToEditStep}>
								Volver a editar
							</Button>
						</div>
					{/if}

					<a
						href={resolve('/client/orders')}
						class="block text-center txt-muted hover:txt-subtle fw-medium py-2 transition-colors"
					>
						Cancelar
					</a>
				</div>
			{/if}
		</div>
	</div>
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

	@keyframes slideInRight {
		from {
			opacity: 0;
			transform: translateX(400px);
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
</style>
