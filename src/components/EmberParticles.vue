<template>
  <canvas ref="canvasRef" class="ember-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

const props = withDefaults(
  defineProps<{
    particleCount?: number
    baseColor?: string
    speed?: number
  }>(),
  {
    particleCount: 50,
    baseColor: '180,80,30',
    speed: 0.1,
  },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
let particles: Array<{
  x: number
  y: number
  r: number
  vx: number
  vy: number
  o: number
  life: number
}> = []
let ctx: CanvasRenderingContext2D | null = null
let frame = 0

function resize() {
  const c = canvasRef.value
  if (!c || !c.parentElement) return
  const rect = c.parentElement.getBoundingClientRect()
  c.width = rect.width
  c.height = rect.height
}

function initParticles() {
  const c = canvasRef.value
  if (!c) return
  particles = []
  for (let i = 0; i < props.particleCount; i++) {
    particles.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * (props.speed * 2),
      vy: -(Math.random() * props.speed * 1.5 + props.speed * 0.4),
      o: Math.random() * 0.35 + 0.08,
      life: Math.random(),
    })
  }
  frame = 0
}

function draw() {
  const c = canvasRef.value
  if (!c || !ctx) return
  frame++
  ctx.clearRect(0, 0, c.width, c.height)

  const bc = props.baseColor

  for (const p of particles) {
    p.y += p.vy
    p.x += p.vx + Math.sin(frame * 0.008 + p.life) * 0.2
    p.life -= 0.001

    if (p.life <= 0 || p.y < -20) {
      p.y = c.height + 20
      p.x = Math.random() * c.width
      p.life = 1
    }

    const a = p.o * Math.max(0, p.life)
    if (a < 0.01) continue

    ctx.beginPath()
    ctx.fillStyle = `rgba(${bc},${a})`
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.fillStyle = `rgba(${bc},${a * 0.15})`
    ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

onMounted(() => {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  resize()
  initParticles()
  window.addEventListener('resize', resize)
  gsap.ticker.add(draw)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  gsap.ticker.remove(draw)
})
</script>

<style scoped>
.ember-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
</style>
