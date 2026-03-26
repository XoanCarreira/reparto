<script>
	import { createEventDispatcher } from 'svelte';
	import Button from './Button.svelte';

	const dispatch = createEventDispatcher();

	let isOpen = $state(false);
	let countdown = $state(60);
	let timerHandle = $state(null);

	export function open() {
		isOpen = true;
		countdown = 60;
		startCountdown();
	}

	function startCountdown() {
		// Limpiar timer anterior si existe
		if (timerHandle) {
			clearInterval(timerHandle);
		}

		timerHandle = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				clearInterval(timerHandle);
				timerHandle = null;
				handleLogout();
			}
		}, 1000);
	}

	function handleExtend() {
		if (timerHandle) {
			clearInterval(timerHandle);
			timerHandle = null;
		}
		dispatch('extend');
		isOpen = false;
	}

	function handleLogout() {
		if (timerHandle) {
			clearInterval(timerHandle);
			timerHandle = null;
		}
		dispatch('logout');
		isOpen = false;
	}

    function handleBackdropClick(event) {
        // Equivalente a |self
        if (event.target === event.currentTarget) {
            handleLogout();
        }
    }

    function handleBackdropKeydown(event) {
        // Accesibilidad teclado para elemento con role="button"
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleLogout();
        }
    }
    
</script>

<!-- Modal de Timeout -->
{#if isOpen}
    <div
        class="modal-backdrop"
        role="button"
        tabindex="0"
        aria-label="Cerrar sesión por inactividad"
        onclick={handleBackdropClick}
        onkeydown={handleBackdropKeydown}
    >
        <div class="modal">
            <div class="modal-content">
                <h2>⚠️ Sesión próxima a expirar</h2>
                <p>Tu sesión expirará en <strong>{countdown}s</strong> por inactividad.</p>
                <p class="text-secondary">¿Deseas extender tu sesión?</p>

                <div class="modal-actions">
                    <Button variant="secondary" on:click={handleLogout}>Cerrar Sesión</Button>
                    <Button variant="primary" on:click={handleExtend}>Extender Sesión</Button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: var(--bg-primary, #1e1e1e);
		border-radius: 8px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		padding: 2rem;
		max-width: 400px;
		width: 90%;
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.modal-content {
		text-align: center;
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		color: var(--color-warning, #ff9800);
	}

	p {
		margin: 0.5rem 0;
		color: var(--color-text, #e0e0e0);
	}

	.text-secondary {
		font-size: 0.9rem;
		color: var(--color-text-secondary, #999);
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		justify-content: center;
	}

	@media (max-width: 600px) {
		.modal {
			padding: 1.5rem;
		}

		.modal-actions {
			flex-direction: column;
		}
	}
</style>
