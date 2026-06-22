interface BarkOptions {
  group?: string
  sound?: string
}

export async function pushBark(
  title: string,
  body: string,
  options: BarkOptions = {},
): Promise<boolean> {
  const token = import.meta.env.VITE_BARK_TOKEN
  if (!token) {
    console.warn('[Bark] VITE_BARK_TOKEN 未配置,推送已跳过')
    return false
  }
  try {
    const res = await fetch(`https://api.day.app/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, ...options }),
    })
    return res.ok
  } catch (err) {
    console.error('[Bark] 推送失败', err)
    return false
  }
}
