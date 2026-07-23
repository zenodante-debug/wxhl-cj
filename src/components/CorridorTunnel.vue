<template>
  <div class="title-scene">
    <slot name="particles"></slot>

    <div class="ceiling-slab">
      <div class="ceiling-pipes">
        <div class="pipe-run"></div>
        <div class="pipe-run delay"></div>
      </div>
      <div class="hanging-light">
        <div class="bulb-wire"></div>
        <div class="bulb-glass"></div>
      </div>
    </div>

    <div class="corridor-scene" :style="{ perspective: store.depth + 'px' }">
      <div class="corridor-wall wall-left">
        <div class="flesh-veins"></div>
        <div class="rust-patches"></div>
        <div class="blood-streak s1"></div>
        <div class="blood-streak s2"></div>
        <div class="wall-scratch scratch-l1">NO RETURN</div>
        <div class="wall-scratch scratch-l2">契约即枷锁</div>
      </div>

      <div class="corridor-wall wall-right">
        <div class="flesh-veins right"></div>
        <div class="rust-patches right"></div>
        <div class="blood-streak s3"></div>
        <div class="wall-handprint hp1"></div>
        <div class="wall-handprint hp2"></div>
      </div>

      <div class="floor-plain">
        <div class="floor-grid-lines"></div>
        <div class="floor-blood-pool"></div>
        <div class="floor-crack"></div>
      </div>

      <div class="far-end">
        <div class="portal-glow"></div>
        <div class="flesh-growth"></div>
      </div>
    </div>

    <div class="content-overlay">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../store/game'

const store = useGameStore()
</script>

<style scoped>
.title-scene {
  max-width: 800px;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  position: relative;
  background: var(--bg-void);
}

.ceiling-slab {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 12%;
  background: linear-gradient(180deg, #050302 0%, #0a0705 60%, #120c08 100%);
  z-index: 100;
  border-bottom: 1px solid var(--iron-dark);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

.ceiling-slab::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(100, 60, 30, 0.3) 20%, rgba(100, 60, 30, 0.4) 50%, rgba(100, 60, 30, 0.3) 80%, transparent);
}

.ceiling-pipes {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  padding: 0 20%;
}

.pipe-run {
  width: 14px;
  height: 100%;
  background: linear-gradient(90deg, #1a1612, #252018, #1a1612);
  border-radius: 0 0 3px 3px;
  position: relative;
}

.pipe-run::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 50%;
  width: 2px;
  height: 6px;
  background: rgba(80, 100, 70, 0.6);
  border-radius: 1px;
  animation: pipeDrip 5s ease-in-out infinite;
}

.pipe-run.delay::after {
  animation-delay: 2s;
}

@keyframes pipeDrip {
  0%, 85%, 100% { transform: scaleY(1); opacity: 0.5; }
  90% { transform: scaleY(4); opacity: 1; }
}

.hanging-light {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bulb-wire {
  width: 1px;
  height: 8px;
  background: var(--iron);
}

.bulb-glass {
  width: 24px;
  height: 14px;
  background: radial-gradient(ellipse at 50% 30%, rgba(210, 180, 140, 0.9), rgba(180, 140, 100, 0.4));
  border-radius: 50% / 40%;
  box-shadow: 0 0 40px rgba(200, 160, 100, 0.5), 0 0 80px rgba(200, 150, 80, 0.25);
  animation: bulbFlick 7s ease-in-out infinite;
}

@keyframes bulbFlick {
  0%, 25%, 27%, 29%, 31%, 100% { opacity: 1; }
  26%, 28%, 30% { opacity: 0.2; }
}

.corridor-scene {
  position: absolute;
  top: 12%;
  bottom: 0;
  left: 0;
  right: 0;
  perspective-origin: 50% 50%;
  transition: perspective 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.corridor-wall {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36%;
  overflow: hidden;
}

.wall-left {
  left: 0;
  background:
    radial-gradient(ellipse at 100% 20%, var(--flesh-light) 0%, transparent 35%),
    radial-gradient(ellipse at 90% 60%, rgba(80, 20, 8, 0.4) 0%, transparent 40%),
    radial-gradient(ellipse at 100% 85%, rgba(40, 10, 5, 0.5) 0%, transparent 30%),
    linear-gradient(90deg, var(--rust-dark) 0%, var(--rust) 50%, var(--rust-mid) 100%);
  clip-path: polygon(0 0, 100% 5%, 100% 95%, 0 100%);
  border-right: 1px solid rgba(120, 40, 20, 0.2);
}

.wall-right {
  right: 0;
  background:
    radial-gradient(ellipse at 0% 30%, var(--flesh-light) 0%, transparent 35%),
    radial-gradient(ellipse at 10% 50%, rgba(80, 20, 8, 0.4) 0%, transparent 40%),
    radial-gradient(ellipse at 0% 75%, rgba(40, 10, 5, 0.5) 0%, transparent 30%),
    linear-gradient(270deg, var(--rust-dark) 0%, var(--rust) 50%, var(--rust-mid) 100%);
  clip-path: polygon(0 5%, 100% 0, 100% 100%, 0 95%);
  border-left: 1px solid rgba(120, 40, 20, 0.2);
}

.flesh-veins {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 80% 15%, rgba(60, 15, 10, 0.6) 0%, transparent 25%),
    radial-gradient(ellipse at 75% 45%, rgba(40, 10, 8, 0.4) 0%, transparent 20%),
    radial-gradient(ellipse at 85% 70%, rgba(50, 12, 8, 0.5) 0%, transparent 22%),
    radial-gradient(ellipse at 70% 90%, rgba(35, 8, 5, 0.35) 0%, transparent 18%);
  animation: fleshPulse 8s ease-in-out infinite;
}

.flesh-veins.right {
  background:
    radial-gradient(ellipse at 20% 20%, rgba(60, 15, 10, 0.6) 0%, transparent 25%),
    radial-gradient(ellipse at 25% 55%, rgba(40, 10, 8, 0.4) 0%, transparent 20%),
    radial-gradient(ellipse at 15% 65%, rgba(50, 12, 8, 0.5) 0%, transparent 22%),
    radial-gradient(ellipse at 30% 85%, rgba(35, 8, 5, 0.35) 0%, transparent 18%);
}

@keyframes fleshPulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.6; }
}

