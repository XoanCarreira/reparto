<!-- COMPONENTE: Botón reutilizable -->
<script>
	/**
	 * BOTÓN REUTILIZABLE
	 * Componente de botón flexible con variantes de estilo
	 *
	 * Props:
	 * - variant: 'primary', 'secondary', 'danger' (default: 'primary')
	 * - size: 'sm', 'md', 'lg' (default: 'md')
	 * - disabled: boolean (default: false)
	 * - loading: boolean - muestra loader (default: false)
	 */
	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		onclick,
		children,
		class: className = ''
	} = $props();

	// Define estilos según la variante
	const variants = {
		primary: 'bg-blue-600 hover:bg-blue-700 text-white',
		secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
		danger: 'bg-red-600 hover:bg-red-700 text-white'
	};

	// Define tamaños
	const sizes = {
		sm: 'px-3 py-1 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg'
	};

	const buttonClass = $derived(`
		${variants[variant]}
		${sizes[size]}
		rounded-lg
		font-medium
		transition-colors
		duration-200
		disabled:opacity-50
		disabled:cursor-not-allowed
		${loading ? 'opacity-75' : ''}
		${className}
	`);
</script>

<button
	{type}
	disabled={disabled || loading}
	class={buttonClass}
	onclick={onclick}
>
	{#if loading}
		<span class="inline-block animate-spin mr-2">⏳</span>
	{/if}
	{@render children?.()}
</button>

<style>
	button {
		font-family: inherit;
		cursor: pointer;
	}
</style>
