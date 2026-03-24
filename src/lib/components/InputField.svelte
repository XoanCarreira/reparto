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

<div class="input-field">
	{#if label}
		<label for={id} class="input-label">
			{label}
			{#if required}
				<span class="input-required">*</span>
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
		class={`input-control ${error ? 'input-control-error' : ''} ${disabled ? 'input-control-disabled' : ''}`}
		oninput={oninput}
		onchange={onchange}
		onfocus={onfocus}
		onblur={onblur}
		onkeydown={onkeydown}
	/>

	{#if error}
		<p class="input-error">{error}</p>
	{/if}
</div>

<style>
	input {
		font-family: inherit;
	}

	.input-field {
		margin-bottom: 1rem;
	}

	.input-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #e2e8f0;
	}

	.input-required {
		color: #f87171;
	}

	.input-control {
		width: 100%;
		padding: 0.5rem 1rem;
		border: 1px solid #475569;
		border-radius: 0.5rem;
		font-weight: 500;
		background: #334155;
		color: #f1f5f9;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.input-control::placeholder {
		color: #94a3b8;
	}

	.input-control:hover {
		border-color: #64748b;
	}

	.input-control:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
	}

	.input-control-error {
		border-color: #ef4444;
	}

	.input-control-error:focus {
		border-color: #ef4444;
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.35);
	}

	.input-control-disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-error {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: #f87171;
	}
</style>
