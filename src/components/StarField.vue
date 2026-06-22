<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const layers = [
  { count: 60, size: 1, opacity: 0.5, dur: '4s' },
  { count: 40, size: 2, opacity: 0.7, dur: '6s' },
  { count: 20, size: 1, opacity: 0.35, dur: '8s' },
]

const viewport = ref({ w: 1200, h: 800 })

function genStars(count: number, areaX: number, areaY: number): string {
  const stars: string[] = []
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * areaX)
    const y = Math.floor(Math.random() * areaY)
    stars.push(`${x}px ${y}px #fff`)
  }
  return stars.join(',')
}

const starLayers = computed(() =>
  layers.map((l) => ({
    ...l,
    shadow: genStars(l.count, viewport.value.w, viewport.value.h),
  })),
)

let resizeTimer: ReturnType<typeof setTimeout> | null = null

function onResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    viewport.value = { w: window.innerWidth, h: window.innerHeight }
  }, 200)
}

onMounted(() => {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})
</script>

<template>
  <div class="starfield" aria-hidden="true">
    <div
      v-for="(layer, i) in starLayers"
      :key="i"
      class="starfield__layer"
      :style="{
        width: layer.size + 'px',
        height: layer.size + 'px',
        boxShadow: layer.shadow,
        opacity: layer.opacity,
      }"
    />
  </div>
</template>

<style scoped>
.starfield {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 40%, rgba(26, 34, 56, 0.4), transparent 70%);
}
.starfield__layer {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
}
</style>
