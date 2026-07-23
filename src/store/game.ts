import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const depth = ref(800)

  function pushDeeper() {
    depth.value = 500
  }

  function pullBack() {
    depth.value = 800
  }

  return { depth, pushDeeper, pullBack }
})
