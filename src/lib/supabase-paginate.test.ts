import { describe, it, expect, vi } from 'vitest'
import { ladeAlleSeiten, ladeNachIds } from './supabase-paginate'

function makeRows(n: number): { id: string }[] {
  return Array.from({ length: n }, (_, i) => ({ id: String(i) }))
}

describe('ladeAlleSeiten', () => {
  it('0 Zeilen → leeres Ergebnis, genau ein Aufruf (range 0–999)', async () => {
    const seite = vi.fn(async () => ({ data: [] as { id: string }[], error: null }))
    const res = await ladeAlleSeiten(seite, 1000)
    expect(res.data).toEqual([])
    expect(res.error).toBeNull()
    expect(seite).toHaveBeenCalledTimes(1)
    expect(seite).toHaveBeenCalledWith(0, 999)
  })

  it('weniger als chunk → ein Aufruf, alle Zeilen', async () => {
    const rows = makeRows(50)
    const seite = vi.fn(async () => ({ data: rows, error: null }))
    const res = await ladeAlleSeiten(seite, 1000)
    expect(res.data).toHaveLength(50)
    expect(seite).toHaveBeenCalledTimes(1)
  })

  it('exakt chunk → zweiter (leerer) Aufruf bestätigt das Ende', async () => {
    const seite = vi.fn(async (von: number) =>
      von === 0 ? { data: makeRows(1000), error: null } : { data: [] as { id: string }[], error: null },
    )
    const res = await ladeAlleSeiten(seite, 1000)
    expect(res.data).toHaveLength(1000)
    expect(seite).toHaveBeenCalledTimes(2)
    expect(seite).toHaveBeenNthCalledWith(2, 1000, 1999)
  })

  it('mehr als chunk → mehrere Seiten zusammengeführt (1247)', async () => {
    const seite = vi.fn(async (von: number) => {
      if (von === 0) return { data: makeRows(1000), error: null }
      if (von === 1000) return { data: makeRows(247), error: null }
      return { data: [] as { id: string }[], error: null }
    })
    const res = await ladeAlleSeiten(seite, 1000)
    expect(res.data).toHaveLength(1247)
    expect(seite).toHaveBeenCalledTimes(2)
  })

  it('Fehler wird durchgereicht (kein Teil-Ergebnis)', async () => {
    const seite = vi.fn(async () => ({ data: null, error: { message: 'boom' } }))
    const res = await ladeAlleSeiten(seite, 1000)
    expect(res.data).toBeNull()
    expect(res.error?.message).toBe('boom')
  })
})

describe('ladeNachIds', () => {
  it('leere ID-Liste → kein Aufruf, leeres Ergebnis', async () => {
    const seite = vi.fn(async () => ({ data: [] as { id: string }[], error: null }))
    const res = await ladeNachIds([], seite, 1000)
    expect(res.data).toEqual([])
    expect(seite).not.toHaveBeenCalled()
  })

  it('1500 ids → 2 Aufrufe (1000 + 500), alle Treffer', async () => {
    const ids = makeRows(1500).map((r) => r.id)
    const seite = vi.fn(async (chunk: string[]) => ({ data: chunk.map((id) => ({ id })), error: null }))
    const res = await ladeNachIds(ids, seite, 1000)
    expect(res.data).toHaveLength(1500)
    expect(seite).toHaveBeenCalledTimes(2)
    expect(seite.mock.calls[0][0]).toHaveLength(1000)
    expect(seite.mock.calls[1][0]).toHaveLength(500)
  })

  it('Fehler wird durchgereicht', async () => {
    const seite = vi.fn(async () => ({ data: null, error: { message: 'x' } }))
    const res = await ladeNachIds(['a'], seite, 1000)
    expect(res.error?.message).toBe('x')
  })
})
