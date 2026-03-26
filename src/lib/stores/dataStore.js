/**
 * STORE DE DATOS
 * Fuente única: Supabase.
 */

import { writable, derived } from 'svelte/store';
import {
	isDatabaseEnabled,
	fetchClientsDb,
	upsertClientDb,
	deleteClientDb,
	fetchOrdersDb,
	insertOrderWithItemsDb,
	patchOrderDb,
	deleteOrderDb,
	deleteCancelledOrdersByClientDb,
	fetchProductsDb,
	upsertProductDb,
	deleteProductDb,
	fetchZonesDb,
	upsertZoneDb,
	deleteZoneDb,
	fetchIncidentsDb,
	insertIncidentDb,
	patchIncidentDb,
	fetchDeliveryStaffDb,
	upsertDeliveryStaffDb,
	deleteDeliveryStaffDb,
	ensureAuthUserExistsDb,
	syncAuthUserCredentialsDb
} from '../utils/supabaseDb.js';

if (!isDatabaseEnabled) {
	// La app funciona, pero no podrá leer ni persistir datos sin variables PUBLIC_SUPABASE_*
	console.warn('Supabase no está configurado. Los stores se iniciarán vacíos.');
}

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

function buildZoneClientMetricsRows(allClients = [], allOrders = []) {
	// Métricas agregadas por cliente para el dashboard de administración
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);

	return allClients.map((client) => {
		const clientOrders = allOrders.filter((order) => Number(order.clientId) === Number(client.id));

		return {
			id: `metric-${client.id}`,
			clientId: client.id,
			zoneId: Number(client.zone) || 1,
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

function createProductsStore() {
	const { subscribe, update, set } = writable([]);

	if (isDatabaseEnabled) {
		// Hidratación inicial desde DB al crear el store
		void fetchProductsDb()
			.then((dbProducts) => set(dbProducts))
			.catch((error) => console.error('No se pudieron cargar productos desde Supabase:', error));
	}

	return {
		subscribe,
		getAll: () => {
			let allProducts = [];
			subscribe((p) => {
				allProducts = p;
			})();
			return allProducts;
		},
		getById: (productId) => {
			let product = null;
			subscribe((products) => {
				product = products.find((p) => Number(p.id) === Number(productId));
			})();
			return product;
		},
		decreaseStock: (productId, quantity) => {
			const parsedQuantity = Number(quantity) || 0;
			if (parsedQuantity <= 0) return;

			let updatedProduct = null;
			update((products) =>
				products.map((p) => {
					if (Number(p.id) !== Number(productId)) return p;
					updatedProduct = { ...p, stock: Math.max(0, Number(p.stock) - parsedQuantity) };
					return updatedProduct;
				})
			);

			if (isDatabaseEnabled && updatedProduct) {
				// Estrategia optimista: actualiza UI primero y sincroniza en segundo plano
				void upsertProductDb(updatedProduct).catch((error) =>
					console.error('No se pudo actualizar stock en Supabase:', error)
				);
			}
		},
		increaseStock: (productId, quantity) => {
			const parsedQuantity = Number(quantity) || 0;
			if (parsedQuantity <= 0) return;

			let updatedProduct = null;
			update((products) =>
				products.map((p) => {
					if (Number(p.id) !== Number(productId)) return p;
					updatedProduct = { ...p, stock: Math.max(0, Number(p.stock) + parsedQuantity) };
					return updatedProduct;
				})
			);

			if (isDatabaseEnabled && updatedProduct) {
				void upsertProductDb(updatedProduct).catch((error) =>
					console.error('No se pudo actualizar stock en Supabase:', error)
				);
			}
		},
		updateProduct: (productId, updates) => {
			let updatedProduct = null;

			update((products) =>
				products.map((p) => {
					if (Number(p.id) !== Number(productId)) return p;

					updatedProduct = {
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
					return updatedProduct;
				})
			);

			if (isDatabaseEnabled && updatedProduct) {
				void upsertProductDb(updatedProduct).catch((error) =>
					console.error('No se pudo guardar producto en Supabase:', error)
				);
			}
		},
		create: (payload) => {
			let newProductId = 0;
			let createdProduct = null;

			update((products) => {
				const maxId = Math.max(...products.map((p) => Number(p.id)), 0);
				newProductId = maxId + 1;

				createdProduct = {
					id: newProductId,
					name: payload.name?.trim() || `Producto ${newProductId}`,
					category: payload.category?.trim() || 'General',
					unit: payload.unit?.trim() || 'unidad',
					stock: Math.max(0, Number(payload.stock) || 0),
					minStock: Math.max(0, Number(payload.minStock) || 0),
					price: Math.max(0, Number(payload.price) || 0),
					description: payload.description?.trim() || ''
				};

				return [...products, createdProduct];
			});

			if (isDatabaseEnabled && createdProduct) {
				void upsertProductDb(createdProduct).catch((error) =>
					console.error('No se pudo crear producto en Supabase:', error)
				);
			}

			return newProductId;
		},
		remove: (productId) => {
			update((products) => products.filter((p) => Number(p.id) !== Number(productId)));
			if (isDatabaseEnabled) {
				void deleteProductDb(productId).catch((error) =>
					console.error('No se pudo eliminar producto en Supabase:', error)
				);
			}
		},
		getLowStockProducts: () => {
			let lowStock = [];
			subscribe((products) => {
				lowStock = products.filter((p) => Number(p.stock) <= Number(p.minStock));
			})();
			return lowStock;
		}
	};
}

function createZonesStore() {
	const { subscribe, update, set } = writable([]);

	if (isDatabaseEnabled) {
		void fetchZonesDb()
			.then((dbZones) => set(dbZones))
			.catch((error) => console.error('No se pudieron cargar zonas desde Supabase:', error));
	}

	return {
		subscribe,
		getAll: () => {
			let allZones = [];
			subscribe((z) => {
				allZones = z;
			})();
			return allZones;
		},
		getById: (zoneId) => {
			let zone = null;
			subscribe((zones) => {
				zone = zones.find((z) => Number(z.id) === Number(zoneId));
			})();
			return zone;
		},
		getNextDelivery: (zoneId) => {
			let nextDelivery = null;
			subscribe((zones) => {
				const zone = zones.find((z) => Number(z.id) === Number(zoneId));
				nextDelivery = zone?.nextDelivery || null;
			})();
			return nextDelivery;
		},
		create: (payload) => {
			let newZoneId = 0;
			let createdZone = null;

			update((zones) => {
				const maxId = Math.max(...zones.map((z) => Number(z.id)), 0);
				newZoneId = maxId + 1;

				// Permite entrada en formato array o CSV desde formularios
				const deliveryDays = Array.isArray(payload.deliveryDays)
					? payload.deliveryDays
					: String(payload.deliveryDays || '')
							.split(',')
							.map((day) => day.trim())
							.filter(Boolean);

				createdZone = {
					id: newZoneId,
					name: payload.name?.trim() || `Zona ${newZoneId}`,
					deliveryDays,
					deliveryTime: payload.deliveryTime?.trim() || '',
					notes: payload.notes?.trim() || '',
					description: payload.notes?.trim() || '',
					address: payload.address?.trim() || '',
					nextDelivery: payload.nextDelivery || null
				};

				return [...zones, createdZone];
			});

			if (isDatabaseEnabled && createdZone) {
				void upsertZoneDb(createdZone).catch((error) =>
					console.error('No se pudo crear zona en Supabase:', error)
				);
			}

			return newZoneId;
		},
		updateZone: (zoneId, updates) => {
			let updatedZone = null;

			update((zones) =>
				zones.map((zone) => {
					if (Number(zone.id) !== Number(zoneId)) return zone;

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

					updatedZone = {
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

					return updatedZone;
				})
			);

			if (isDatabaseEnabled && updatedZone) {
				void upsertZoneDb(updatedZone).catch((error) =>
					console.error('No se pudo actualizar zona en Supabase:', error)
				);
			}
		},
		remove: (zoneId) => {
			update((zones) => zones.filter((zone) => Number(zone.id) !== Number(zoneId)));
			if (isDatabaseEnabled) {
				void deleteZoneDb(zoneId).catch((error) =>
					console.error('No se pudo eliminar zona en Supabase:', error)
				);
			}
		}
	};
}

function createClientsStore() {
	function normalizeGpsCoordinate(value, type) {
		// Normaliza y valida coordenadas para evitar guardar valores inválidos
		if (value === '' || value === null || value === undefined) return null;

		const parsed = Number.parseFloat(value);
		if (Number.isNaN(parsed)) return null;

		const min = type === 'lat' ? -90 : -180;
		const max = type === 'lat' ? 90 : 180;
		if (parsed < min || parsed > max) return null;

		return Number(parsed.toFixed(6));
	}

	const { subscribe, update, set } = writable([]);

	if (isDatabaseEnabled) {
		void fetchClientsDb()
			.then((dbClients) => set(dbClients))
			.catch((error) => console.error('No se pudieron cargar clientes desde Supabase:', error));
	}

	return {
		subscribe,
		getAll: () => {
			let allClients = [];
			subscribe((clients) => {
				allClients = clients;
			})();
			return allClients;
		},
		create: (payload) => {
			let newClientId = 0;
			let createdClient = null;

			update((clients) => {
				const maxId = Math.max(...clients.map((client) => Number(client.id)), 100);
				newClientId = maxId + 1;

				// Fallback defensivo: si no se envía zona, toma la primera disponible
				const firstZone = zonesStore.getAll()[0]?.id || 1;
				createdClient = {
					id: newClientId,
					email: payload.email?.trim() || '',
					password: payload.password?.trim() || '',
					name: payload.name?.trim() || `Cliente ${newClientId}`,
					role: 'client',
					isActive: true,
					zone: Number(payload.zone) || firstZone,
					phone: payload.phone?.trim() || '',
					address: payload.address?.trim() || '',
					gpsLat: normalizeGpsCoordinate(payload.gpsLat, 'lat'),
					gpsLng: normalizeGpsCoordinate(payload.gpsLng, 'lng'),
					createdAt: new Date()
				};

				return [...clients, createdClient];
			});

			if (isDatabaseEnabled && createdClient) {
				void upsertClientDb(createdClient)
					.then(async () => {
						try {
							await ensureAuthUserExistsDb(createdClient.email, createdClient.password);
						} catch (error) {
							console.error('No se pudo provisionar Auth para cliente:', error);
						}
					})
					.catch((error) => console.error('No se pudo guardar el cliente en Supabase:', error));
			}

			return newClientId;
		},
		updateClient: (clientId, updates) => {
			let updatedClient = null;
			let previousClient = null;

			update((clients) =>
				clients.map((client) => {
					if (Number(client.id) !== Number(clientId)) return client;

					previousClient = client;

					updatedClient = {
						...client,
						...updates,
						email: typeof updates.email === 'string' ? updates.email.trim() : client.email,
						password: typeof updates.password === 'string' ? updates.password.trim() : client.password,
						name: typeof updates.name === 'string' ? updates.name.trim() : client.name,
						isActive:
							typeof updates.isActive === 'boolean' ? updates.isActive : (client.isActive !== false),
						zone: Number.isFinite(Number(updates.zone)) ? Number(updates.zone) : client.zone,
						phone: typeof updates.phone === 'string' ? updates.phone.trim() : (client.phone ?? ''),
						address:
							typeof updates.address === 'string' ? updates.address.trim() : (client.address ?? ''),
						gpsLat:
							updates.gpsLat !== undefined
								? normalizeGpsCoordinate(updates.gpsLat, 'lat')
								: (client.gpsLat ?? null),
						gpsLng:
							updates.gpsLng !== undefined
								? normalizeGpsCoordinate(updates.gpsLng, 'lng')
								: (client.gpsLng ?? null)
					};

					return updatedClient;
				})
			);

			if (isDatabaseEnabled && updatedClient) {
				void upsertClientDb(updatedClient)
					.then(async () => {
						const emailChanged =
							String(previousClient?.email || '').trim().toLowerCase() !==
							String(updatedClient.email || '').trim().toLowerCase();
						const passwordChanged =
							typeof updates.password === 'string' && updates.password.trim().length > 0;

						if (emailChanged || passwordChanged) {
							const syncResult = await syncAuthUserCredentialsDb(
								previousClient?.email,
								updatedClient.email,
								passwordChanged ? updates.password : ''
							);

							if (syncResult?.ok === false && syncResult.reason === 'missing-explicit-password') {
								console.warn(
									'Sincronización Auth omitida para cliente: requiere contraseña explícita al cambiar credenciales.'
								);
							}
						}
					})
					.catch((error) => console.error('No se pudo actualizar el cliente en Supabase:', error));
			}
		},
		remove: async (clientId) => {
			const clientOrders = ordersStore.getByClient(clientId);
			const blockedOrders = clientOrders.filter(
				(order) => order.status !== 'cancelled' && order.status !== 'returned'
			);

			if (blockedOrders.length > 0) {
				// No se puede borrar cliente si conserva pedidos activos, en reparto o entregados.
				return {
					success: false,
					reason: 'has_non_cancelled_orders',
					error: 'El cliente tiene pedidos no cancelados asociados'
				};
			}

			const purgeableOrders = clientOrders.filter(
				(order) => order.status === 'cancelled' || order.status === 'returned'
			);

			if (isDatabaseEnabled) {
				try {
					if (purgeableOrders.length > 0) {
						await deleteCancelledOrdersByClientDb(clientId);
					}

					await deleteClientDb(clientId);
				} catch (error) {
					console.error('No se pudo eliminar el cliente en Supabase:', error);
					return { success: false, error: error?.message || 'No se pudo eliminar en base de datos' };
				}
			}

			if (purgeableOrders.length > 0) {
				ordersStore.pruneClosedByClient(clientId);
			}

			update((clients) => clients.filter((client) => Number(client.id) !== Number(clientId)));
			return { success: true, deletedClosedOrders: purgeableOrders.length };
		},
		setActive: async (clientId, isActive) => {
			let targetClient = null;

			subscribe((clients) => {
				targetClient = clients.find((client) => Number(client.id) === Number(clientId)) || null;
			})();

			if (!targetClient) {
				return { success: false, error: 'Cliente no encontrado' };
			}

			const updatedClient = { ...targetClient, isActive: Boolean(isActive) };

			if (isDatabaseEnabled) {
				try {
					await upsertClientDb(updatedClient);
				} catch (error) {
					console.error('No se pudo actualizar estado activo del cliente en Supabase:', error);
					return {
						success: false,
						error: error?.message || 'No se pudo actualizar estado del cliente'
					};
				}
			}

			update((clients) =>
				clients.map((client) =>
					Number(client.id) === Number(clientId) ? { ...client, isActive: Boolean(isActive) } : client
				)
			);

			return { success: true };
		},
		syncCredentials: async (clientId, nextEmail, nextPassword = '') => {
			let targetClient = null;

			subscribe((clients) => {
				targetClient = clients.find((client) => Number(client.id) === Number(clientId)) || null;
			})();

			if (!targetClient) {
				return { success: false, reason: 'client-not-found' };
			}

			try {
				const syncResult = await syncAuthUserCredentialsDb(
					targetClient.email,
					nextEmail,
					nextPassword
				);

				if (syncResult?.ok === false && syncResult.reason === 'missing-explicit-password') {
					return { success: false, reason: 'missing-explicit-password' };
				}

				return { success: true };
			} catch (error) {
				console.error('No se pudo sincronizar credenciales Auth de cliente:', error);
				return { success: false, reason: 'sync-failed' };
			}
		}
	};
}

function createOrdersStore() {
	const { subscribe, update, set } = writable([]);

	if (isDatabaseEnabled) {
		void fetchOrdersDb()
			.then((dbOrders) => set(dbOrders))
			.catch((error) => console.error('No se pudieron cargar pedidos desde Supabase:', error));
	}

	return {
		subscribe,
		getAll: () => {
			let allOrders = [];
			subscribe((o) => {
				allOrders = o;
			})();
			return allOrders;
		},
		getByClient: (clientId) => {
			let clientOrders = [];
			subscribe((orders) => {
				clientOrders = orders.filter((o) => Number(o.clientId) === Number(clientId));
			})();
			return clientOrders;
		},
		getPendingByClient: (clientId) => {
			let pendingOrders = [];
			subscribe((orders) => {
				pendingOrders = orders.filter(
					(o) => Number(o.clientId) === Number(clientId) && o.status === 'pending'
				);
			})();
			return pendingOrders;
		},
		create: (clientId, items, notes = '') => {
			let newOrderId = 0;
			let createdOrder = null;

			update((orders) => {
				const maxId = Math.max(...orders.map((o) => Number(o.id)), 1000);
				newOrderId = maxId + 1;

				let totalAmount = 0;
				// Congela el precio unitario al crear el pedido para preservar histórico
				const processedItems = items.map((item) => {
					const product = productsStore.getById(item.productId);
					const unitPrice = Number(product?.price || 0);
					totalAmount += unitPrice * Number(item.quantity || 0);
					return {
						productId: Number(item.productId),
						quantity: Number(item.quantity),
						unitPrice
					};
				});

				const client = clientsStore.getAll().find((c) => Number(c.id) === Number(clientId));
				const clientZone = zonesStore.getById(client?.zone);
				const scheduledDelivery = clientZone?.nextDelivery || null;

				createdOrder = {
					id: newOrderId,
					clientId: Number(clientId),
					status: 'pending',
					items: processedItems,
					createdAt: new Date(),
					scheduledDelivery,
					totalAmount,
					notes,
					cancelRequestStatus: null,
					cancelRequestedAt: null,
					cancelDecisionAt: null,
					cancelSource: null
				};

				return [...orders, createdOrder];
			});

			if (isDatabaseEnabled && createdOrder) {
				void insertOrderWithItemsDb(createdOrder).catch((error) =>
					console.error('No se pudo guardar el pedido en Supabase:', error)
				);
			}

			return newOrderId;
		},
		updateStatus: (orderId, newStatus) => {
			let targetOrder = null;
			let deliveredAt = null;
			let updatedOrder = null;

			update((orders) =>
				orders.map((o) => {
					if (Number(o.id) !== Number(orderId)) return o;

					targetOrder = o;
					updatedOrder = {
						...o,
						status: newStatus,
						deliveredAt: newStatus === 'delivered' ? (deliveredAt = new Date()) : o.deliveredAt,
						cancelSource: newStatus === 'cancelled' ? (o.cancelSource || 'admin') : o.cancelSource
					};
					return updatedOrder;
				})
			);

			if (isDatabaseEnabled && updatedOrder) {
				void patchOrderDb(orderId, {
					status: newStatus,
					delivered_at: deliveredAt ? deliveredAt.toISOString() : null,
					cancel_source: newStatus === 'cancelled' ? (targetOrder?.cancelSource || 'admin') : null
				}).catch((error) => console.error('No se pudo actualizar estado del pedido en Supabase:', error));
			}

			if (
				targetOrder &&
				targetOrder.status !== 'delivered' &&
				newStatus === 'delivered' &&
				Array.isArray(targetOrder.items)
			) {
				// Descuenta stock solo en transición a entregado (evita doble descuento)
				targetOrder.items.forEach((item) => {
					productsStore.decreaseStock(item.productId, item.quantity);
				});
			}
		},
		markInDelivery: (orderId) => {
			update((orders) =>
				orders.map((o) => (Number(o.id) === Number(orderId) ? { ...o, status: 'in_delivery' } : o))
			);

			if (isDatabaseEnabled) {
				void patchOrderDb(orderId, { status: 'in_delivery' }).catch((error) =>
					console.error('No se pudo marcar pedido en reparto en Supabase:', error)
				);
			}
		},
		updateDeliveryNote: (orderId, note) => {
			const noteAt = new Date();

			update((orders) =>
				orders.map((o) =>
					Number(o.id) === Number(orderId)
						? { ...o, deliveryNote: String(note || '').trim(), deliveryNoteAt: noteAt }
						: o
				)
			);

			if (isDatabaseEnabled) {
				void patchOrderDb(orderId, {
					delivery_note: String(note || '').trim(),
					delivery_note_at: noteAt.toISOString()
				}).catch((error) => console.error('No se pudo guardar nota de entrega en Supabase:', error));
			}
		},
		requestCancellation: (orderId, clientId) => {
			let changed = false;
			const requestedAt = new Date();

			update((orders) =>
				orders.map((order) => {
					if (Number(order.id) !== Number(orderId) || Number(order.clientId) !== Number(clientId)) return order;
					if (order.status === 'delivered' || order.status === 'cancelled') return order;
					if (order.cancelRequestStatus === 'pending' || order.cancelRequestStatus === 'rejected') return order;

					changed = true;
					return {
						...order,
						cancelRequestStatus: 'pending',
						cancelRequestedAt: requestedAt,
						cancelDecisionAt: null
					};
				})
			);

			if (isDatabaseEnabled && changed) {
				// Solo persiste si hubo transición real de estado
				void patchOrderDb(orderId, {
					cancel_request_status: 'pending',
					cancel_requested_at: requestedAt.toISOString(),
					cancel_decision_at: null
				}).catch((error) =>
					console.error('No se pudo registrar solicitud de anulación en Supabase:', error)
				);
			}
		},
		resolveCancellationRequest: (orderId, approved) => {
			let changed = false;
			const decisionAt = new Date();

			update((orders) =>
				orders.map((order) => {
					if (Number(order.id) !== Number(orderId) || order.cancelRequestStatus !== 'pending') return order;

					changed = true;
					if (approved) {
						return {
							...order,
							status: 'cancelled',
							cancelSource: 'client',
							cancelRequestStatus: 'approved',
							cancelDecisionAt: decisionAt
						};
					}

					return {
						...order,
						cancelRequestStatus: 'rejected',
						cancelDecisionAt: decisionAt
					};
				})
			);

			if (isDatabaseEnabled && changed) {
				if (approved) {
					void patchOrderDb(orderId, {
						status: 'cancelled',
						cancel_source: 'client',
						cancel_request_status: 'approved',
						cancel_decision_at: decisionAt.toISOString()
					}).catch((error) => console.error('No se pudo aprobar anulación en Supabase:', error));
				} else {
					void patchOrderDb(orderId, {
						cancel_request_status: 'rejected',
						cancel_decision_at: decisionAt.toISOString()
					}).catch((error) => console.error('No se pudo denegar anulación en Supabase:', error));
				}
			}
		},
		deletePermanent: async (orderId) => {
			// Borrado real: elimina pedido e items relacionados (FK cascade en order_items).
			if (isDatabaseEnabled) {
				try {
					await deleteOrderDb(orderId);
				} catch (error) {
					console.error('No se pudo eliminar pedido permanentemente en Supabase:', error);
					return { success: false, error: error?.message || 'No se pudo eliminar pedido' };
				}
			}

			update((orders) => orders.filter((order) => Number(order.id) !== Number(orderId)));
			return { success: true };
		},
		pruneClosedByClient: (clientId) => {
			// Se usa al eliminar cliente: limpia pedidos cerrados (cancelados/devueltos) ya purgados en DB.
			update((orders) =>
				orders.filter(
					(order) =>
					!(
						Number(order.clientId) === Number(clientId) &&
						(order.status === 'cancelled' || order.status === 'returned')
					)
				)
			);
		},
		getPending: () => {
			let pendingOrders = [];
			subscribe((orders) => {
				pendingOrders = orders.filter((o) => o.status === 'pending');
			})();
			return pendingOrders;
		},
		getClientTotals: () => {
			let totals = [];
			subscribe((orders) => {
				const grouped = orders.reduce((acc, order) => {
					if (!acc[order.clientId]) {
						acc[order.clientId] = { totalOrders: 0, totalAmount: 0, pendingAmount: 0 };
					}
					acc[order.clientId].totalOrders += 1;
					acc[order.clientId].totalAmount += Number(order.totalAmount || 0);
					if (order.status === 'pending') {
						acc[order.clientId].pendingAmount += Number(order.totalAmount || 0);
					}
					return acc;
				}, {});

				totals = Object.entries(grouped).map(([clientId, data]) => ({
					clientId: Number(clientId),
					...data
				}));
			})();
			return totals;
		}
	};
}

function createIncidentsStore() {
	const { subscribe, update, set } = writable([]);

	if (isDatabaseEnabled) {
		void fetchIncidentsDb()
			.then((dbIncidents) => set(dbIncidents))
			.catch((error) => console.error('No se pudieron cargar incidencias desde Supabase:', error));
	}

	return {
		subscribe,
		getAll: () => {
			let allIncidents = [];
			subscribe((i) => {
				allIncidents = i;
			})();
			return allIncidents;
		},
		getOpen: () => {
			let openIncidents = [];
			subscribe((incidents) => {
				openIncidents = incidents.filter((i) => i.status === 'open');
			})();
			return openIncidents;
		},
		getActiveByOrderId: (orderId) => {
			let incident = null;
			subscribe((incidents) => {
				incident =
					incidents.find(
						(i) => Number(i.orderId) === Number(orderId) && String(i.status) !== 'resolved'
					) || null;
			})();
			return incident;
		},
		create: async (orderId, clientId, type, description, priority = 'medium') => {
			let newIncident = null;
			let result = { ok: false, reason: 'unknown', incident: null };

			update((incidents) => {
				const activeIncident = incidents.find(
					(incident) =>
						Number(incident.orderId) === Number(orderId) && String(incident.status) !== 'resolved'
				);

				if (activeIncident) {
					result = { ok: false, reason: 'active-incident-exists', incident: activeIncident };
					return incidents;
				}

				const maxId = Math.max(...incidents.map((i) => Number(i.id)), 300);
				newIncident = {
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
				result = { ok: true, reason: null, incident: newIncident };
				return [...incidents, newIncident];
			});

			if (isDatabaseEnabled && newIncident) {
				try {
					await insertIncidentDb(newIncident);
				} catch (error) {
					console.error('No se pudo crear incidencia en Supabase:', error);
					update((incidents) => incidents.filter((incident) => Number(incident.id) !== Number(newIncident.id)));
					return { ok: false, reason: 'db-insert-failed', incident: null };
				}
			}

			return result;
		},
		resolve: (incidentId) => {
			const resolvedAt = new Date();
			// Mantiene trazabilidad temporal de resolución para reporting
			update((incidents) =>
				incidents.map((i) =>
					Number(i.id) === Number(incidentId) ? { ...i, status: 'resolved', resolvedAt } : i
				)
			);

			if (isDatabaseEnabled) {
				void patchIncidentDb(incidentId, {
					status: 'resolved',
					resolved_at: resolvedAt.toISOString()
				}).catch((error) => console.error('No se pudo resolver incidencia en Supabase:', error));
			}
		}
	};
}

function createZoneClientMetricsStore() {
	const { subscribe, update, set } = writable([]);

	return {
		subscribe,
		rebuildWithClients: (allClients) => {
			// Recalcula métricas cruzando clientes actuales contra snapshot de pedidos
			set(buildZoneClientMetricsRows(allClients || [], ordersStore.getAll()));
		},
		addRow: (payload = {}) => {
			update((rows) => {
				const firstClient = clientsStore.getAll()[0];
				const firstZone = zonesStore.getAll()[0];
				const newId =
					typeof crypto !== 'undefined' && crypto.randomUUID
						? crypto.randomUUID()
						: `metric-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

				const newRow = {
					id: newId,
					clientId: payload.clientId || firstClient?.id || null,
					zoneId: payload.zoneId || firstClient?.zone || firstZone?.id || 1,
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
					if (row.id !== rowId) return row;

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
			set(buildZoneClientMetricsRows(clientsStore.getAll(), ordersStore.getAll()));
		},
		getAll: () => {
			let rows = [];
			subscribe((data) => {
				rows = data;
			})();
			return rows;
		}
	};
}

function createDeliveryStaffStore() {
	const { subscribe, update, set } = writable([]);

	if (isDatabaseEnabled) {
		void fetchDeliveryStaffDb()
			.then((dbStaff) => set(dbStaff))
			.catch((error) => console.error('No se pudieron cargar repartidores desde Supabase:', error));
	}

	return {
		subscribe,
		getAll: () => {
			let allStaff = [];
			subscribe((staff) => {
				allStaff = staff;
			})();
			return allStaff;
		},
		getFreeStaff: () => {
			let freeStaff = [];
			subscribe((staff) => {
				freeStaff = staff.filter((s) => s.zoneId === null);
			})();
			return freeStaff;
		},
		getByZone: (zoneId) => {
			let zoneStaff = [];
			subscribe((staff) => {
				zoneStaff = staff.filter((s) => Number(s.zoneId) === Number(zoneId));
			})();
			return zoneStaff;
		},
		getById: (staffId) => {
			let staff = null;
			subscribe((allStaff) => {
				staff = allStaff.find((s) => Number(s.id) === Number(staffId));
			})();
			return staff;
		},
		assignZone: (staffId, zoneId) => {
			let updatedStaff = null;
			update((staff) =>
				staff.map((s) => {
					if (Number(s.id) !== Number(staffId)) return s;
					updatedStaff = { ...s, zoneId: zoneId === null ? null : Number(zoneId) };
					return updatedStaff;
				})
			);

			if (isDatabaseEnabled && updatedStaff) {
				// La zona se guarda sobre users.zone_id vía upsertDeliveryStaffDb
				void upsertDeliveryStaffDb(updatedStaff).catch((error) =>
					console.error('No se pudo reasignar repartidor en Supabase:', error)
				);
			}
		},
		updateStatus: (staffId, newStatus) => {
			let updatedStaff = null;
			update((staff) =>
				staff.map((s) => {
					if (Number(s.id) !== Number(staffId)) return s;
					updatedStaff = { ...s, status: newStatus };
					return updatedStaff;
				})
			);

			if (isDatabaseEnabled && updatedStaff) {
				void upsertDeliveryStaffDb(updatedStaff).catch((error) =>
					console.error('No se pudo actualizar estado del repartidor en Supabase:', error)
				);
			}
		},
		updateStaff: (staffId, updates) => {
			let updatedStaff = null;
			let previousStaff = null;

			update((staff) =>
				staff.map((member) => {
					if (Number(member.id) !== Number(staffId)) return member;

					previousStaff = member;

					updatedStaff = {
						...member,
						...updates,
						name: typeof updates.name === 'string' ? updates.name.trim() : member.name,
						email: typeof updates.email === 'string' ? updates.email.trim() : member.email,
						password:
							typeof updates.password === 'string' && updates.password.trim().length > 0
								? updates.password.trim()
								: member.password,
						phone: typeof updates.phone === 'string' ? updates.phone.trim() : member.phone,
						vehicle: typeof updates.vehicle === 'string' ? updates.vehicle.trim() : member.vehicle,
						status: typeof updates.status === 'string' ? updates.status : member.status,
						zoneId:
							updates.zoneId === '' || updates.zoneId === null || updates.zoneId === undefined
								? null
								: Number(updates.zoneId)
					};

					return updatedStaff;
				})
			);

			if (isDatabaseEnabled && updatedStaff) {
				void upsertDeliveryStaffDb(updatedStaff)
					.then(async () => {
						const emailChanged =
							String(previousStaff?.email || '').trim().toLowerCase() !==
							String(updatedStaff.email || '').trim().toLowerCase();
						const passwordChanged =
							typeof updates.password === 'string' && updates.password.trim().length > 0;

						if (emailChanged || passwordChanged) {
							try {
								await syncAuthUserCredentialsDb(
									previousStaff?.email,
									updatedStaff.email,
									passwordChanged ? updates.password : ''
								);
							} catch (error) {
								console.error('No se pudo sincronizar credenciales Auth de repartidor:', error);
							}
						}
					})
					.catch((error) => console.error('No se pudo actualizar repartidor en Supabase:', error));
			}
		},
		create: (payload) => {
			let newStaffId = 0;
			let newStaffMember = null;

			update((staff) => {
				const maxId = Math.max(...staff.map((item) => Number(item.id)), 200);
				newStaffId = maxId + 1;

				newStaffMember = {
					id: newStaffId,
					name: payload.name?.trim() || `Repartidor ${newStaffId}`,
					zoneId: payload.zoneId === null || payload.zoneId === '' ? null : Number(payload.zoneId),
					email: payload.email?.trim() || '',
					password: payload.password?.trim() || '',
					phone: payload.phone?.trim() || '',
					vehicle: payload.vehicle?.trim() || 'Vehiculo sin definir',
					status: payload.status?.trim() || 'active'
				};

				return [...staff, newStaffMember];
			});

			if (isDatabaseEnabled && newStaffMember) {
				void upsertDeliveryStaffDb(newStaffMember)
					.then(async () => {
						try {
							await ensureAuthUserExistsDb(newStaffMember.email, newStaffMember.password);
						} catch (error) {
							console.error('No se pudo provisionar Auth para repartidor:', error);
						}
					})
					.catch((error) => console.error('No se pudo crear repartidor en Supabase:', error));
			}

			return newStaffId;
		},
		remove: (staffId) => {
			update((staff) => staff.filter((member) => Number(member.id) !== Number(staffId)));
			if (isDatabaseEnabled) {
				void deleteDeliveryStaffDb(staffId).catch((error) =>
					console.error('No se pudo eliminar repartidor en Supabase:', error)
				);
			}
		}
	};
}

export const productsStore = createProductsStore();
export const zonesStore = createZonesStore();
export const clientsStore = createClientsStore();
export const ordersStore = createOrdersStore();
export const incidentsStore = createIncidentsStore();
export const zoneClientMetricsStore = createZoneClientMetricsStore();
export const deliveryStaffStore = createDeliveryStaffStore();

export const lowStockProducts = derived(productsStore, ($products) =>
	$products.filter((p) => Number(p.stock) <= Number(p.minStock))
);

export const pendingOrders = derived(ordersStore, ($orders) =>
	$orders.filter((o) => o.status === 'pending')
);

export const openIncidents = derived(incidentsStore, ($incidents) =>
	$incidents.filter((i) => i.status === 'open')
);
