<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="transitionName" mode="out-in">
      <component :is="Component" :key="route.path" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const transitionName = ref('fade')

watch(
  () => router.currentRoute.value.path,
  (to, from) => {
    if (!from) {
      transitionName.value = 'fade'
      return
    }
    const toDepth = to === '/' ? 0 : 1
    const fromDepth = from === '/' ? 0 : 1
    transitionName.value = toDepth > fromDepth ? 'push-deeper' : 'pull-back'
  },
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.push-deeper-enter-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.push-deeper-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.push-deeper-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
.push-deeper-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

.pull-back-enter-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.pull-back-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.pull-back-enter-from {
  opacity: 0;
  transform: scale(1.02);
}
.pull-back-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
