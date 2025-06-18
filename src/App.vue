<template>
  <div id="app" class="stop-motion-app">
    <RouterView />
    <OrientationPopup />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import OrientationPopup from '@/components/OrientationPopup.vue'
</script>

<style>
/* Global app styles */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  background: #000000;
  color: #ffffff;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #000000;
}

.stop-motion-app {
  width: 100%;
  height: 100%;
  background: #000000;
}

/* カメラインターフェースを含むページでのみoverflowを制限 */
.camera-interface {
  overflow: hidden;
}

/* Global mobile optimizations */
* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

/* Touch and interaction optimizations */
button,
input,
select,
textarea {
  touch-action: manipulation;
}

/* Prevent zoom on input focus (iOS Safari) */
input,
select,
textarea {
  font-size: 16px;
}

@media (max-width: 768px) {
  input,
  select,
  textarea {
    font-size: 16px; /* Prevent zoom */
  }
}

/* Smooth transitions for all interactive elements */
button,
a,
input,
select {
  transition: all 0.2s ease;
}

/* High contrast focus styles for accessibility */
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

/* Loading animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Utility classes */
.fade-in {
  animation: fadeIn 0.3s ease;
}

.slide-in-up {
  animation: slideInUp 0.4s ease;
}

/* Print styles */
@media print {
  .stop-motion-app {
    height: auto;
    overflow: visible;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  button,
  input,
  select {
    border: 2px solid;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
