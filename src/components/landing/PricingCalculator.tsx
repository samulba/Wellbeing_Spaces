'use client'

import { useState } from 'react'
import AnimateOnScroll from './AnimateOnScroll'

function fmt(val: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(val)
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[13px] font-semibold text-gray-700">{label}</label>
        <span className="font-syne font-bold text-[15px] text-[#445c49]">{display}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-gray-100 rounded-full" />
        <div
          className="absolute h-1.5 bg-[#445c49] rounded-full transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-5"
          aria-label={label}
        />
        <div
          className="absolute w-5 h-5 bg-white border-2 border-[#445c49] rounded-full shadow-md transition-all duration-100 pointer-events-none"
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-300">
        <span>{min.toLocaleString('de-DE')}{label.includes('Marge') || label.includes('Provision') ? '%' : '€'}</span>
        <span>{max.toLocaleString('de-DE')}{label.includes('Marge') || label.includes('Provision') ? '%' : '€'}</span>
      </div>
    </div>
  )
}

export default function PricingCalculator() {
  const [ep, setEp] = useState(800)
  const [marge, setMarge] = useState(40)
  const [prov, setProv] = useState(10)

  const vpNetto = ep / (1 - marge / 100)
  const vpBrutto = vpNetto * 1.19
  const provisionEuro = vpNetto * (prov / 100)
  const gewinn = vpNetto - ep - provisionEuro

  return (
    <section className="bg-white py-28 relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] bg-wellbeing-cream/70 blur-[100px] rounded-full pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
              Live Demo
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[48px] text-[#445c49] mb-3 leading-[1.1]">
              Probier die Kalkulation<br className="hidden md:block" /> direkt aus
            </h2>
            <p className="text-[16px] text-gray-500 max-w-lg mx-auto">
              Einkaufspreis und Marge eingeben – Wellbeing Spaces berechnet VP netto, brutto und Provision sofort.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100} type="scale-in">
          <div className="rounded-3xl border border-gray-200 overflow-hidden shadow-2xl shadow-gray-100/80">
            <div className="grid md:grid-cols-2">

              {/* Left: Inputs */}
              <div className="p-8 bg-white space-y-8">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Eingabe</p>
                  <div className="space-y-7">
                    <Slider
                      label="Einkaufspreis (netto)"
                      value={ep}
                      min={100}
                      max={5000}
                      step={50}
                      display={fmt(ep)}
                      onChange={setEp}
                    />
                    <Slider
                      label="Marge"
                      value={marge}
                      min={10}
                      max={70}
                      step={1}
                      display={`${marge} %`}
                      onChange={setMarge}
                    />
                    <Slider
                      label="Partner-Provision"
                      value={prov}
                      min={0}
                      max={25}
                      step={1}
                      display={`${prov} %`}
                      onChange={setProv}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <p className="text-[12px] text-gray-400 leading-relaxed">
                    Wellbeing Spaces berechnet das für jedes Produkt automatisch.
                    Keine Formeln, kein Excel, keine Fehler.
                  </p>
                </div>
              </div>

              {/* Right: Results */}
              <div className="p-8 bg-[#445c49] flex flex-col">
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-6">Ergebnis</p>

                <div className="space-y-3 flex-1">
                  {/* VP netto */}
                  <div className="p-4 bg-white/[0.04] border border-white/[0.07] rounded-xl">
                    <p className="text-[11px] text-white/35 mb-1.5">Verkaufspreis netto</p>
                    <p className="font-syne font-bold text-[28px] text-white leading-none transition-all duration-300">
                      {fmt(vpNetto)}
                    </p>
                  </div>

                  {/* VP brutto – highlighted */}
                  <div className="p-4 bg-[#445c49]/15 border border-[#445c49]/25 rounded-xl">
                    <p className="text-[11px] text-wellbeing-green-light/70 mb-1.5">Verkaufspreis brutto (inkl. 19% MwSt.)</p>
                    <p className="font-syne font-bold text-[34px] text-[#A5B4FC] leading-none transition-all duration-300">
                      {fmt(vpBrutto)}
                    </p>
                  </div>

                  {/* Provision + Deckungsbeitrag */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white/[0.04] border border-white/[0.07] rounded-xl">
                      <p className="text-[10px] text-white/30 mb-1.5">Provision ({prov}%)</p>
                      <p className="font-syne font-bold text-[20px] text-amber-400 leading-none transition-all duration-300">
                        {fmt(provisionEuro)}
                      </p>
                    </div>
                    <div className="p-4 bg-white/[0.04] border border-white/[0.07] rounded-xl">
                      <p className="text-[10px] text-white/30 mb-1.5">Deckungsbeitrag</p>
                      <p className={`font-syne font-bold text-[20px] leading-none transition-all duration-300 ${gewinn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(gewinn)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/[0.06] pt-5">
                  <p className="text-[11px] text-white/20 leading-relaxed">
                    MwSt. 19% hardcoded. Alle Werte werden reaktiv berechnet
                    und als versteckte Felder in Formulare übergeben.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
