<template>
  <div class="qr-generator">
    <div id="qr-printable-area">
      <div class="qr-header non-printable">
        <div class="qr-icon">
          <i class="icon-qrcode"></i>
        </div>
        <div class="qr-title">
          <h3>Generación de Códigos QR</h3>
          <p v-if="items.length > 0">
            {{ items.length }} elementos seleccionados
          </p>
        </div>
      </div>
      
      <div v-if="!items || items.length === 0" class="no-items non-printable">
        <div class="no-items-message">
          <i class="icon-alert-circle"></i>
          <p>No hay elementos seleccionados para generar códigos QR.</p>
          <button class="btn-outline" @click="$emit('qr-cancel')">Volver</button>
        </div>
      </div>
      
      <div v-else class="qr-content">
        <div class="qr-options non-printable">
          <div class="option-section">
            <h4>Formato de impresión</h4>
            <div class="format-options">
              <button 
                v-for="format in printFormats" 
                :key="format.id"
                :class="['format-button', { active: config.printFormat === format.id }]"
                @click="config.printFormat = format.id"
                :disabled="generating"
              >
                <div class="format-icon" :class="format.id">
                  <i :class="format.icon"></i>
                </div>
                <div class="format-info">
                  <span class="format-name">{{ format.name }}</span>
                  <span class="format-desc">{{ format.description }}</span>
                </div>
              </button>
            </div>
          </div>
          
          <div class="option-section">
            <h4>Contenido del código QR</h4>
            <div class="content-options">
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="config.contentType" 
                  value="serialNumber"
                  :disabled="generating"
                />
                <span>Incluir solo número de serie</span>
              </label>
              
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="config.contentType" 
                  value="url"
                  :disabled="generating"
                />
                <span>Incluir URL para escaneo directo</span>
              </label>
              
              <label class="radio-label">
                <input 
                  type="radio" 
                  v-model="config.contentType" 
                  value="json"
                  :disabled="generating"
                />
                <span>Incluir datos completos (JSON)</span>
              </label>
              
              <div v-if="config.contentType === 'url'" class="url-config">
                <label>URL base para escaneo:</label>
                <input 
                  type="text" 
                  v-model="config.baseUrl" 
                  placeholder="https://inventario.ejemplo.com/equipo/"
                  :disabled="generating"
                />
                <span class="url-example">Ejemplo: {{ urlExample }}</span>
              </div>
            </div>
          </div>
          
          <div class="option-section">
            <h4>Información a mostrar</h4>
            <div class="info-options">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="config.showName"
                  :disabled="generating"
                />
                <span>Nombre del equipo</span>
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="config.showSerial"
                  :disabled="generating"
                />
                <span>Número de serie</span>
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="config.showModel"
                  :disabled="generating"
                />
                <span>Marca / Modelo</span>
              </label>
              
              <label v-if="config.printFormat !== 'small'" class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="config.showCompanyLogo"
                  :disabled="generating"
                />
                <span>Logotipo de la empresa</span>
              </label>
            </div>
          </div>
          
          <div class="option-section">
            <h4>Opciones de diseño</h4>
            <div class="design-options">
              <div class="option-group">
                <label>Tamaño del código QR (en px):</label>
                <div class="size-slider">
                  <input 
                    type="range" 
                    v-model.number="config.qrSize" 
                    min="50" 
                    max="300" 
                    step="10"
                    :disabled="generating"
                  />
                  <span>{{ config.qrSize }}px</span>
                </div>
              </div>
              
              <div class="option-group">
                <label>Nivel de corrección de errores:</label>
                <select 
                  v-model="config.errorCorrection"
                  :disabled="generating"
                >
                  <option value="L">Bajo (7%)</option>
                  <option value="M">Medio (15%)</option>
                  <option value="Q">Alto (25%)</option>
                  <option value="H">Máximo (30%)</option>
                </select>
              </div>
              
              <div class="option-group">
                <label>Copias de cada código QR:</label>
                <div class="copies-input">
                  <button 
                    @click="decrementCopies" 
                    :disabled="config.copies <= 1 || generating"
                    class="copies-btn"
                  >
                    <i class="icon-minus"></i>
                  </button>
                  <input 
                    type="number" 
                    v-model.number="config.copies" 
                    min="1" 
                    max="10"
                    :disabled="generating"
                  />
                  <button 
                    @click="incrementCopies" 
                    :disabled="config.copies >= 10 || generating"
                    class="copies-btn"
                  >
                    <i class="icon-plus"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="qr-preview">
          <h4 class="non-printable">Vista previa</h4>
          <div class="preview-title non-printable">
            (Mostrando {{ previewItems.length }} de {{ items.length }})
          </div>
          <div class="preview-container non-printable" :class="config.printFormat">
            <div 
              v-for="item in previewItems" 
              :key="item.id"
              class="qr-code-item"
              :style="{ width: getPreviewWidth() + 'px' }"
            >
              <div v-if="config.showCompanyLogo" class="company-logo">
                <img src="/assets/logo.png" alt="Logo" />
              </div>
              <div class="qr-code">
                <qrcode-vue
                  :text="getQRCodeContent(item)"
                  :size="config.qrSize"
                  :level="config.errorCorrection"
                  render-as="svg" 
                />
              </div>
              <div class="qr-details">
                <div v-if="config.showName" class="item-name">{{ item.name }}</div>
                <div v-if="config.showSerial" class="item-serial">{{ item.serialNumber }}</div>
                <div v-if="config.showModel" class="item-model">
                  {{ item.brand }} {{ item.model ? '/ ' + item.model : '' }}
                </div>
              </div>
            </div>
          </div>

          <div class="print-only-area">
            <div 
              v-for="item in items" 
              :key="item.id"
              class="qr-code-item-print"
              :class="config.printFormat"
            >
              <div 
                v-for="n in config.copies" 
                :key="n" 
                class="qr-label-wrapper"
              >
                <div v-if="config.showCompanyLogo" class="company-logo">
                  <img src="/assets/logo.png" alt="Logo" />
                </div>
                <div class="qr-code">
                  <qrcode-vue
                    :text="getQRCodeContent(item)"
                    :size="getPrintQRSize()"
                    :level="config.errorCorrection"
                    render-as="svg" 
                  />
                </div>
                <div class="qr-details">
                  <div v-if="config.showName" class="item-name">{{ item.name }}</div>
                  <div v-if="config.showSerial" class="item-serial">{{ item.serialNumber }}</div>
                  <div v-if="config.showModel" class="item-model">
                    {{ item.brand }} {{ item.model ? '/ ' + item.model : '' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    
    <div v-if="generating" class="generating-overlay non-printable">
      <div class="generating-content">
        <div class="spinner"></div>
        <h4>Generando códigos QR...</h4>
        <p>Esto puede tomar unos momentos.</p>
      </div>
    </div>
    
    <div class="qr-actions non-printable">
      <button class="btn-outline" @click="$emit('qr-cancel')" :disabled="generating">
        Cancelar
      </button>
      <button class="btn-primary" @click="printQRCodes" :disabled="!canGenerate || generating">
        <i class="icon-printer"></i> Generar e imprimir
      </button>
    </div>
  </div>
</template>

<script>
// ¡PASO 1! Importar la biblioteca
import QrcodeVue from 'vue-qrcode-component';

export default {
  name: 'QRCodeGenerator',
  // ¡PASO 2! Registrar el componente
  components: {
    QrcodeVue,
  },
  props: {
    items: {
      type: Array,
      default: () => []
    },
    defaultBaseUrl: {
      type: String,
      default: 'https://app.ejemplo.com/inventario/'
    }
  },
  data() {
    return {
      config: {
        printFormat: 'medium',
        contentType: 'serialNumber',
        baseUrl: this.defaultBaseUrl,
        qrSize: 150, // Tamaño para la VISTA PREVIA
        errorCorrection: 'M',
        copies: 1,
        showName: true,
        showSerial: true,
        showModel: true,
        showCompanyLogo: false
      },
      printFormats: [
        {
          id: 'small',
          name: 'Pequeño',
          description: 'Etiquetas pequeñas (2.5 x 2.5 cm)',
          icon: 'icon-tag-small'
        },
        {
          id: 'medium',
          name: 'Mediano',
          description: 'Etiquetas medianas (5 x 5 cm)',
          icon: 'icon-tag-medium'
        },
        {
          id: 'large',
          name: 'Grande',
          description: 'Etiquetas grandes (7.5 x 7.5 cm)',
          icon: 'icon-tag-large'
        },
        {
          id: 'page',
          name: 'Hoja completa',
          description: 'Múltiples etiquetas por página',
          icon: 'icon-printer-page'
        }
      ],
      generating: false
    };
  },
  computed: {
    previewItems() {
      if (this.items.length <= 3) {
        return this.items;
      }
      return this.items.slice(0, 3);
    },
    urlExample() {
      if (!this.items.length) return this.config.baseUrl + 'ABC123';
      const item = this.items[0];
      return this.config.baseUrl + (item.serialNumber || item.id || 'ABC123');
    },
    canGenerate() {
      if (this.items.length === 0) return false;
      if (this.config.contentType === 'url' && !this.config.baseUrl.trim()) {
        return false;
      }
      return true;
    }
  },
  methods: {
    incrementCopies() {
      if (this.config.copies < 10) {
        this.config.copies++;
      }
    },
    decrementCopies() {
      if (this.config.copies > 1) {
        this.config.copies--;
      }
    },
    getPreviewWidth() {
      const formatWidths = {
        small: 120,
        medium: 180,
        large: 220,
        page: 150
      };
      return formatWidths[this.config.printFormat] || 180;
    },

    // (NUEVO) Tamaño del QR para la impresión real
    getPrintQRSize() {
      const formatSizes = {
        small: 80,
        medium: 120,
        large: 180,
        page: 100
      };
      return formatSizes[this.config.printFormat] || 120;
    },

    /**
     * ¡CORREGIDO!
     * Este método ahora solo devuelve el STRING que irá dentro del QR.
     */
    getQRCodeContent(item) {
      if (!item) return '';
      
      let content = '';
      
      if (this.config.contentType === 'serialNumber') {
        content = item.serialNumber || `ID:${item.id}`;
      } else if (this.config.contentType === 'url') {
        // Usar serial, o si no, el ID del item
        const identifier = item.serialNumber || item.id;
        content = (this.config.baseUrl || this.defaultBaseUrl) + identifier;
      } else if (this.config.contentType === 'json') {
        const itemData = {
          id: item.id,
          name: item.name,
          serialNumber: item.serialNumber,
          brand: item.brand,
          model: item.model
        };
        content = JSON.stringify(itemData);
      }
      
      return content;
    },
    
    /**
     * ¡ACTUALIZADO!
     * Este método ahora llama a la función de imprimir del navegador.
     */
    printQRCodes() {
      if (!this.canGenerate) return;
      
      this.generating = true;
      
      // Emitir evento por si el padre quiere saber
      this.$emit('qr-generate', this.config);
      
      // Dar tiempo a Vue para que renderice los QR ocultos
      setTimeout(() => {
        this.generating = false;
        
        // Llamar a la impresión del navegador
        window.print();
        
        // Emitir evento de éxito
        this.$emit('qr-success', {
          count: this.items.length,
          totalLabels: this.items.length * this.config.copies,
          format: this.config.printFormat
        });
      }, 500); // 500ms para que se dibujen los SVGs
    }
  }
};
</script>

<style>
/* Estos estilos NO son 'scoped' a propósito */
@media print {
  /* Ocultar todo en la página excepto el área de impresión */
  body * {
    visibility: hidden;
  }
  
  /* Mostrar solo el contenido del modal y sus hijos */
  #qr-printable-area, #qr-printable-area * {
    visibility: visible;
  }
  
  /* Asegurarse de que el modal ocupe todo */
  .modal-overlay {
    position: absolute !important;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    background: white !important;
  }
  
  .modal-content {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    max-height: none !important;
    max-width: none !important;
    width: 100% !important;
  }
  
  /* Ocultar los botones y opciones dentro del modal */
  .non-printable {
    display: none !important;
  }

  /* Mostrar SOLO el área de impresión */
  .print-only-area {
    visibility: visible !important;
    display: block !important;
    width: 100%;
  }

  /* Ocultar la vista previa */
  .qr-preview {
    display: block !important;
    background: white !important;
  }
  
  /* Estilos para el área de impresión */
  .print-only-area {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 10px;
    justify-content: flex-start;
  }
  
  .qr-label-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5px;
    border: 1px dashed #999;
    page-break-inside: avoid; /* Evitar que se corte una etiqueta */
    background: white;
    box-sizing: border-box; /* Asegurar que el padding esté incluido */
    margin: 2px; /* Pequeño margen para la impresión */
  }
  
  /* Tamaños de etiqueta */
  .qr-code-item-print.small .qr-label-wrapper {
    width: 2.5cm;
    height: 2.5cm;
  }
  .qr-code-item-print.medium .qr-label-wrapper {
    width: 5cm;
    height: 5cm;
  }
  .qr-code-item-print.large .qr-label-wrapper {
    width: 7.5cm;
    height: 7.5cm;
  }
  .qr-code-item-print.page .qr-label-wrapper {
    width: 6cm; /* Ajustar para que quepan 3 por fila en A4 */
    height: 4cm;
  }

  .qr-code-item-print .qr-code {
    margin-bottom: 4px !important;
  }

  .qr-code-item-print .qr-details {
    text-align: center;
    word-break: break-word;
  }
  
  .qr-code-item-print .item-name { 
    font-size: 8pt; 
    font-weight: bold; 
    color: black;
  }
  .qr-code-item-print .item-serial { 
    font-size: 7pt; 
    color: black;
  }
  .qr-code-item-print .item-model { 
    font-size: 7pt; 
    color: black;
  }

  /* Ocultar el logo en el formato más pequeño */
  .qr-code-item-print.small .company-logo {
    display: none;
  }
  .qr-code-item-print .company-logo img {
    max-height: 1cm;
    max-width: 100%;
  }
}
</style>

