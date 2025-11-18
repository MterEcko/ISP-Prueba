<template>
  <div class="video-call-container">
    <div class="page-header">
      <h2>📹 Videollamadas</h2>
      <p>Sistema de videollamadas - En desarrollo</p>
    </div>

    <div class="video-placeholder">
      <div class="video-area">
        <p>Área de video local</p>
      </div>
      <div class="video-area">
        <p>Área de video remoto</p>
      </div>
    </div>

    <div class="call-controls">
      <button class="btn-control" disabled>
        🎤 Micrófono
      </button>
      <button class="btn-control" disabled>
        📹 Cámara
      </button>
      <button class="btn-control btn-end" disabled>
        📞 Colgar
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoCallView',
  data() {
    return {
      inCall: false
    };
  }
};
</script>

<style scoped>
.video-call-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.video-placeholder {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.video-area {
  aspect-ratio: 16/9;
  background-color: #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.call-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-control {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #2196F3;
  color: white;
  cursor: pointer;
}

.btn-control:hover:not(:disabled) {
  background-color: #1976D2;
}

.btn-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-end {
  background-color: #f44336;
}

.btn-end:hover:not(:disabled) {
  background-color: #d32f2f;
}
</style>
