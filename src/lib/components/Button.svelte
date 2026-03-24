<!-- COMPONENTE: Botón reutilizable -->
<script>
	/**
	 * BOTÓN REUTILIZABLE - Tema Oscuro
	 * Componente de botón flexible con variantes de estilo
	 *
	 * Props:
	 * - variant: 'primary', 'secondary', 'danger', 'success' (default: 'primary')
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

	const buttonClass = $derived(
		`btn btn-${variant} btn-${size} ${loading ? 'is-loading' : ''} ${className}`
	);

</script>

<button
	{type}
	disabled={disabled || loading}
	class={buttonClass}
	onclick={onclick}
>
	{#if loading}
		<span class="btn-spinner">⏳</span>
	{/if}
	{@render children?.()}
</button>

<style>
	button {
		font-family: inherit;
		cursor: pointer;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		white-space: nowrap;
		border-radius: 0.75rem;
		font-weight: 600;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.15s ease;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-md {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}

	.btn-lg {
		padding: 1rem 2rem;
		font-size: 1.125rem;
	}

	.btn-primary {
		color: #fff;
		background: linear-gradient(90deg, #2563eb, #3b82f6);
		box-shadow: 0 10px 18px rgba(37, 99, 235, 0.35);
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(90deg, #3b82f6, #60a5fa);
	}

	.btn-secondary {
		color: #f1f5f9;
		background: linear-gradient(90deg, #334155, #475569);
		box-shadow: 0 8px 16px rgba(51, 65, 85, 0.35);
	}

	.btn-secondary:hover:not(:disabled) {
		background: linear-gradient(90deg, #475569, #64748b);
	}

	.btn-danger {
		color: #fff;
		background: linear-gradient(90deg, #dc2626, #ef4444);
		box-shadow: 0 10px 18px rgba(220, 38, 38, 0.35);
	}

	.btn-danger:hover:not(:disabled) {
		background: linear-gradient(90deg, #ef4444, #f87171);
	}

	.btn-success {
		color: #fff;
		background: linear-gradient(90deg, #059669, #10b981);
		box-shadow: 0 10px 18px rgba(5, 150, 105, 0.35);
	}

	.btn-success:hover:not(:disabled) {
		background: linear-gradient(90deg, #10b981, #34d399);
	}

	.is-loading {
		opacity: 0.75;
		cursor: wait;
	}

	.btn-spinner {
		display: inline-block;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
