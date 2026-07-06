import { describe, it, expect } from 'vitest'
import { r2, bruttoVon, effektiverVpNetto, einkaufNettoNachRabatt } from './preise'

describe('r2', () => {
  it('rundet cent-sicher auf 2 Nachkommastellen', () => {
    expect(r2(1.005)).toBeCloseTo(1.0, 10) // klassischer Float-Fall: 1.005 ist intern 1.00499…
    expect(r2(1.015)).toBeCloseTo(1.01, 10)
    expect(r2(119.004999)).toBe(119.0)
    expect(r2(0)).toBe(0)
    expect(r2(-2.345)).toBeCloseTo(-2.35, 10) // -2.345 ist intern -2.34500…003 → -2.35
  })
})

describe('bruttoVon', () => {
  it('19 % MwSt (Dezimalbruch wie getMwstSatz)', () => {
    expect(bruttoVon(100, 0.19)).toBe(119)
    expect(bruttoVon(151.26, 0.19)).toBe(180)
  })
  it('0 % MwSt → netto = brutto', () => {
    expect(bruttoVon(42.5, 0)).toBe(42.5)
  })
  it('rundet auf Cent', () => {
    expect(bruttoVon(9.99, 0.19)).toBe(11.89) // 11.8881 → 11.89
  })
})

describe('Bestand (Regressions-Schloss für die geteilten Preis-Helfer)', () => {
  it('effektiverVpNetto: Override + Rabatt', () => {
    expect(effektiverVpNetto({ verkaufspreis_override: 200, rabatt_prozent: 10 }, 100)).toBe(180)
    expect(effektiverVpNetto({ verkaufspreis_override: null, rabatt_prozent: null }, 100)).toBe(100)
    expect(effektiverVpNetto({ verkaufspreis_override: null, rabatt_prozent: null }, null)).toBe(0)
  })
  it('einkaufNettoNachRabatt', () => {
    expect(einkaufNettoNachRabatt(100, 25)).toBe(75)
    expect(einkaufNettoNachRabatt(null, 25)).toBe(0)
    expect(einkaufNettoNachRabatt(89.99, null)).toBe(89.99)
  })
})
