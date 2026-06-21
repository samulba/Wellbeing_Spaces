import BundleEditor from '@/components/BundleEditor'
import { bibliothekProdukteAbrufen } from '@/app/actions/produkte'

export default async function NeuesBundlePage() {
  const bibliothek = await bibliothekProdukteAbrufen()
  return <BundleEditor mode="neu" bibliothek={bibliothek} />
}
