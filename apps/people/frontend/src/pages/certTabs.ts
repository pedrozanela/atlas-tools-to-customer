export const CERT_TABS = ['overview', 'practice', 'flashcards', 'study', 'plan'] as const

export type CertTab = (typeof CERT_TABS)[number]

export function parseCertTab(value: string | null): CertTab {
  return CERT_TABS.includes(value as CertTab) ? value as CertTab : 'overview'
}
