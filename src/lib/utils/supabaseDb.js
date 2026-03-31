/**
 * Thin PostgREST wrapper for Supabase.
 * Central data source for all app entities.
 */

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { supabaseClient } from './supabaseClient.js';

const SUPABASE_URL = PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY =
	PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const isDatabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/**
 * Construye la URL para llamadas PostgREST a Supabase.
 * @param {string} path - Ruta relativa de la endpoint
 * @returns {string} URL completa de PostgREST
 */
function buildUrl(path) {
	return `${SUPABASE_URL}/rest/v1/${path}`;
}

/**
 * Construye la URL para llamadas de autenticación de Supabase.
 * @param {string} path - Ruta relativa de la endpoint de auth
 * @returns {string} URL completa de autenticación
 */
function buildAuthUrl(path) {
	return `${SUPABASE_URL}/auth/v1/${path}`;
}

/**
 * Realiza una solicitud HTTP genérica a PostgREST de Supabase.
 * Utiliza el token de sesión del usuario autenticado si está disponible,
 * en caso contrario usa la clave API publicable.
 * @param {string} path - Ruta de la endpoint
 * @param {Object} options - Opciones de la solicitud (method, headers, body)
 * @returns {Promise<any>} Respuesta JSON o null si hay error o no hay datos
 */
async function request(path, options = {}) {
	if (!isDatabaseEnabled) {
		return null;
	}

	// Obtener token de sesión del usuario autenticado
	let bearerToken = SUPABASE_PUBLISHABLE_KEY;
	if (supabaseClient) {
		try {
			const {
				data: { session }
			} = await supabaseClient.auth.getSession();
			if (session?.access_token) {
				bearerToken = session.access_token;
			}
		} catch (error) {
			console.error('No se pudo recuperar la sesión de Supabase Auth:', error);
		}
	}

	// Preparar headers con autenticación
	const headers = {
		apikey: SUPABASE_PUBLISHABLE_KEY,
		Authorization: `Bearer ${bearerToken}`,
		'Content-Type': 'application/json',
		...options.headers
	};

	// Realizar solicitud HTTP
	const response = await fetch(buildUrl(path), {
		method: options.method || 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined
	});

	// Manejar errores HTTP
	if (!response.ok) {
		const message = await response.text();
		throw new Error(`Supabase request failed (${response.status}): ${message}`);
	}

	// Respuesta 204 No Content - sin datos
	if (response.status === 204) {
		return null;
	}

	// Parsear respuesta JSON
	const text = await response.text();
	if (!text) {
		return null;
	}

	return JSON.parse(text);
}

/**
 * Mapea una fila de cliente desde la BD a objeto de aplicación.
 * Convierte nombres de columnas snake_case a camelCase.
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} Objeto cliente normalizado
 */
function mapClientRow(row) {
	return {
		id: Number(row.id),
		email: row.email || '',
		password: '', // Nunca retornar contraseña
		name: row.name || '',
		role: 'client',
		isActive: row.isActive !== false,
		zone: Number(row.zone) || 1,
		phone: row.phone || '',
		address: row.address || '',
		gpsLat: row.gpsLat ?? null,
		gpsLng: row.gpsLng ?? null,
		createdAt: row.created_at ? new Date(row.created_at) : new Date()
	};
}

/**
 * Mapea una fila de orden desde la BD a objeto de aplicación.
 * Normaliza nombres de campos y convierte fechas a Date.
 * Mapea también los artículos asociados de la orden.
 * @param {Object} row - Fila de la base de datos con relaciones anidadas
 * @returns {Object} Objeto orden normalizado
 */
