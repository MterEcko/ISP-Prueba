<template>
  <div class="modal-wrapper" @click.self="closeOnOverlay && $emit('close')">
    <div class="modal" :class="{ 'modal-large': size === 'large', 'modal-small': size === 'small' }">
      <div class="modal-header">
        <slot name="header">
          <h3 v-if="title" class="modal-title">{{ title }}</h3>
        </slot>
        <button v-if="!hideCloseButton" class="modal-close" @click="$emit('close')" aria-label="Cerrar">
          <i class="icon-close"></i>
        </button>
      </div>
      <div class="modal-body">
        <slot name="body">
          <slot></slot>
        </slot>
      </div>
      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BaseModal',
  props: {
    /**
     * Título del modal (opcional si se usa slot header)
     */
    title: {
      type: String,
      default: ''
    },
    /**
     * Tamaño del modal: 'default', 'small' o 'large'
     */
    size: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'small', 'large'].includes(value)
    },
    /**
     * Si es true, no se mostrará el botón de cerrar
     */
    hideCloseButton: {
      type: Boolean,
      default: false
    },
    /**
     * Si es true, el modal se cerrará al hacer click en el overlay
     */
    closeOnOverlay: {
      type: Boolean,
      default: true
    }
  },
  mounted() {
    // Añadir clase al body para evitar scroll
    document.body.classList.add('modal-open');
    
    // Escuchar evento de teclado para cerrar con Esc
    document.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    // Eliminar clase del body
    document.body.classList.remove('modal-open');
    
    // Eliminar event listener
    document.removeEventListener('keydown', this.handleKeyDown);
  },
  methods: {
    /**
     * Manejar evento de teclado para cerrar con Esc
     */
    handleKeyDown(event) {
      if (event.key === 'Escape' && !this.hideCloseButton) {
        this.$emit('close');
      }
    }
  }
}
</script>

<style scoped>
.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;  /* Cambia de 100% a 100vw */
  height: 100vh; /* Cambia de 100% a 100vh */
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
  animation: fadeIn 0.2s ease;
}

.modal {
  background-color: var(--bg-primary, white);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 500px;
  max-width: 100%;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  overflow: hidden;
  margin: auto; /* Añade esta línea */
  position: relative; /* Añade esta línea */
}

.modal-small {
  width: 400px;
}

.modal-large {
  width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  position: relative;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.modal-close {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #666);
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Para evitar scroll en el body cuando modal está abierto */
:global(body.modal-open) {
  overflow: hidden;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .modal, .modal-small, .modal-large {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-body {
    max-height: 60vh;
  }
}

@media (max-height: 600px) {
  .modal-body {
    max-height: 50vh;
  }
}
</style>