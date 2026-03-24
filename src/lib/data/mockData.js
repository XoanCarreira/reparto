/**
 * DATOS MOCK PARA LA APLICACIÓN
 * Este archivo contiene todos los datos de ejemplo que simularán una base de datos real.
 * En production, estos datos vendrían de un backend/API.
 */

// ============================================
// USUARIOS: Admin y Clientes
// ============================================
export const users = [
	{
		id: 1,
		email: 'admin@empresa.com',
		password: 'admin123', // En producción: HASH con bcrypt
		name: 'administrador',
		role: 'admin',
		createdAt: new Date('2024-01-01')
	},
	{
		id: 101,
		email: 'cliente1@empresa.com',
		password: 'cliente123',
		name: 'Cliente 1 Ltda',
		role: 'client',
		zone: 1,
		phone: '+34 912 345 678',
		address: 'Calle Mayor 123, 28001 Madrid',
		createdAt: new Date('2024-02-01')
	},
	{
		id: 102,
		email: 'cliente2@empresa.com',
		password: 'cliente123',
		name: 'Cliente 2 SL',
		role: 'client',
		zone: 2,
		phone: '+34 913 456 789',
		address: 'Avenida Reina 456, 28002 Madrid',
		createdAt: new Date('2024-02-15')
	},
	{
		id: 103,
		email: 'cliente3@empresa.com',
		password: 'cliente123',
		name: 'Cliente 3 SA',
		role: 'client',
		zone: 1,
		phone: '+34 914 567 890',
		address: 'Plaza Mayor 789, 28003 Madrid',
		createdAt: new Date('2024-03-01')
	}
];

// ============================================
// PRODUCTOS: Catálogo disponible
// ============================================
export const products = [
	{
		id: 1,
		name: 'Pan Integral',
		category: 'Pan',
		unit: 'unidad',
		stock: 50,
		minStock: 10,
		price: 1.5,
		description: 'Pan integral de centeno'
	},
	{
		id: 2,
		name: 'Leche Entera',
		category: 'Lácteos',
		unit: 'litro',
		stock: 100,
		minStock: 20,
		price: 0.99,
		description: 'Leche entera fresca'
	},
	{
		id: 3,
		name: 'Queso Manchego',
		category: 'Lácteos',
		unit: 'kg',
		stock: 15,
		minStock: 3,
		price: 12.5,
		description: 'Queso Manchego curado'
	},
	{
		id: 4,
		name: 'Yogur Natural',
		category: 'Lácteos',
		unit: 'pack x6',
		stock: 80,
		minStock: 15,
		price: 2.99,
		description: 'Pack de 6 yogures naturales'
	},
	{
		id: 5,
		name: 'Verduras Frescas Surtidas',
		category: 'Verduras',
		unit: 'caja',
		stock: 40,
		minStock: 8,
		price: 8.5,
		description: 'Caja con variedad de verduras'
	},
	{
		id: 6,
		name: 'Frutas de Temporada',
		category: 'Frutas',
		unit: 'caja',
		stock: 30,
		minStock: 5,
		price: 7.0,
		description: 'Caja con frutas frescas de temporada'
	}
];

// ============================================
// ZONAS DE REPARTO: Áreas y horarios de entrega
// ============================================
export const zones = [
	{
		id: 1,
		name: 'Zona Centro',
		description: 'Centro de la ciudad',
		address: 'Plaza Mayor, Madrid',
		deliveryDays: ['Lunes', 'Miércoles', 'Viernes'],
		deliveryTime: '08:00 - 11:00',
		nextDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // En 2 días
	},
	{
		id: 2,
		name: 'Zona Norte',
		description: 'Área norte de la ciudad',
		address: 'Avenida Reina, Madrid',
		deliveryDays: ['Martes', 'Jueves'],
		deliveryTime: '09:00 - 12:00',
		nextDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // En 3 días
	},
	{
		id: 3,
		name: 'Zona Sur',
		description: 'Área sur de la ciudad',
		address: 'Avenida del Sur, Madrid',
		deliveryDays: ['Lunes', 'Miércoles', 'Viernes'],
		deliveryTime: '10:00 - 13:00',
		nextDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Mañana
	}
];

// ============================================
// PEDIDOS: Solicitudes de clientes
// ============================================
export const orders = [
	{
		id: 1001,
		clientId: 101,
		status: 'pending', // pending, delivered, cancelled
		items: [
			{ productId: 1, quantity: 10, unitPrice: 1.5 },
			{ productId: 2, quantity: 5, unitPrice: 0.99 }
		],
		createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
		scheduledDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
		totalAmount: 19.95,
		notes: 'Entrega urgente'
	},
	{
		id: 1002,
		clientId: 102,
		status: 'pending',
		items: [
			{ productId: 3, quantity: 2, unitPrice: 12.5 },
			{ productId: 4, quantity: 3, unitPrice: 2.99 }
		],
		createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
		scheduledDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		totalAmount: 34.97,
		notes: ''
	},
	{
		id: 1003,
		clientId: 101,
		status: 'delivered',
		items: [
			{ productId: 5, quantity: 2, unitPrice: 8.5 },
			{ productId: 6, quantity: 1, unitPrice: 7.0 }
		],
		createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
		scheduledDelivery: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
		deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
		totalAmount: 24.0,
		notes: 'Entrega completada'
	}
];

// ============================================
// REPARTIDORES: Personal de entregas por zona
// ============================================
export const deliveryStaff = [
	{
		id: 201,
		name: 'Juan García',
		zoneId: 1,
		phone: '+34 600 111 222',
		vehicle: 'Furgoneta Blanca',
		status: 'active' // active, off, on_delivery
	},
	{
		id: 202,
		name: 'María López',
		zoneId: 2,
		phone: '+34 600 222 333',
		vehicle: 'Furgoneta Verde',
		status: 'active'
	},
	{
		id: 203,
		name: 'Carlos Martínez',
		zoneId: 1,
		phone: '+34 600 333 444',
		vehicle: 'Furgoneta Roja',
		status: 'active'
	}
];

// ============================================
// INCIDENCIAS: Problemas reportados
// ============================================
export const incidents = [
	{
		id: 301,
		orderId: 1001,
		clientId: 101,
		type: 'delayed', // delayed, damaged, wrong_quantity, other
		status: 'open', // open, in_progress, resolved
		description: 'Producto llegó dañado',
		reportedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
		resolvedAt: null,
		priority: 'high'
	},
	{
		id: 302,
		orderId: 1002,
		clientId: 102,
		type: 'delayed',
		status: 'resolved',
		description: 'Retraso en la entrega',
		reportedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
		resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
		priority: 'medium'
	}
];

// ============================================
// HISTORIAL DE ENTREGAS
// ============================================
export const deliveryHistory = [
	{
		id: 501,
		staffId: 201,
		zoneId: 1,
		ordersDelivered: [1003],
		date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
		itemsCount: 3,
		distance: 12.5,
		time: '2 horas'
	}
];