function mapOrderRow(row) {
	return {
		id: Number(row.id),
		clientId: Number(row.client_id),
		status: row.status, // pending, delivered, cancelled, returned
		// Mapear artículos anidados de order_items
		items: Array.isArray(row.order_items)
			? row.order_items.map((item) => ({
				productId: Number(item.product_id),
				quantity: Number(item.quantity),
				unitPrice: Number(item.unit_price)
			}))
			: [],
		createdAt: row.created_at ? new Date(row.created_at) : new Date(),
		scheduledDelivery: row.scheduled_delivery ? new Date(row.scheduled_delivery) : null,
		deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
		totalAmount: Number(row.total_amount || 0),
		notes: row.notes || '', // Notas del cliente
		deliveryNote: row.delivery_note || '', // Nota de entrega
		deliveryNoteAt: row.delivery_note_at ? new Date(row.delivery_note_at) : null,
		cancelRequestStatus: row.cancel_request_status || null, // pending, approved, rejected
		cancelRequestedAt: row.cancel_requested_at ? new Date(row.cancel_requested_at) : null,
		cancelDecisionAt: row.cancel_decision_at ? new Date(row.cancel_decision_at) : null,
		cancelSource: row.cancel_source || null // client, admin
	};
}

/**
 * Mapea una fila de producto desde la BD a objeto de aplicación.
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} Objeto producto normalizado
 */
function mapProductRow(row) {
	return {
		id: Number(row.id),
		name: row.name || '',
		category: row.category || '', // ej: lácteos, bebidas, etc.
		unit: row.unit || 'unidad', // ej: kg, litros, piezas
		stock: Number(row.stock || 0), // Stock actual
		minStock: Number(row.min_stock || 0), // Stock mínimo recomendado
		price: Number(row.price || 0), // Precio por unidad
		description: row.description || ''
	};
}

/**
 * Mapea una fila de zona desde la BD a objeto de aplicación.
 * Una zona representa un área geográfica de entrega.
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} Objeto zona normalizado
 */
function mapZoneRow(row) {
	return {
		id: Number(row.id),
		name: row.name || '', // Nombre descriptivo de la zona
		description: row.description || '',
		address: row.address || '', // Dirección central o referencia
		deliveryDays: Array.isArray(row.delivery_days) ? row.delivery_days : [], // Array de días (ej: [1,3,5])
		deliveryTime: row.delivery_time || '', // Horario de entrega (ej: "09:00-12:00")
		nextDelivery: row.next_delivery ? new Date(row.next_delivery) : null,
		notes: row.notes || ''
	};
}

/**
 * Mapea una fila de incidencia desde la BD a objeto de aplicación.
 * Una incidencia es un problema reportado con una orden (daño, pérdida, etc.).
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} Objeto incidencia normalizado
 */
function mapIncidentRow(row) {
	return {
		id: Number(row.id),
		orderId: Number(row.order_id),
		clientId: row.client_id != null ? Number(row.client_id) : null,
		type: row.type, // ej: damage, loss, delayed, etc.
		status: row.status, // open, in_progress, resolved, closed
		description: row.description || '',
		reportedAt: row.reported_at ? new Date(row.reported_at) : new Date(),
		resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
		priority: row.priority || 'medium' // low, medium, high
	};
}

/**
 * Mapea una fila de personal de entrega desde la BD a objeto de aplicación.
 * @param {Object} row - Fila de la base de datos
 * @returns {Object} Objeto personal de entrega normalizado
 */
function mapDeliveryStaffRow(row) {
	return {
		id: Number(row.id),
		name: row.name || '',
		zoneId: row.zoneId != null ? Number(row.zoneId) : null, // Zona asignada
		email: row.email || '',
		password: '', // Nunca retornar contraseña
		phone: row.phone || '',
		vehicle: row.vehicle || '', // Descripción del vehículo
		status: row.status || 'active' // active, inactive
	};
}

/**
 * Mapea una fila de usuario de autenticación desde la BD a objeto de aplicación.
 * Extrae información de perfil del usuario autenticado.
 * @param {Object} row - Fila de la base de datos con datos de usuario
 * @returns {Object|null} Objeto usuario normalizado o null si row está vacío
 */
function mapAuthUserRow(row) {
	if (!row) {
		return null;
	}

	const role = row.role || 'client'; // client, delivery, admin
	return {
		id: Number(row.id),
		email: row.email || '',
		name: row.name || '',
		role,
		zone: Number(row.zone_id) || 1,
		deliveryStaffId: role === 'delivery' ? Number(row.id) : null
	};
}

