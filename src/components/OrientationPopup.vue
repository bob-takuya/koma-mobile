<template>
  <div v-if="showOrientationWarning" class="orientation-popup-overlay" @click="dismissWarning">
    <div class="orientation-popup" @click.stop>
      <div class="orientation-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <div class="rotation-arrows">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6"/>
            <path d="M21 8l-5-5a8 8 0 0 0-11.31 0L3 5"/>
            <path d="M3 16v6h6"/>
            <path d="M3 16l5 5a8 8 0 0 0 11.31 0L21 19"/>
          </svg>
        </div>
      </div>
      
      <h3 class="popup-title">画面を横向きにしてください</h3>
      <p class="popup-message">
        最適な撮影体験のために、デバイスを横向きに回転させてください。
      </p>
      
      <button class="popup-button" @click="dismissWarning">
        継続する
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOrientationCheck } from '@/composables/useOrientationCheck'

const { showOrientationWarning, dismissWarning } = useOrientationCheck()
</script>

<style scoped>
.orientation-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.orientation-popup {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideInUp 0.3s ease;
}

.orientation-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: #007bff;
}

.rotation-arrows {
  position: absolute;
  top: -8px;
  right: -8px;
  color: #28a745;
  animation: pulse 2s infinite;
}

.popup-title {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.popup-message {
  color: #666;
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 2rem 0;
}

.popup-button {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.popup-button:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.popup-button:active {
  transform: translateY(0);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* モバイル対応 */
@media (max-width: 480px) {
  .orientation-popup {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .popup-title {
    font-size: 1.25rem;
  }
  
  .popup-message {
    font-size: 0.9rem;
  }
}
</style>