.rust-patches {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 60% 30%, rgba(120, 50, 20, 0.3) 0%, transparent 30%),
    radial-gradient(circle at 80% 60%, rgba(100, 40, 15, 0.25) 0%, transparent 25%),
    radial-gradient(circle at 50% 80%, rgba(90, 35, 10, 0.2) 0%, transparent 20%);
}

.rust-patches.right {
  background:
    radial-gradient(circle at 40% 25%, rgba(120, 50, 20, 0.3) 0%, transparent 30%),
    radial-gradient(circle at 20% 55%, rgba(100, 40, 15, 0.25) 0%, transparent 25%),
    radial-gradient(circle at 45% 75%, rgba(90, 35, 10, 0.2) 0%, transparent 20%);
}

.blood-streak {
  position: absolute;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(120, 15, 10, 0.3) 20%, rgba(80, 8, 5, 0.5) 60%, rgba(50, 5, 3, 0.2) 100%);
}

.s1 { right: 12%; top: 8%; width: 3px; height: 40%; }
.s2 { right: 25%; top: 35%; width: 2px; height: 30%; }
.s3 { left: 18%; top: 15%; width: 4px; height: 35%; }

.wall-scratch {
  position: absolute;
  pointer-events: none;
  font-family: var(--font-display);
  color: rgba(200, 160, 130, 0.35);
  font-size: 0.6rem;
  letter-spacing: 3px;
  transform: rotate(-2deg);
}

.scratch-l1 { left: 10%; top: 15%; }
.scratch-l2 { left: 8%; bottom: 25%; font-size: 0.7rem; color: rgba(200, 160, 130, 0.3); transform: rotate(1deg); }

.wall-handprint {
  position: absolute;
  pointer-events: none;
  width: 22px;
  height: 26px;
  border-radius: 40% 40% 35% 35%;
  background: rgba(100, 15, 8, 0.25);
  box-shadow: 0 0 8px rgba(80, 10, 5, 0.2);
  transform: rotate(-15deg);
}

.hp1 { right: 15%; top: 55%; }
.hp2 { left: 10%; top: 48%; transform: rotate(10deg); opacity: 0.6; }

.floor-plain {
  position: absolute;
  bottom: 0;
  left: 14%;
  right: 14%;
  height: 22%;
  background: linear-gradient(0deg, rgba(10, 6, 4, 0.9) 0%, rgba(20, 12, 8, 0.7) 40%, rgba(25, 15, 10, 0.3) 70%, transparent 100%);
  clip-path: polygon(0 30%, 100% 30%, 100% 100%, 0 100%);
  overflow: hidden;
}

.floor-grid-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.floor-grid-lines::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(60, 30, 20, 0.12) 6px, rgba(60, 30, 20, 0.12) 7px);
}

.floor-blood-pool {
  position: absolute;
  left: 55%;
  top: 40%;
  width: 50px;
  height: 30px;
  background: radial-gradient(ellipse at center, rgba(80, 10, 5, 0.35) 0%, rgba(60, 8, 3, 0.15) 50%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.floor-crack {
  position: absolute;
  left: 40%;
  top: 20%;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(10, 5, 3, 0.6) 30%, rgba(10, 5, 3, 0.4) 70%, transparent);
  pointer-events: none;
  transform: rotate(-4deg);
}

.far-end {
  position: absolute;
  top: 18%;
  bottom: 26%;
  left: 33%;
  right: 33%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.portal-glow {
  width: 60%;
  height: 80%;
  background: radial-gradient(ellipse at center, rgba(180, 60, 20, 0.2) 0%, rgba(120, 30, 10, 0.08) 40%, transparent 70%);
  animation: portalBreathe 4s ease-in-out infinite;
  position: absolute;
}

@keyframes portalBreathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

.flesh-growth {
  position: absolute;
  top: -10px;
  left: 30%;
  right: 30%;
  height: 15px;
  background:
    radial-gradient(ellipse at 40% 100%, rgba(80, 20, 10, 0.5) 0%, transparent 60%),
    radial-gradient(ellipse at 60% 100%, rgba(60, 15, 8, 0.4) 0%, transparent 50%);
  pointer-events: none;
}

.content-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.content-overlay > * {
  pointer-events: auto;
}
</style>