/**
 * Busca y autentica un usuario de aplicación por email y contraseña.
 * Llama a la función RPC app_auth_login en Supabase.
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object|null>} Usuario autenticado o null si no existe o credenciales inválidas
 */
export async function fetchAuthUserDb(email, password) {
	// Llamar a función RPC de autenticación
	const rows = await request('rpc/app_auth_login', {
		method: 'POST',
		body: {
			p_email: String(email || '').trim().toLowerCase(),
			p_password: String(password || '')
		}
	});

	if (!Array.isArray(rows) || rows.length === 0) {
		return null;
	}

	return mapAuthUserRow(rows[0]);
}

/**
 * Obtiene el perfil de usuario por ID de usuario de autenticación.
 * Llama a la función RPC app_profile_by_auth_user en Supabase.
 * @param {number} authUserId - ID del usuario de autenticación
 * @returns {Promise<Object|null>} Perfil del usuario o null si no existe
 */
export async function fetchProfileByAuthUserIdDb(authUserId) {
	const rows = await request('rpc/app_profile_by_auth_user', {
		method: 'POST',
		body: {
			p_auth_user_id: authUserId
		}
	});

	if (!Array.isArray(rows) || rows.length === 0) {
		return null;
	}

	return mapAuthUserRow(rows[0]);
}

/**
 * Obtiene todos los clientes de la BD.
 * Utiliza la vista clients_v para acceso seguro via RLS.
 * @returns {Promise<Array>} Array de clientes normalizados
 */
export async function fetchClientsDb() {
	const rows = await request('clients_v?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapClientRow) : [];
}

/**
 * Inserta o actualiza un cliente (upsert).
 * Si el ID existe, actualiza los datos; si no, crea uno nuevo.
 * La contraseña se sincroniza con el usuario de autenticación de Supabase Auth.
 * @param {Object} client - Objeto cliente a guardar
 * @param {number} client.id - ID del cliente
 * @param {string} client.email - Email del cliente
 * @param {string} client.name - Nombre del cliente
 * @param {boolean} client.isActive - Estado activo del cliente
 * @param {number} client.zone - Zona asignada
 * @param {string} [client.phone] - Teléfono del cliente
 * @param {string} [client.address] - Dirección del cliente
 * @param {number} [client.gpsLat] - Latitud GPS
 * @param {number} [client.gpsLng] - Longitud GPS
 * @param {string} [client.password] - Contraseña (solo si es nuevo o cambia)
 * @returns {Promise<void>}
 */
export async function upsertClientDb(client) {
	const payload = {
		id: client.id,
		email: client.email,
		name: client.name,
		role: 'client',
		is_active: client.isActive !== false,
		zone_id: client.zone,
		phone: client.phone || null,
		address: client.address || null,
		gps_lat: client.gpsLat,
		gps_lng: client.gpsLng,
		created_at: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString()
	};

	// Solo incluir contraseña si se proporciona
	const normalizedPassword = String(client.password || '').trim();
	if (normalizedPassword) {
		payload.password = normalizedPassword;
	}

	// Usar merge-duplicates para upsert
	await request('users', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: payload
	});
}

/**
 * Elimina un cliente por ID.
 * Elimina el registro de usuario (que puede ser cliente, delivery, o admin).
 * @param {number} clientId - ID del cliente a eliminar
 * @returns {Promise<void>}
 */
