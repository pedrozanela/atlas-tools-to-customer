import { ArrowLeft } from 'lucide-react'

export default function AtlasBackLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="/"
      className={`atlas-back-link${compact ? ' atlas-back-link-compact' : ''}`}
      data-atlas-tour="people-back-atlas"
      aria-label="Voltar ao Atlas"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      <span>Atlas</span>
    </a>
  )
}
