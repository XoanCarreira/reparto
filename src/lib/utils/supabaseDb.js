/**
 * Thin PostgREST wrapper for Supabase.
 * Central data source for all app entities.
 */

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { supabaseClient } from './supabaseClient.js';

const SUPABASE_URL = PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
	PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const isDatabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function buildUrl(path) {
	return `${SUPABASE_URL}/rest/v1/${path}`;
}

function buildAuthUrl(path) {
	return `${SUPABASE_URL}/auth/v1/${path}`;
}

async function request(path, options = {}) {
	if (!isDatabaseEnabled) {
		return null;
	}

	let bearerToken = SUPABASE_ANON_KEY;
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

	const headers = {
		apikey: SUPABASE_ANON_KEY,
		Authorization: `Bearer ${bearerToken}`,
		'Content-Type': 'application/json',
		...options.headers
	};

	const response = await fetch(buildUrl(path), {
		method: options.method || 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(`Supabase request failed (${response.status}): ${message}`);
	}

	if (response.status === 204) {
		return null;
	}

	const text = await response.text();
	if (!text) {
		return null;
	}

	return JSON.parse(text);
}

function mapClientRow(row) {
	return {
		id: Number(row.id),
		email: row.email || '',
		password: '',
		name: row.name || '',
		role: 'client',
		zone: Number(row.zone) || 1,
		phone: row.phone || '',
		address: row.address || '',
		gpsLat: row.gpsLat ?? null,
		gpsLng: row.gpsLng ?? null,
		createdAt: row.created_at ? new Date(row.created_at) : new Date()
	};
}

function mapOrderRow(row) {
	return {
		id: Number(row.id),
		clientId: Number(row.client_id),
		status: row.status,
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
		notes: row.notes || '',
		deliveryNote: row.delivery_note || '',
		deliveryNoteAt: row.delivery_note_at ? new Date(row.delivery_note_at) : null,
		cancelRequestStatus: row.cancel_request_status || null,
		cancelRequestedAt: row.cancel_requested_at ? new Date(row.cancel_requested_at) : null,
		cancelDecisionAt: row.cancel_decision_at ? new Date(row.cancel_decision_at) : null,
		cancelSource: row.cancel_source || null
	};
}

function mapProductRow(row) {
	return {
		id: Number(row.id),
		name: row.name || '',
		category: row.category || '',
		unit: row.unit || 'unidad',
		stock: Number(row.stock || 0),
		minStock: Number(row.min_stock || 0),
		price: Number(row.price || 0),
		description: row.description || ''
	};
}

function mapZoneRow(row) {
	return {
		id: Number(row.id),
		name: row.name || '',
		description: row.description || '',
		address: row.address || '',
		deliveryDays: Array.isArray(row.delivery_days) ? row.delivery_days : [],
		deliveryTime: row.delivery_time || '',
		nextDelivery: row.next_delivery ? new Date(row.next_delivery) : null,
		notes: row.notes || ''
	};
}

function mapIncidentRow(row) {
	return {
		id: Number(row.id),
		orderId: Number(row.order_id),
		clientId: row.client_id != null ? Number(row.client_id) : null,
		type: row.type,
		status: row.status,
		description: row.description || '',
		reportedAt: row.reported_at ? new Date(row.reported_at) : new Date(),
		resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
		priority: row.priority || 'medium'
	};
}

function mapDeliveryStaffRow(row) {
	return {
		id: Number(row.id),
		name: row.name || '',
		zoneId: row.zoneId != null ? Number(row.zoneId) : null,
		email: row.email || '',
		password: '',
		phone: row.phone || '',
		vehicle: row.vehicle || '',
		status: row.status || 'active'
	};
}

function mapAuthUserRow(row) {
	if (!row) {
		return null;
	}

	const role = row.role || 'client';
	return {
		id: Number(row.id),
		email: row.email || '',
		name: row.name || '',
		role,
		zone: Number(row.zone_id) || 1,
		deliveryStaffId: role === 'delivery' ? Number(row.id) : null
	};
}

export async function fetchAuthUserDb(email, password) {
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

export async function fetchClientsDb() {
	const rows = await request('clients_v?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapClientRow) : [];
}

export async function upsertClientDb(client) {
	const payload = {
		id: client.id,
		email: client.email,
		name: client.name,
		role: 'client',
		zone_id: client.zone,
		phone: client.phone || null,
		address: client.address || null,
		gps_lat: client.gpsLat,
		gps_lng: client.gpsLng,
		created_at: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString()
	};

	const normalizedPassword = String(client.password || '').trim();
	if (normalizedPassword) {
		payload.password = normalizedPassword;
	}

	await request('users', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: payload
	});
}

export async function deleteClientDb(clientId) {
	await request(`users?id=eq.${encodeURIComponent(clientId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

export async function fetchOrdersDb() {
	const rows = await request(
		'orders?select=id,client_id,status,created_at,scheduled_delivery,delivered_at,total_amount,notes,delivery_note,delivery_note_at,cancel_request_status,cancel_requested_at,cancel_decision_at,cancel_source,order_items(product_id,quantity,unit_price)&order=id.asc'
	);
	return Array.isArray(rows) ? rows.map(mapOrderRow) : [];
}

export async function insertOrderWithItemsDb(order) {
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

export async function patchOrderDb(orderId, patch) {
	await request(`orders?id=eq.${encodeURIComponent(orderId)}`, {
		method: 'PATCH',
		headers: { Prefer: 'return=minimal' },
		body: patch
	});
}

export async function fetchProductsDb() {
	const rows = await request('products?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapProductRow) : [];
}

export async function upsertProductDb(product) {
	await request('products', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: {
			id: product.id,
			name: String(product.name || '').trim(),
			category: String(product.category || '').trim() || null,
			unit: String(product.unit || 'unidad').trim(),
			stock: Math.max(0, Number(product.stock) || 0),
			min_stock: Math.max(0, Number(product.minStock) || 0),
			price: Math.max(0, Number(product.price) || 0),
			description: String(product.description || '').trim() || null
		}
	});
}

export async function deleteProductDb(productId) {
	await request(`products?id=eq.${encodeURIComponent(productId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

export async function fetchZonesDb() {
	const rows = await request('zones?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapZoneRow) : [];
}

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

export async function deleteZoneDb(zoneId) {
	await request(`zones?id=eq.${encodeURIComponent(zoneId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

export async function fetchIncidentsDb() {
	const rows = await request('incidents?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapIncidentRow) : [];
}

export async function insertIncidentDb(incident) {
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

export async function patchIncidentDb(incidentId, patch) {
	await request(`incidents?id=eq.${encodeURIComponent(incidentId)}`, {
		method: 'PATCH',
		headers: { Prefer: 'return=minimal' },
		body: patch
	});
}

export async function fetchDeliveryStaffDb() {
	const rows = await request('delivery_staff_v?select=*&order=id.asc');
	return Array.isArray(rows) ? rows.map(mapDeliveryStaffRow) : [];
}

export async function upsertDeliveryStaffDb(staff) {
	const normalizedPassword = String(staff.password || '').trim();
	const userPayload = {
		id: staff.id,
		email: String(staff.email || '').trim().toLowerCase(),
		name: String(staff.name || '').trim(),
		role: 'delivery',
		zone_id: staff.zoneId == null || staff.zoneId === '' ? null : Number(staff.zoneId),
		phone: String(staff.phone || '').trim() || null
	};

	if (normalizedPassword) {
		userPayload.password = normalizedPassword;
	}

	await request('users', {
		method: 'POST',
		headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
		body: userPayload
	});

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

export async function deleteDeliveryStaffDb(staffId) {
	await request(`users?id=eq.${encodeURIComponent(staffId)}`, {
		method: 'DELETE',
		headers: { Prefer: 'return=minimal' }
	});
}

export async function ensureAuthUserExistsDb(email, password) {
	const normalizedEmail = String(email || '').trim().toLowerCase();
	const normalizedPassword = String(password || '').trim();

	if (!normalizedEmail || !normalizedPassword) {
		return { ok: false, skipped: true, reason: 'missing-email-or-password' };
	}

	const response = await fetch(buildAuthUrl('signup'), {
		method: 'POST',
		headers: {
			apikey: SUPABASE_ANON_KEY,
			Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			email: normalizedEmail,
			password: normalizedPassword
		})
	});

	if (response.ok) {
		return { ok: true, created: true };
	}

	const raw = await response.text();
	const message = raw || '';
	if (
		response.status === 400 &&
		(message.includes('User already registered') || message.includes('already been registered'))
	) {
		return { ok: true, created: false };
	}

	throw new Error(`Supabase Auth signup failed (${response.status}): ${message}`);
}

export async function syncAuthUserCredentialsDb(currentEmail, nextEmail, nextPassword) {
	const normalizedCurrentEmail = String(currentEmail || '').trim().toLowerCase();
	const normalizedNextEmail = String(nextEmail || '').trim().toLowerCase();
	const normalizedNextPassword = String(nextPassword || '').trim();

	if (!normalizedCurrentEmail) {
		return { ok: false, skipped: true, reason: 'missing-current-email' };
	}

	const emailToUse = normalizedNextEmail || normalizedCurrentEmail;

	// Ensure account exists first (idempotent if already present).
	await ensureAuthUserExistsDb(emailToUse, normalizedNextPassword || 'TempPass#12345');

	if (normalizedCurrentEmail !== emailToUse) {
		// There is no admin auth API here; create the target identity and leave old one untouched.
		await ensureAuthUserExistsDb(emailToUse, normalizedNextPassword || 'TempPass#12345');
	}

	if (normalizedNextPassword) {
		// For password changes without admin API, trigger recovery email.
		const response = await fetch(buildAuthUrl('recover'), {
			method: 'POST',
			headers: {
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
