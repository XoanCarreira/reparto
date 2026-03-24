/**
 * STORE DE DATOS
 * Gestiona los datos principales: productos, órdenes, zonas, clientes.
 * En producción, estos datos vendrían de una API REST.
 */

import { writable, derived } from 'svelte/store';
import { products, zones, orders, incidents, users } from '../data/mockData.js';

function getAverageOrderAmountByMonth(clientOrders, year, month) {
	const monthOrders = clientOrders.filter((order) => {
		const createdAt = new Date(order.createdAt);
		return createdAt.getFullYear() === year && createdAt.getMonth() === month;
	});

	if (monthOrders.length === 0) {
		return 0;
	}

	const totalAmount = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
	return Number((totalAmount / monthOrders.length).toFixed(2));
}

function buildZoneClientMetricsRows() {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);

	return users
		.filter((user) => user.role === 'client')
		.map((client) => {
			const clientOrders = orders.filter((order) => order.clientId === client.id);

			return {
				id: `metric-${client.id}`,
				clientId: client.id,
				zoneId: client.zone || zones[0]?.id || 1,
				pendingOrders: clientOrders.filter((order) => order.status === 'pending').length,
				inDeliveryOrders: clientOrders.filter((order) => order.status === 'in_delivery').length,
				avgPrevMonth: getAverageOrderAmountByMonth(
					clientOrders,
					previousMonthDate.getFullYear(),
					previousMonthDate.getMonth()
				),
				avgCurrentMonth: getAverageOrderAmountByMonth(clientOrders, currentYear, currentMonth)
			};
		});
}

/**
 * Store reactivo para el catálogo de productos disponibles
 */
function createProductsStore() {
	const { subscribe, update } = writable([...products]);

	return {
		subscribe,

		/**
		 * Obtiene todos los productos disponibles
		 * @returns {array}
		 */
		getAll: () => {
			let allProducts = [];
			subscribe((p) => {
				allProducts = p;
			})();
			return allProducts;
		},

		/**
		 * Obtiene un producto por su ID
		 * @param {number} productId - ID del producto
		 * @returns {object|null}
		 */
		getById: (productId) => {
			let product = null;
			subscribe((products) => {
				product = products.find((p) => p.id === productId);
			})();
			return product;
		},

		/**
		 * Actualiza el stock de un producto (después de una entrega)
		 * @param {number} productId - ID del producto
		 * @param {number} quantity - Cantidad a restar del stock
		 */
		decreaseStock: (productId, quantity) => {
			const parsedQuantity = Number(quantity) || 0;
			if (parsedQuantity <= 0) {
				return;
			}

			update((products) =>
				products.map((p) =>
					p.id === productId ? { ...p, stock: Math.max(0, p.stock - parsedQuantity) } : p
				)
			);
		},

		/**
		 * Incrementa el stock de un producto (entrada de mercancia)
		 * @param {number} productId - ID del producto
		 * @param {number} quantity - Cantidad a sumar al stock
		 */
		increaseStock: (productId, quantity) => {
			const parsedQuantity = Number(quantity) || 0;
			if (parsedQuantity <= 0) {
				return;
			}

			update((products) =>
				products.map((p) =>
					p.id === productId ? { ...p, stock: Math.max(0, p.stock + parsedQuantity) } : p
				)
			);
		},

		/**
		 * Actualiza cualquier parametro editable de un producto
		 * @param {number} productId - ID del producto
		 * @param {object} updates - Campos a actualizar
		 */
		updateProduct: (productId, updates) => {
			update((products) =>
				products.map((p) => {
					if (p.id !== productId) {
						return p;
					}

					return {
						...p,
						...updates,
						name: updates.name ?? p.name,
						category: updates.category ?? p.category,
						unit: updates.unit ?? p.unit,
						description: updates.description ?? p.description,
						stock: Number.isFinite(Number(updates.stock))
							? Math.max(0, Number(updates.stock))
							: p.stock,
						minStock: Number.isFinite(Number(updates.minStock))
							? Math.max(0, Number(updates.minStock))
							: p.minStock,
						price: Number.isFinite(Number(updates.price)) ? Math.max(0, Number(updates.price)) : p.price
					};
				})
			);
		},

		/**
		 * Crea un nuevo producto en el catalogo
		 * @param {object} payload - Datos del producto
		 * @returns {number} id del producto creado
		 */
		create: (payload) => {
			let newProductId = 0;

			update((products) => {
				const maxId = Math.max(...products.map((p) => p.id), 0);
				newProductId = maxId + 1;

				const newProduct = {
					id: newProductId,
					name: payload.name?.trim() || `Producto ${newProductId}`,
					category: payload.category?.trim() || 'General',
					unit: payload.unit?.trim() || 'unidad',
					stock: Math.max(0, Number(payload.stock) || 0),
					minStock: Math.max(0, Number(payload.minStock) || 0),
					price: Math.max(0, Number(payload.price) || 0),
					description: payload.description?.trim() || ''
				};

				return [...products, newProduct];
			});

			return newProductId;
		},

		/**
		 * Obtiene todos los productos que están bajo stock mínimo
		 * @returns {array}
		 */
		getLowStockProducts: () => {
			let lowStock = [];
			subscribe((products) => {
				lowStock = products.filter((p) => p.stock <= p.minStock);
			})();
			return lowStock;
		}
	};
}

