<template>
  <div class="rust-frame">
    <div v-if="title" class="rust-frame-title">{{ title }}</div>
    <div class="rust-frame-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style scoped>
.rust-frame {
  border: 2px solid var(--iron);
  background: rgba(10, 6, 4, 0.75);
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.5);
  position: relative;
}

.rust-frame::after {
  content: '';
  position: absolute;
  inset: 3px;
  pointer-events: none;
  border: 1px solid rgba(100, 50, 20, 0.15);
}

.rust-frame-title {
  padding: 8px 16px;
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: var(--amber);
  border-bottom: 1px solid rgba(100, 50, 20, 0.2);
  background: rgba(16, 10, 7, 0.6);
  text-align: center;
}

.rust-frame-body {
  padding: 14px 16px;
}
</style>