export async function deleteClientDb(clientId) {
	await request(`users?id=eq.${encodeURIComponent(clientId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

/**
 * Obtiene todas las órdenes con sus artículos asociados.
 * Usa relaciones anidadas para traer order_items en una sola llamada.
 * @returns {Promise<Array>} Array de órdenes normalizadas con sus artículos
 */
export async function fetchOrdersDb() {
	const rows = await request(
		'orders?select=id,client_id,status,created_at,scheduled_delivery,delivered_at,total_amount,notes,delivery_note,delivery_note_at,cancel_request_status,cancel_requested_at,cancel_decision_at,cancel_source,order_items(product_id,quantity,unit_price)&order=id.asc'
	);
	return Array.isArray(rows) ? rows.map(mapOrderRow) : [];
}

/**
 * Inserta una nueva orden con sus artículos asociados.
 * Realiza dos operaciones: crea la orden y luego sus artículos.
 * @param {Object} order - Objeto orden a insertar
 * @param {number} order.id - ID único de la orden
 * @param {number} order.clientId - ID del cliente
 * @param {string} order.status - Estado de la orden
 * @param {number} order.totalAmount - Monto total
 * @param {Array} order.items - Array de artículos
 * @param {Object} order.items[].productId - ID del producto
 * @param {number} order.items[].quantity - Cantidad
 * @param {number} order.items[].unitPrice - Precio unitario
 * @returns {Promise<void>}
 */
export async function insertOrderWithItemsDb(order) {
	// Insertar registro de orden
	await request('orders', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: {
			id: order.id,
			client_id: order.clientId,
			status: order.status,
			created_at: new Date(order.createdAt).toISOString(),
			scheduled_delivery: order.scheduledDelivery
				? new Date(order.scheduledDelivery).toISOString()
				: null,
			delivered_at: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
			total_amount: order.totalAmount,
			notes: order.notes || '',
			delivery_note: order.deliveryNote || null,
			delivery_note_at: order.deliveryNoteAt ? new Date(order.deliveryNoteAt).toISOString() : null,
			cancel_request_status: order.cancelRequestStatus,
			cancel_requested_at: order.cancelRequestedAt
				? new Date(order.cancelRequestedAt).toISOString()
				: null,
			cancel_decision_at: order.cancelDecisionAt
				? new Date(order.cancelDecisionAt).toISOString()
				: null,
			cancel_source: order.cancelSource
		}
	});

	// Insertar artículos de la orden
	if (Array.isArray(order.items) && order.items.length > 0) {
		await request('order_items', {
			method: 'POST',
			headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
			body: order.items.map((item) => ({
				order_id: order.id,
				product_id: item.productId,
				quantity: item.quantity,
				unit_price: item.unitPrice
			}))
		});
	}
}

/**
 * Actualiza parcialmente una orden (PATCH).
 * Solo actualiza los campos incluidos en el objeto patch.
 * @param {number} orderId - ID de la orden a actualizar
 * @param {Object} patch - Objeto con campos a actualizar
 * @returns {Promise<void>}
 */
export async function patchOrderDb(orderId, patch) {
	await request(`orders?id=eq.${encodeURIComponent(orderId)}`, {
		method: 'PATCH',
		headers: { Prefer: 'return=minimal' },
		body: patch
	});
}

/**
 * Elimina una orden por ID.
 * También elimina sus artículos por restricción de clave foránea.
 * @param {number} orderId - ID de la orden a eliminar
 * @returns {Promise<void>}
 */
export async function deleteOrderDb(orderId) {
	await request(`orders?id=eq.${encodeURIComponent(orderId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

/**
 * Elimina todas las órdenes canceladas o devueltas de un cliente.
 * Se usa típicamente al eliminar un cliente para limpiar registros.
 * @param {number} clientId - ID del cliente
 * @returns {Promise<void>}
 */
export async function deleteCancelledOrdersByClientDb(clientId) {
	await request(
		`orders?client_id=eq.${encodeURIComponent(clientId)}&status=in.(cancelled,returned)`,
		{
			method: 'DELETE',
			headers: { Prefer: 'return=minimal' }
		}
	);
}

/**
 * Obtiene todos los productos de la BD.
 * @returns {Promise<Array>} Array de productos normalizados
 */
export async function fetchProductsDb() {
	const rows = await request('products?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapProductRow) : [];
}

/**
 * Inserta o actualiza un producto (upsert).
 * Valida que los valores numéricos sean no-negativos.
 * @param {Object} product - Objeto producto a guardar
 * @param {number} product.id - ID del producto
 * @param {string} product.name - Nombre del producto
 * @param {string} [product.category] - Categoría del producto
 * @param {string} product.unit - Unidad de medida (ej: kg, litros, piezas)
 * @param {number} product.stock - Stock actual (≥ 0)
 * @param {number} product.minStock - Stock mínimo recomendado (≥ 0)
 * @param {number} product.price - Precio unitario (≥ 0)
 * @param {string} [product.description] - Descripción del producto
 * @returns {Promise<void>}
 */
export async function upsertProductDb(product) {
	await request('products', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: {
			id: product.id,
			name: String(product.name || '').trim(),
			category: String(product.category || '').trim() || null,
			unit: String(product.unit || 'unidad').trim(),
			stock: Math.max(0, Number(product.stock) || 0), // Asegurar no-negativo
			min_stock: Math.max(0, Number(product.minStock) || 0), // Asegurar no-negativo
			price: Math.max(0, Number(product.price) || 0), // Asegurar no-negativo
			description: String(product.description || '').trim() || null
		}
	});
}

/**
 * Elimina un producto por ID.
 * @param {number} productId - ID del producto a eliminar
 * @returns {Promise<void>}
 */
export async function deleteProductDb(productId) {
	await request(`products?id=eq.${encodeURIComponent(productId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

/**
 * Obtiene todas las zonas de entrega de la BD.
 * @returns {Promise<Array>} Array de zonas normalizadas
 */
export async function fetchZonesDb() {
	const rows = await request('zones?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapZoneRow) : [];
}

/**
 * Inserta o actualiza una zona de entrega (upsert).
 * @param {Object} zone - Objeto zona a guardar
 * @param {number} zone.id - ID de la zona
 * @param {string} zone.name - Nombre de la zona
 * @param {string} [zone.description] - Descripción de la zona
 * @param {string} [zone.address] - Dirección central o referencia
 * @param {Array<number>} zone.deliveryDays - Días de entrega (ej: [1,3,5] para lun/mié/vie)
 * @param {string} [zone.deliveryTime] - Horario de entrega (ej: "09:00-12:00")
 * @param {Date} [zone.nextDelivery] - Fecha de próxima entrega
 * @param {string} [zone.notes] - Notas adicionales
 * @returns {Promise<void>}
 */
export async function upsertZoneDb(zone) {
	await request('zones', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: {
			id: zone.id,
			name: String(zone.name || '').trim(),
			description: String(zone.description || zone.notes || '').trim() || null,
			address: String(zone.address || '').trim() || null,
			delivery_days: Array.isArray(zone.deliveryDays) ? zone.deliveryDays : [],
			delivery_time: String(zone.deliveryTime || '').trim() || null,
			next_delivery: zone.nextDelivery ? new Date(zone.nextDelivery).toISOString() : null,
			notes: String(zone.notes || zone.description || '').trim() || null
		}
	});
}

/**
 * Elimina una zona por ID.
 * @param {number} zoneId - ID de la zona a eliminar
 * @returns {Promise<void>}
 */
export async function deleteZoneDb(zoneId) {
	await request(`zones?id=eq.${encodeURIComponent(zoneId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

/**
 * Obtiene todas las incidencias (problemas reportados) de la BD.
 * @returns {Promise<Array>} Array de incidencias normalizadas
 */
export async function fetchIncidentsDb() {
	const rows = await request('incidents?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapIncidentRow) : [];
}

/**
 * Inserta una nueva incidencia para una orden.
 * Valida que no exista otra incidencia activa para la misma orden.
 * Solo permite una incidencia abierta o en progreso por orden.
 * @param {Object} incident - Objeto incidencia a insertar
 * @param {number} incident.id - ID único de la incidencia
 * @param {number} incident.orderId - ID de la orden afectada
 * @param {number} incident.clientId - ID del cliente
 * @param {string} incident.type - Tipo de incidencia (damage, loss, delayed, etc.)
 * @param {string} incident.status - Estado (open, in_progress, resolved, closed)
 * @param {string} incident.description - Descripción del problema
 * @param {Date} incident.reportedAt - Fecha de reporte
 * @param {Date} [incident.resolvedAt] - Fecha de resolución
 * @param {string} incident.priority - Prioridad (low, medium, high)
 * @returns {Promise<void>}
 * @throws {Error} Si ya existe una incidencia activa para la orden
 */
export async function insertIncidentDb(incident) {
	// Verificar que no exista una incidencia activa para esta orden
	const activeRows = await request(
		`incidents?select=id,status&order_id=eq.${encodeURIComponent(incident.orderId)}&status=in.(open,in_progress)&limit=1`
	);

	if (Array.isArray(activeRows) && activeRows.length > 0) {
		throw new Error('Ya existe una incidencia activa para este pedido');
	}

	// Insertar la incidencia
	await request('incidents', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: {
			id: incident.id,
			order_id: incident.orderId,
			client_id: incident.clientId,
			type: incident.type,
			status: incident.status,
			description: incident.description,
			reported_at: new Date(incident.reportedAt).toISOString(),
			resolved_at: incident.resolvedAt ? new Date(incident.resolvedAt).toISOString() : null,
			priority: incident.priority || 'medium'
		}
	});
}

/**
 * Actualiza parcialmente una incidencia (PATCH).
 * Solo actualiza los campos incluidos en el objeto patch.
 * @param {number} incidentId - ID de la incidencia a actualizar
 * @param {Object} patch - Objeto con campos a actualizar (ej: status, resolved_at)
 * @returns {Promise<void>}
 */
export async function patchIncidentDb(incidentId, patch) {
	await request(`incidents?id=eq.${encodeURIComponent(incidentId)}`, {
		method: 'PATCH',
		headers: { Prefer: 'return=minimal' },
		body: patch
	});
}

/**
 * Obtiene todo el personal de entrega de la BD.
 * Utiliza la vista delivery_staff_v para acceso seguro via RLS.
 * @returns {Promise<Array>} Array de personal de entrega normalizado
 */
export async function fetchDeliveryStaffDb() {
	const rows = await request('delivery_staff_v?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapDeliveryStaffRow) : [];
}

/**
 * Inserta o actualiza personal de entrega (upsert).
 * Crea/actualiza tanto el registro de usuario como el perfil de entrega.
 * @param {Object} staff - Objeto personal de entrega a guardar
 * @param {number} staff.id - ID del personal
 * @param {string} staff.email - Email del personal de entrega
 * @param {string} staff.name - Nombre del personal
 * @param {number} [staff.zoneId] - Zona asignada
 * @param {string} [staff.phone] - Teléfono del personal
 * @param {string} [staff.vehicle] - Descripción del vehículo asignado
 * @param {string} staff.status - Estado (active, inactive)
 * @param {string} [staff.password] - Contraseña (si es nueva o cambia)
 * @returns {Promise<void>}
 */
export async function upsertDeliveryStaffDb(staff) {
	const normalizedPassword = String(staff.password || '').trim();
	// Preparar datos de usuario base
	const userPayload = {
		id: staff.id,
		email: String(staff.email || '').trim().toLowerCase(),
		name: String(staff.name || '').trim(),
		role: 'delivery',
		zone_id: staff.zoneId == null || staff.zoneId === '' ? null : Number(staff.zoneId),
		phone: String(staff.phone || '').trim() || null
	};

	// Solo incluir contraseña si se proporciona
	if (normalizedPassword) {
		userPayload.password = normalizedPassword;
	}

	// Insertar/actualizar registro de usuario
	await request('users', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: userPayload
	});

	// Insertar/actualizar perfil de entrega
	await request('delivery_staff_profiles', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: {
			user_id: staff.id,
			vehicle: String(staff.vehicle || '').trim() || null,
			status: staff.status || 'active'
		}
	});
}

/**
 * Elimina personal de entrega por ID.
 * Elimina el registro de usuario (que también elimina cascada del perfil de entrega).
 * @param {number} staffId - ID del personal de entrega a eliminar
 * @returns {Promise<void>}
 */
export async function deleteDeliveryStaffDb(staffId) {
	await request(`users?id=eq.${encodeURIComponent(staffId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

/**
 * Asegura que existe una cuenta de autenticación de Supabase Auth para un usuario.
 * Es idempotente: si la cuenta ya existe, retorna éxito.
 * Se usa para crear cuentas en Supabase Auth antes de crear perfiles de aplicación.
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña inicial
 * @returns {Promise<{ok: boolean, created?: boolean, skipped?: boolean, reason?: string}>}
 *   - ok: true si la operación fue exitosa
 *   - created: true si se creó una nueva cuenta, false si ya existía
 *   - skipped: true si se saltó (falta email o contraseña)
 *   - reason: razón del salto o error
 */
export async function ensureAuthUserExistsDb(email, password) {
	const normalizedEmail = String(email || '').trim().toLowerCase();
	const normalizedPassword = String(password || '').trim();

	// Validar entrada requerida
	if (!normalizedEmail || !normalizedPassword) {
		return { ok: false, skipped: true, reason: 'missing-email-or-password' };
	}

	// Intentar crear la cuenta en Supabase Auth
	const response = await fetch(buildAuthUrl('signup'), {
		method: 'POST',
		headers: {
			apikey: SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			email: normalizedEmail,
			password: normalizedPassword
		})
	});

	// Éxito: cuenta creada
	if (response.ok) {
		return { ok: true, created: true };
	}

	// Verificar si falla porque la cuenta ya existe
	const raw = await response.text();
	const message = raw || '';
	if (
		response.status === 400 &&
		(message.includes('User already registered') || message.includes('already been registered'))
	) {
		return { ok: true, created: false };
	}

	// Otros errores de Supabase Auth
	throw new Error(`Supabase Auth signup failed (${response.status}): ${message}`);
}

/**
 * Sincroniza las credenciales de autenticación de un usuario en Supabase Auth.
 * Soporta cambios de email y contraseña.
 * Sin acceso a API de admin, crea la nueva identidad y envía email de recuperación.
 * @param {string} currentEmail - Email actual del usuario
 * @param {string} nextEmail - Nuevo email (opcional, si no cambia usar mismo valor)
 * @param {string} nextPassword - Nueva contraseña (requerida)
 * @returns {Promise<{ok: boolean, skipped?: boolean, reason?: string}>}
 *   - ok: true si la sincronización fue exitosa
 *   - skipped: true si se saltó (parámetros inválidos)
 *   - reason: razón del salto o error
 * @throws {Error} Si hay error en la comunicación con Supabase Auth
 */
export async function syncAuthUserCredentialsDb(currentEmail, nextEmail, nextPassword) {
	const normalizedCurrentEmail = String(currentEmail || '').trim().toLowerCase();
	const normalizedNextEmail = String(nextEmail || '').trim().toLowerCase();
	const normalizedNextPassword = String(nextPassword || '').trim();

	// Validar email actual requerido
	if (!normalizedCurrentEmail) {
		return { ok: false, skipped: true, reason: 'missing-current-email' };
	}

	const emailToUse = normalizedNextEmail || normalizedCurrentEmail;
	const emailChanged = normalizedCurrentEmail !== emailToUse;

	// Seguridad: nunca crear cuentas con contraseñas por defecto.
	if (!normalizedNextPassword) {
		return { ok: false, skipped: true, reason: 'missing-explicit-password' };
	}

	// Asegurar que la cuenta existe en el nuevo email (idempotente)
	const ensureResult = await ensureAuthUserExistsDb(emailToUse, normalizedNextPassword);
	if (!ensureResult?.ok) {
		return ensureResult;
	}

	// Si el email cambió, crear identidad en el nuevo email
	if (emailChanged) {
		// Nota: Sin acceso a API de admin, dejamos la cuenta antigua sin cambios
		await ensureAuthUserExistsDb(emailToUse, normalizedNextPassword);
	}

	// Enviar email de recuperación para validar contraseña (sin API de admin)
	if (normalizedNextPassword) {
		const response = await fetch(buildAuthUrl('recover'), {
			method: 'POST',
			headers: {
				apikey: SUPABASE_PUBLISHABLE_KEY,
				Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email: emailToUse })
		});

		if (!response.ok) {
			const raw = await response.text();
			throw new Error(`Supabase Auth recover failed (${response.status}): ${raw}`);
		}
	}

	return { ok: true };
}