/**
 * Store reactivo para las zonas de reparto
 */
function createZonesStore() {
	const { subscribe, update } = writable([...zones]);

	return {
		subscribe,

		/**
		 * Obtiene todas las zonas de reparto
		 * @returns {array}
		 */
		getAll: () => {
			let allZones = [];
			subscribe((z) => {
				allZones = z;
			})();
			return allZones;
		},

		/**
		 * Obtiene una zona por su ID
		 * @param {number} zoneId - ID de la zona
		 * @returns {object|null}
		 */
		getById: (zoneId) => {
			let zone = null;
			subscribe((zones) => {
				zone = zones.find((z) => z.id === zoneId);
			})();
			return zone;
		},

		/**
		 * Obtiene la próxima entrega para una zona específica
		 * @param {number} zoneId - ID de la zona
		 * @returns {Date|null}
		 */
		getNextDelivery: (zoneId) => {
			let nextDelivery = null;
			subscribe((zones) => {
				const zone = zones.find((z) => z.id === zoneId);
				nextDelivery = zone?.nextDelivery || null;
			})();
			return nextDelivery;
		},

		/**
		 * Crea una nueva zona de reparto
		 * @param {object} payload - Datos de la zona
		 * @returns {number} ID de la zona creada
		 */
		create: (payload) => {
			let newZoneId = 0;

			update((zones) => {
				const maxId = Math.max(...zones.map((z) => z.id), 0);
				newZoneId = maxId + 1;

				const deliveryDays = Array.isArray(payload.deliveryDays)
					? payload.deliveryDays
					: String(payload.deliveryDays || '')
							.split(',')
							.map((day) => day.trim())
							.filter(Boolean);

				const newZone = {
					id: newZoneId,
					name: payload.name?.trim() || `Zona ${newZoneId}`,
					deliveryDays,
					deliveryTime: payload.deliveryTime?.trim() || '',
					notes: payload.notes?.trim() || '',
					description: payload.notes?.trim() || '',
					address: payload.address?.trim() || '',
					nextDelivery: payload.nextDelivery || null
				};

				return [...zones, newZone];
			});

			return newZoneId;
		},

		/**
		 * Actualiza una zona existente
		 * @param {number} zoneId - ID de la zona
		 * @param {object} updates - Campos editables
		 */
		updateZone: (zoneId, updates) => {
			update((zones) =>
				zones.map((zone) => {
					if (zone.id !== zoneId) {
						return zone;
					}

					const deliveryDays = Array.isArray(updates.deliveryDays)
						? updates.deliveryDays
						: String(updates.deliveryDays ?? zone.deliveryDays ?? '')
								.split(',')
								.map((day) => day.trim())
								.filter(Boolean);

					const normalizedNotes =
						typeof updates.notes === 'string'
							? updates.notes.trim()
							: (zone.notes ?? zone.description ?? '');

					return {
						...zone,
						...updates,
						name: typeof updates.name === 'string' ? updates.name.trim() : zone.name,
						deliveryDays,
						deliveryTime:
							typeof updates.deliveryTime === 'string'
								? updates.deliveryTime.trim()
								: zone.deliveryTime,
						notes: normalizedNotes,
						description: normalizedNotes,
						address:
							typeof updates.address === 'string' ? updates.address.trim() : (zone.address ?? '')
					};
				})
			);
		}
	};
}

