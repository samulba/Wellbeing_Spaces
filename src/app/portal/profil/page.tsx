import { redirect } from 'next/navigation'

// Alte Route — wird dauerhaft auf /portal/einstellungen umgeleitet, damit
// bestehende Links und Bookmarks weiter funktionieren.
export default function PortalProfilPage() {
  redirect('/portal/einstellungen')
}
