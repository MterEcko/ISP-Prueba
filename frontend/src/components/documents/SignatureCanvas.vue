<!-- frontend/src/components/documents/SignatureCanvas.vue -->
<template>
  <div class="signature-canvas-container">
    <div class="canvas-header">
      <h4>{{ title || 'Firma Digital' }}</h4>
      <div class="canvas-actions">
        <button @click="clearSignature" class="btn-clear">
          🗑️ Limpiar
        </button>
      </div>
    </div>

    <div class="canvas-wrapper">
      <canvas
        ref="signatureCanvas"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="stopDrawing"
        class="signature-canvas"
      ></canvas>
      
      <div v-if="!hasSignature" class="canvas-placeholder">
        Firma aquí
      </div>
    </div>

    <div class="signature-info">
      <p class="info-text">
        <strong>{{ signerName }}</strong><br>
        {{ formatDate(new Date()) }}
      </p>
    </div>

    <div class="canvas-footer">
      <button 
        @click="cancelSignature" 
        class="btn-cancel"
      >
        Cancelar
      </button>
      <button 
        @click="saveSignature" 
        :disabled="!hasSignature || saving"
        class="btn-save"
      >
        {{ saving ? 'Guardando...' : 'Guardar Firma' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SignatureCanvas',
  props: {
    title: String,
    signerName: {
      type: String,
      required: true
    },
    signerType: {
      type: String,
      default: 'client'
    }
  },
  data() {
    return {
      canvas: null,
      ctx: null,
      isDrawing: false,
      hasSignature: false,
      saving: false,
      lastX: 0,
      lastY: 0
    };
  },
  mounted() {
    this.initCanvas();
  },
  methods: {
    initCanvas() {
      this.canvas = this.$refs.signatureCanvas;
      this.ctx = this.canvas.getContext('2d');
      
      // Configurar tamaño del canvas
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = 200;
      
      // Configurar estilo del trazo
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    },

    startDrawing(e) {
      this.isDrawing = true;
      this.hasSignature = true;
      
      const rect = this.canvas.getBoundingClientRect();
      this.lastX = e.clientX - rect.left;
      this.lastY = e.clientY - rect.top;
    },

    draw(e) {
      if (!this.isDrawing) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      
      this.lastX = x;
      this.lastY = y;
    },

    stopDrawing() {
      this.isDrawing = false;
    },

    handleTouchStart(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      
      this.isDrawing = true;
      this.hasSignature = true;
      this.lastX = touch.clientX - rect.left;
      this.lastY = touch.clientY - rect.top;
    },

    handleTouchMove(e) {
      if (!this.isDrawing) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      
      this.lastX = x;
      this.lastY = y;
    },

    clearSignature() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.hasSignature = false;
    },

    async saveSignature() {
      if (!this.hasSignature) return;
      
      this.saving = true;
      
      try {
        // Convertir canvas a base64
        const signatureData = this.canvas.toDataURL('image/png');
        
        // Emitir evento con la firma
        this.$emit('signature-saved', {
          signatureData,
          signerName: this.signerName,
          signerType: this.signerType,
          signedAt: new Date()
        });
      } catch (error) {
        console.error('Error guardando firma:', error);
        this.$emit('signature-error', error);
      } finally {
        this.saving = false;
      }
    },

    cancelSignature() {
      this.$emit('signature-cancelled');
    },

    formatDate(date) {
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};
</script>

<style scoped>
.signature-canvas-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.canvas-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.btn-clear {
  background: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.canvas-wrapper {
  position: relative;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background: #fafafa;
  margin-bottom: 16px;
}

.signature-canvas {
  display: block;
  cursor: crosshair;
  touch-action: none;
}

.canvas-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #999;
  font-size: 1.2rem;
  pointer-events: none;
}

.signature-info {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.info-text {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
}

.canvas-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-save {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #e0e0e0;
  color: #666;
}

.btn-cancel:hover {
  background: #d0d0d0;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #45a049;
}

.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>