function createClientsStore() {
	const initialClients = users
		.filter((user) => user.role === 'client')
		.map((client) => ({ ...client }));

	const { subscribe, update } = writable(initialClients);

	return {
		subscribe,

		create: (payload) => {
			let newClientId = 0;

			update((clients) => {
				const maxId = Math.max(...clients.map((client) => client.id), 100);
				newClientId = maxId + 1;

				const newClient = {
					id: newClientId,
					email: payload.email?.trim() || `cliente${newClientId}@empresa.com`,
					password: payload.password?.trim() || 'cliente123',
					name: payload.name?.trim() || `Cliente ${newClientId}`,
					role: 'client',
					zone: Number(payload.zone) || zones[0]?.id || 1,
					phone: payload.phone?.trim() || '',
					address: payload.address?.trim() || '',
					createdAt: new Date()
				};

				return [...clients, newClient];
			});

			return newClientId;
		},

		updateClient: (clientId, updates) => {
			update((clients) =>
				clients.map((client) => {
					if (client.id !== clientId) {
						return client;
					}

					return {
						...client,
						...updates,
						email: typeof updates.email === 'string' ? updates.email.trim() : client.email,
						password: typeof updates.password === 'string' ? updates.password.trim() : client.password,
						name: typeof updates.name === 'string' ? updates.name.trim() : client.name,
						zone: Number.isFinite(Number(updates.zone)) ? Number(updates.zone) : client.zone,
						phone: typeof updates.phone === 'string' ? updates.phone.trim() : (client.phone ?? ''),
						address:
							typeof updates.address === 'string' ? updates.address.trim() : (client.address ?? '')
					};
				})
			);
		}
	};
}

/**
 * Store reactivo para los pedidos de clientes
 */
