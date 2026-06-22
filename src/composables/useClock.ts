import { ref, onMounted, onUnmounted } from 'vue'

export function useClock() {
  const text = ref('')
  let timer: ReturnType<typeof setInterval> | null = null

  function update(): void {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    text.value = `${hh}:${mm}:${ss}`
  }

  onMounted(() => {
    update()
    timer = setInterval(update, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { text }
}
