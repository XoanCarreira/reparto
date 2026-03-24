<!-- COMPONENTE: Campo de entrada -->
<script>
	/**
	 * INPUT FIELD
	 * Campo de entrada reutilizable con validación básica
	 *
	 * Props:
	 * - label: etiqueta del campo
	 * - type: tipo de entrada ('text', 'email', 'password', 'number', etc)
	 * - value: valor actual
	 * - placeholder: texto de placeholder
	 * - error: mensaje de error (si existe)
	 * - disabled: boolean
	 * - required: boolean
	 */
	let {
		label = '',
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		error = '',
		disabled = false,
		required = false,
		id = '',
		oninput,
		onchange,
		onfocus,
		onblur,
		onkeydown
	} = $props();
</script>

<div class="mb-4">
	{#if label}
		<label for={id} class="block text-sm font-medium text-gray-700 mb-2">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<input
		{id}
		{type}
		bind:value
		{placeholder}
		{disabled}
		{required}
		class={`
			w-full
			px-4
			py-2
			border
			rounded-lg
			font-medium
			transition-colors
			duration-200
			focus:outline-none
			focus:ring-2
			focus:ring-blue-500
			${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
			${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
		`}
		oninput={oninput}
		onchange={onchange}
		onfocus={onfocus}
		onblur={onblur}
		onkeydown={onkeydown}
	/>

	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>

<style>
	input {
		font-family: inherit;
	}
</style>