function createOrdersStore() {
	const { subscribe, update } = writable([...orders]);

	return {
		subscribe,

		/**
		 * Obtiene todos los pedidos
		 * @returns {array}
		 */
		getAll: () => {
			let allOrders = [];
			subscribe((o) => {
				allOrders = o;
			})();
			return allOrders;
		},

		/**
		 * Obtiene los pedidos de un cliente específico
		 * @param {number} clientId - ID del cliente
		 * @returns {array}
		 */
		getByClient: (clientId) => {
			let clientOrders = [];
			subscribe((orders) => {
				clientOrders = orders.filter((o) => o.clientId === clientId);
			})();
			return clientOrders;
		},

		/**
		 * Obtiene los pedidos pendientes de un cliente
		 * @param {number} clientId - ID del cliente
		 * @returns {array}
		 */
		getPendingByClient: (clientId) => {
			let pendingOrders = [];
			subscribe((orders) => {
				pendingOrders = orders.filter((o) => o.clientId === clientId && o.status === 'pending');
			})();
			return pendingOrders;
		},

		/**
		 * Crea un nuevo pedido
		 * @param {number} clientId - ID del cliente
		 * @param {array} items - Array de { productId, quantity }
		 * @param {string} notes - Notas adicionales
		 * @returns {number} - ID del nuevo pedido
		 */
		create: (clientId, items, notes = '') => {
			let newOrderId = 0;

			update((orders) => {
				// Calcula el ID del nuevo pedido
				const maxId = Math.max(...orders.map((o) => o.id), 1000);
				newOrderId = maxId + 1;

				// Calcula el monto total del pedido
				let totalAmount = 0;
				const processedItems = items.map((item) => {
					const product = products.find((p) => p.id === item.productId);
					const unitPrice = product?.price || 0;
					totalAmount += unitPrice * item.quantity;
					return { ...item, unitPrice };
				});

				// Obtiene la zona del cliente para calcular la fecha de entrega
				const client = users.find((u) => u.id === clientId);
				const clientZone = zones.find((z) => z.id === client?.zone);
				const scheduledDelivery = clientZone?.nextDelivery || new Date();

				// Crea el nuevo pedido
				const newOrder = {
					id: newOrderId,
					clientId,
					status: 'pending',
					items: processedItems,
					createdAt: new Date(),
					scheduledDelivery,
					totalAmount,
					notes
				};

				return [...orders, newOrder];
			});

			return newOrderId;
		},

		/**
		 * Actualiza el estado de un pedido
		 * @param {number} orderId - ID del pedido
		 * @param {string} newStatus - Nuevo estado (pending, delivered, cancelled)
		 */
		updateStatus: (orderId, newStatus) => {
			let targetOrder = null;

			update((orders) =>
				orders.map((o) => {
					if (o.id !== orderId) {
						return o;
					}

					targetOrder = o;
					return {
						...o,
						status: newStatus,
						deliveredAt: newStatus === 'delivered' ? new Date() : o.deliveredAt
					};
				})
			);

			if (
				targetOrder &&
				targetOrder.status !== 'delivered' &&
				newStatus === 'delivered' &&
				Array.isArray(targetOrder.items)
			) {
				targetOrder.items.forEach((item) => {
					productsStore.decreaseStock(item.productId, item.quantity);
				});
			}
		},

		/**
		 * Obtiene todos los pedidos pendientes
		 * @returns {array}
		 */
		getPending: () => {
			let pendingOrders = [];
			subscribe((orders) => {
				pendingOrders = orders.filter((o) => o.status === 'pending');
			})();
			return pendingOrders;
		},

		/**
		 * Obtiene los totales por cliente (para estadísticas del admin)
		 * @returns {array} Array con totales por cliente
		 */
		getClientTotals: () => {
			let totals = [];
			subscribe((orders) => {
				const grouped = orders.reduce((acc, order) => {
					if (!acc[order.clientId]) {
						acc[order.clientId] = { totalOrders: 0, totalAmount: 0, pendingAmount: 0 };
					}
					acc[order.clientId].totalOrders++;
					acc[order.clientId].totalAmount += order.totalAmount;
					if (order.status === 'pending') {
						acc[order.clientId].pendingAmount += order.totalAmount;
					}
					return acc;
				}, {});

				totals = Object.entries(grouped).map(([clientId, data]) => ({
					clientId: parseInt(clientId),
					...data
				}));
			})();
			return totals;
		}
	};
}

/**
 * Store reactivo para incidencias/problemas
 */
