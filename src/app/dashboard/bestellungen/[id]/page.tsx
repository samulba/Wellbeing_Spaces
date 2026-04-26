import { notFound } from 'next/navigation'
import { getBestellung } from '@/app/actions/lieferanten-bestellungen'
import BestellungDetailClient from './BestellungDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { id: string }
}

export default async function BestellungDetailPage({ params }: Props) {
  const bestellung = await getBestellung(params.id)
  if (!bestellung) notFound()
  return <BestellungDetailClient bestellung={bestellung} />
}
