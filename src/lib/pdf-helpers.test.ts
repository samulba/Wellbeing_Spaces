import { describe, it, expect } from 'vitest'
import { pdfLegalFooterZeilen, pdfTraegerZeile, pdfFirmenname, type OrgLegalData } from './pdf-helpers'

const ORG_VOLL: OrgLegalData = {
  name: 'Wellbeing Concepts',
  rechtsform: 'GmbH',
  handelsregister_nr: 'HRB 12345',
  registergericht: 'AG Musterstadt',
  geschaeftsfuehrer: 'Max Muster',
  ust_id: 'DE123456789',
  steuernummer: '12/345/67890',
  bank_name: 'Musterbank',
  bank_iban: 'DE00 0000 0000 0000 0000 00',
  bank_bic: 'MUSTDEFF',
}

describe('pdfLegalFooterZeilen', () => {
  it('Zeile 1 beginnt mit Rechtsträger (name + rechtsform)', () => {
    const zeilen = pdfLegalFooterZeilen(ORG_VOLL)
    expect(zeilen[0]).toBe('Wellbeing Concepts GmbH  ·  HRB 12345  ·  AG Musterstadt  ·  GF: Max Muster')
  })

  it('ohne name → nur rechtsform (bisheriges Verhalten)', () => {
    const zeilen = pdfLegalFooterZeilen({ ...ORG_VOLL, name: null })
    expect(zeilen[0]).toBe('GmbH  ·  HRB 12345  ·  AG Musterstadt  ·  GF: Max Muster')
  })

  it('null-Org → leere Liste', () => {
    expect(pdfLegalFooterZeilen(null)).toEqual([])
  })

  it('leere Felder werden übersprungen; Steuerzeile separat', () => {
    const zeilen = pdfLegalFooterZeilen({
      ...ORG_VOLL, handelsregister_nr: null, registergericht: null, geschaeftsfuehrer: null, steuernummer: null,
    })
    expect(zeilen).toEqual(['Wellbeing Concepts GmbH', 'USt-IdNr. DE123456789'])
  })

  it('Bank-Zeile nur mit includeBank', () => {
    expect(pdfLegalFooterZeilen(ORG_VOLL).some((z) => z.includes('IBAN'))).toBe(false)
    const mitBank = pdfLegalFooterZeilen(ORG_VOLL, { includeBank: true })
    expect(mitBank[mitBank.length - 1]).toContain('IBAN: DE00')
  })
})

describe('pdfTraegerZeile', () => {
  it('Marke ≠ Träger → Zeile mit Name + Rechtsform', () => {
    expect(pdfTraegerZeile('Wellbeing Spaces', { name: 'Wellbeing Concepts', rechtsform: 'GmbH' }))
      .toBe('Wellbeing Concepts GmbH')
  })

  it('ohne Rechtsform → nur Name', () => {
    expect(pdfTraegerZeile('Wellbeing Spaces', { name: 'Wellbeing Concepts', rechtsform: null }))
      .toBe('Wellbeing Concepts')
  })

  it('identisch zur Marke (case-/trim-insensitiv) → null', () => {
    expect(pdfTraegerZeile('Wellbeing Spaces', { name: '  wellbeing spaces ', rechtsform: null })).toBeNull()
  })

  it('leer / null / Registrierungs-Platzhalter → null', () => {
    expect(pdfTraegerZeile('Marke', null)).toBeNull()
    expect(pdfTraegerZeile('Marke', { name: null, rechtsform: 'GmbH' })).toBeNull()
    expect(pdfTraegerZeile('Marke', { name: '   ', rechtsform: null })).toBeNull()
    expect(pdfTraegerZeile('Marke', { name: 'Meine Organisation', rechtsform: null })).toBeNull()
  })
})

describe('pdfFirmenname', () => {
  it('nutzt branding.firmenname, fällt sonst auf Standard zurück', () => {
    expect(pdfFirmenname({ firmenname: 'Studio Nord' })).toBe('Studio Nord')
    expect(pdfFirmenname({ firmenname: '   ' })).toBe('Wellbeing Spaces')
    expect(pdfFirmenname(null)).toBe('Wellbeing Spaces')
  })
})