function createIncidentsStore() {
	const { subscribe, update } = writable([...incidents]);

	return {
		subscribe,

		/**
		 * Obtiene todas las incidencias
		 * @returns {array}
		 */
		getAll: () => {
			let allIncidents = [];
			subscribe((i) => {
				allIncidents = i;
			})();
			return allIncidents;
		},

		/**
		 * Obtiene las incidencias abiertas
		 * @returns {array}
		 */
		getOpen: () => {
			let openIncidents = [];
			subscribe((incidents) => {
				openIncidents = incidents.filter((i) => i.status === 'open');
			})();
			return openIncidents;
		},

		/**
		 * Creaa una nueva incidencia
		 * @param {number} orderId - ID del pedido
		 * @param {number} clientId - ID del cliente
		 * @param {string} type - Tipo de incidencia
		 * @param {string} description - Descripción del problema
		 * @param {string} priority - Prioridad (high, medium, low)
		 */
		create: (orderId, clientId, type, description, priority = 'medium') => {
			update((incidents) => {
				const maxId = Math.max(...incidents.map((i) => i.id), 300);
				const newIncident = {
					id: maxId + 1,
					orderId,
					clientId,
					type,
					status: 'open',
					description,
					reportedAt: new Date(),
					resolvedAt: null,
					priority
				};
				return [...incidents, newIncident];
			});
		},

		/**
		 * Marca una incidencia como resuelta
		 * @param {number} incidentId - ID de la incidencia
		 */
		resolve: (incidentId) => {
			update((incidents) =>
				incidents.map((i) =>
					i.id === incidentId ? { ...i, status: 'resolved', resolvedAt: new Date() } : i
				)
			);
		}
	};
}

function createZoneClientMetricsStore() {
	const { subscribe, update, set } = writable(buildZoneClientMetricsRows());

	return {
		subscribe,

		addRow: (payload = {}) => {
			update((rows) => {
				const baseClient = users.find((user) => user.role === 'client');
				const newId =
					typeof crypto !== 'undefined' && crypto.randomUUID
						? crypto.randomUUID()
						: `metric-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

				const newRow = {
					id: newId,
					clientId: payload.clientId || baseClient?.id || null,
					zoneId: payload.zoneId || baseClient?.zone || zones[0]?.id || 1,
					pendingOrders: Number(payload.pendingOrders || 0),
					inDeliveryOrders: Number(payload.inDeliveryOrders || 0),
					avgPrevMonth: Number(payload.avgPrevMonth || 0),
					avgCurrentMonth: Number(payload.avgCurrentMonth || 0)
				};

				return [...rows, newRow];
			});
		},

		updateRow: (rowId, updates) => {
			update((rows) =>
				rows.map((row) => {
					if (row.id !== rowId) {
						return row;
					}

					return {
						...row,
						...updates,
						pendingOrders: Number(updates.pendingOrders ?? row.pendingOrders),
						inDeliveryOrders: Number(updates.inDeliveryOrders ?? row.inDeliveryOrders),
						avgPrevMonth: Number(updates.avgPrevMonth ?? row.avgPrevMonth),
						avgCurrentMonth: Number(updates.avgCurrentMonth ?? row.avgCurrentMonth)
					};
				})
			);
		},

		deleteRow: (rowId) => {
			update((rows) => rows.filter((row) => row.id !== rowId));
		},

		resetFromOrders: () => {
			set(buildZoneClientMetricsRows());
		}
	};
}

// Exporta los stores
export const productsStore = createProductsStore();
export const zonesStore = createZonesStore();
export const clientsStore = createClientsStore();
export const ordersStore = createOrdersStore();
export const incidentsStore = createIncidentsStore();
export const zoneClientMetricsStore = createZoneClientMetricsStore();

/**
 * Derived store: Productos con stock bajo
 * Se actualiza automáticamente cuando cambian los productos
 */
export const lowStockProducts = derived(productsStore, ($products) =>
	$products.filter((p) => p.stock <= p.minStock)
);

/**
 * Derived store: Pedidos pendientes
 * Se actualiza automáticamente cuando cambian los pedidos
 */
export const pendingOrders = derived(ordersStore, ($orders) =>
	$orders.filter((o) => o.status === 'pending')
);

/**
 * Derived store: Incidencias abiertas
 * Se actualiza automáticamente cuando cambian las incidencias
 */
export const openIncidents = derived(incidentsStore, ($incidents) =>
	$incidents.filter((i) => i.status === 'open')
);