<style scoped>
/* (Aquí va todo tu CSS <style scoped> original) */
.qr-generator {
  padding: 20px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

/* Encabezado */
.qr-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.qr-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-radius: 50%;
  font-size: 24px;
}

.qr-title h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.qr-title p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* Contenido principal */
.qr-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

/* Mensaje sin elementos */
.no-items {
  padding: 40px 0;
  text-align: center;
}

.no-items-message {
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.no-items-message i {
  font-size: 48px;
  color: var(--warning-color, #ff9800);
}

.no-items-message p {
  font-size: 16px;
  color: var(--text-secondary, #666);
  margin: 0;
}

/* Opciones */
.option-section {
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.option-section:last-child {
  margin-bottom: 0;
}

.option-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary, #333);
}

/* Formato de impresión */
.format-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.format-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-primary, white);
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.format-button:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.format-button.active {
  border-color: var(--primary-color, #1976d2);
  background-color: var(--primary-lightest, #e3f2fd);
}

.format-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.format-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  font-size: 18px;
  color: var(--text-secondary, #666);
  flex-shrink: 0;
}

.format-button.active .format-icon {
  color: var(--primary-color, #1976d2);
  background-color: var(--primary-lighter, #bbdefb);
}

.format-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.format-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.format-desc {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

/* Contenido del QR */
.content-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
}

.url-config {
  margin-top: 8px;
  margin-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.url-config label {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.url-config input {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
}

.url-example {
  font-size: 12px;
  color: var(--text-secondary, #666);
  font-style: italic;
}

/* Información a mostrar */
.info-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

/* Opciones de diseño */
.design-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-group label {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.size-slider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.size-slider input[type="range"] {
  flex: 1;
}

.size-slider span {
  font-size: 13px;
  color: var(--text-primary, #333);
  min-width: 50px;
}

.copies-input {
  display: flex;
  align-items: center;
  width: fit-content;
}

.copies-input input {
  width: 60px;
  text-align: center;
  padding: 6px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 0;
  font-size: 14px;
  -moz-appearance: textfield; /* Firefox */
}

.copies-input input::-webkit-outer-spin-button,
.copies-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.copies-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  cursor: pointer;
}

.copies-btn:first-child {
  border-radius: 4px 0 0 4px;
  border-right: none;
}

.copies-btn:last-child {
  border-radius: 0 4px 4px 0;
  border-left: none;
}

.copies-btn:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.copies-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
  background-color: var(--bg-primary, white);
}

/* Vista previa */
.qr-preview {
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  padding: 16px;
}

.qr-preview h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--text-primary, #333);
}

.preview-title {
  font-size: 12px;
  color: var(--text-secondary, #666);
  text-align: center;
  margin-bottom: 8px;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 16px;
  min-height: 200px;
  justify-content: center;
}

.preview-container.page {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.qr-code-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px dashed var(--border-color, #e0e0e0);
  border-radius: 4px;
}

.company-logo {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.company-logo img {
  max-height: 20px;
  max-width: 80%;
}

.qr-code {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  /* (NUEVO) Asegurar que el SVG se muestre */
  width: v-bind(config.qrSize + 'px');
  height: v-bind(config.qrSize + 'px');
}

.qr-code img {
  max-width: 100%;
  height: auto;
}

.qr-details {
  width: 100%;
  text-align: center;
}

.item-name {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  word-break: break-word;
}

.item-serial {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-bottom: 4px;
}

.item-model {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

/* Pequeño */
.preview-container.small .qr-code-item {
  max-width: 120px;
}

.preview-container.small .qr-code {
  max-width: 80px;
  max-height: 80px;
}

.preview-container.small .item-name {
  font-size: 10px;
  margin-bottom: 2px;
}

.preview-container.small .item-serial,
.preview-container.small .item-model {
  font-size: 8px;
  margin-bottom: 2px;
}

/* Mediano */
.preview-container.medium .qr-code-item {
  max-width: 180px;
}

.preview-container.medium .qr-code {
  max-width: 120px;
  max-height: 120px;
}

/* Grande */
.preview-container.large .qr-code-item {
  max-width: 220px;
}

.preview-container.large .qr-code {
  max-width: 150px;
  max-height: 150px;
}

.preview-container.large .item-name {
  font-size: 16px;
}

.preview-container.large .item-serial,
.preview-container.large .item-model {
  font-size: 14px;
}

/* (NUEVO) Ocultar el área de impresión real */
.print-only-area {
  display: none;
}


/* Generación en progreso */
.generating-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}

.generating-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background-color: var(--bg-primary, white);
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.generating-content h4 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.generating-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-lighter, #bbdefb);
  border-top: 3px solid var(--primary-color, #1976d2);
  border-radius: 50%;
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

/* Acciones */
.qr-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Botones estándar */
.btn-primary,
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark, #1565c0);
}

.btn-outline {
  background-color: transparent;
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #e0e0e0);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-primary:disabled,
.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .qr-generator {
    padding: 16px;
  }
  
  .qr-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .preview-container.page {
    grid-template-columns: 1fr;
  }
  
  .qr-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }
  
  .btn-primary,
  .btn-outline {
    width: 100%;
    justify-content: center;
  }
}
</style>