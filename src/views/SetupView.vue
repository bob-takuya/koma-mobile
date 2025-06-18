<script setup lang="ts">
import BucketSetup from '../components/BucketSetup.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleSetupComplete = () => {
  router.push('/camera')
}
</script>

<template>
  <div class="setup-view">
    <BucketSetup @setup-complete="handleSetupComplete" />
  </div>
</template>

<style scoped>
.setup-view {
  width: 100vw;
  height: 100vh;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
}
</style>
