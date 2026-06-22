export async function runPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number = 5,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let cursor = 0

  async function runNext(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      if (item === undefined) continue
      results[index] = await worker(item)
    }
  }

  const size = Math.min(concurrency, items.length)
  const workers = Array.from({ length: size }, () => runNext())
  await Promise.all(workers)
  return results
}
