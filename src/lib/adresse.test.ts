import { describe, it, expect } from 'vitest'
import { parseAdresse } from './adresse'

describe('parseAdresse', () => {
  it('Standard: „Straße Nr, PLZ Ort"', () => {
    expect(parseAdresse('Musterstraße 12, 12345 Berlin')).toEqual({
      strasse: 'Musterstraße 12', plz: '12345', ort: 'Berlin',
    })
  })

  it('mit Land hinten: Land gehört NICHT in die Teile', () => {
    expect(parseAdresse('Musterstraße 12, 12345 Berlin, Deutschland')).toEqual({
      strasse: 'Musterstraße 12', plz: '12345', ort: 'Berlin',
    })
  })

  it('Zeilenumbruch statt Komma', () => {
    expect(parseAdresse('Musterstraße 12\n12345 Berlin')).toEqual({
      strasse: 'Musterstraße 12', plz: '12345', ort: 'Berlin',
    })
  })

  it('ohne Komma („Straße Nr PLZ Ort")', () => {
    expect(parseAdresse('Hauptstr. 5 80331 München')).toEqual({
      strasse: 'Hauptstr. 5', plz: '80331', ort: 'München',
    })
  })

  it('4-stellige Hausnummer ohne Komma → greedy: Nummer bleibt bei der Straße', () => {
    expect(parseAdresse('Hauptstr. 1234 80331 München')).toEqual({
      strasse: 'Hauptstr. 1234', plz: '80331', ort: 'München',
    })
  })

  it('nur „PLZ Ort" (keine Straße)', () => {
    expect(parseAdresse('12345 Berlin')).toEqual({ strasse: null, plz: '12345', ort: 'Berlin' })
  })

  it('AT/CH: 4-stellige PLZ', () => {
    expect(parseAdresse('Getreidegasse 9, 5020 Salzburg')).toEqual({
      strasse: 'Getreidegasse 9', plz: '5020', ort: 'Salzburg',
    })
  })

  it('mehrteiliger Ort („Frankfurt am Main")', () => {
    expect(parseAdresse('Zeil 1, 60313 Frankfurt am Main')).toEqual({
      strasse: 'Zeil 1', plz: '60313', ort: 'Frankfurt am Main',
    })
  })

  it('Straßenname mit Zahl („Straße des 17. Juni")', () => {
    expect(parseAdresse('Straße des 17. Juni 135, 10623 Berlin')).toEqual({
      strasse: 'Straße des 17. Juni 135', plz: '10623', ort: 'Berlin',
    })
  })

  it('mehrere Segmente vor der PLZ (c/o) bleiben zusammen bei der Straße', () => {
    expect(parseAdresse('c/o Studio Nord, Musterweg 3, 20095 Hamburg')).toEqual({
      strasse: 'c/o Studio Nord, Musterweg 3', plz: '20095', ort: 'Hamburg',
    })
  })

  it('kein PLZ-Muster → null (Fallback auf Komplett-Anzeige)', () => {
    expect(parseAdresse('Musterstraße 12')).toBeNull()
    expect(parseAdresse('Berlin')).toBeNull()
  })

  it('leer/null → null', () => {
    expect(parseAdresse('')).toBeNull()
    expect(parseAdresse('   ')).toBeNull()
    expect(parseAdresse(null)).toBeNull()
    expect(parseAdresse(undefined)).toBeNull()
  })
})
