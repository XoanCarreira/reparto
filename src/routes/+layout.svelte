<script>
	/**
	 * LAYOUT RAÍZ
	 * Página principal que muestra el layout general dependiendo del estado de autenticación
	 * - Si no está autenticado: muestra la página de login
	 * - Si está autenticado: muestra el layout con navegación según el rol
	 */

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/logo_repartoapp_192.png" />
	<title>Reparto - Sistema de Entregas</title>
	<meta name="description" content="Sistema de gestión de entregas para empresas" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

{@render children()}
