import { notFound } from 'next/navigation'
import BundleEditor from '@/components/BundleEditor'
import { bibliothekProdukteAbrufen } from '@/app/actions/produkte'
import { getBundleMitKomponenten } from '@/app/actions/bundles'

export default async function BundleBearbeitenPage({ params }: { params: { id: string } }) {
  const [bundle, bibliothek] = await Promise.all([
    getBundleMitKomponenten(params.id),
    bibliothekProdukteAbrufen(),
  ])
  if (!bundle) notFound()
  return <BundleEditor mode="bearbeiten" bundle={bundle} bibliothek={bibliothek} />
}
