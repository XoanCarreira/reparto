<script>
	let {
		open = false,
		title = 'Confirmar accion',
		message = '¿Deseas continuar?',
		confirmText = 'Confirmar',
		cancelText = 'Cancelar',
		variant = 'danger',
		onCancel = () => {},
		onConfirm = () => {}
	} = $props();
</script>

{#if open}
	<div class="confirm-overlay" role="presentation" onclick={onCancel} onkeydown={(e) => e.key === 'Escape' && onCancel()}>
		<div
			class="confirm-dialog"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3 class="confirm-title">{title}</h3>
			<p class="confirm-message">{message}</p>
			<div class="confirm-actions">
				<button class="btn-cancel" onclick={onCancel}>{cancelText}</button>
				<button class={`btn-confirm ${variant}`} onclick={onConfirm}>{confirmText}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.confirm-overlay {
		position: fixed;
		inset: 0;
		background: rgba(2, 6, 23, 0.72);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 70;
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	.confirm-dialog {
		width: min(460px, 100%);
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 0.7rem;
		padding: 1.25rem;
		box-shadow: 0 20px 30px rgba(0, 0, 0, 0.4);
	}

	.confirm-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		color: #f1f5f9;
	}

	.confirm-message {
		margin: 0.75rem 0 0;
		font-size: 0.92rem;
		line-height: 1.5;
		color: #cbd5e1;
	}

	.confirm-actions {
		margin-top: 1.1rem;
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		flex-wrap: wrap;
	}

	.btn-cancel,
	.btn-confirm {
		border: 1px solid transparent;
		border-radius: 0.45rem;
		padding: 0.55rem 0.9rem;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-cancel {
		background: #334155;
		border-color: #475569;
		color: #e2e8f0;
	}

	.btn-cancel:hover {
		background: #3f5167;
	}

	.btn-confirm.danger {
		background: #b91c1c;
		border-color: #ef4444;
		color: #fee2e2;
	}

	.btn-confirm.danger:hover {
		background: #dc2626;
	}

	.btn-confirm.warning {
		background: #b45309;
		border-color: #f59e0b;
		color: #fef3c7;
	}

	.btn-confirm.warning:hover {
		background: #d97706;
	}

	.btn-confirm.primary {
		background: #1d4ed8;
		border-color: #3b82f6;
		color: #dbeafe;
	}

	.btn-confirm.primary:hover {
		background: #2563eb;
	}
</style>
