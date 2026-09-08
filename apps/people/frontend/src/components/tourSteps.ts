import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Compass,
  GraduationCap,
  History,
  LayoutGrid,
  Map,
  Settings2,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react'

export const TOUR_CERTIFICATION_ID = 'data_engineer_associate'

export interface CertificaTourStep {
  id: string
  icon: LucideIcon
  title: string
  body: string
  route: string
  target: string
}

const PARTICIPANT_STEPS: CertificaTourStep[] = [
  {
    id: 'program',
    icon: Compass,
    title: 'tour.programTitle',
    body: 'tour.programBody',
    route: '/',
    target: '[data-tour="program"]',
  },
  {
    id: 'routes',
    icon: Map,
    title: 'tour.routesTitle',
    body: 'tour.routesBody',
    route: '/rutas',
    target: '[data-tour="routes"]',
  },
  {
    id: 'certification',
    icon: GraduationCap,
    title: 'tour.certificationTitle',
    body: 'tour.certificationBody',
    route: `/cert/${TOUR_CERTIFICATION_ID}?tab=overview`,
    target: '[data-tour="cert-overview"]',
  },
  {
    id: 'practice',
    icon: LayoutGrid,
    title: 'tour.practiceTitle',
    body: 'tour.practiceBody',
    route: `/cert/${TOUR_CERTIFICATION_ID}?tab=practice`,
    target: '[data-tour="cert-practice"]',
  },
  {
    id: 'flashcards',
    icon: BookOpen,
    title: 'tour.flashcardsTitle',
    body: 'tour.flashcardsBody',
    route: `/cert/${TOUR_CERTIFICATION_ID}?tab=flashcards`,
    target: '[data-tour="cert-flashcards"]',
  },
  {
    id: 'study',
    icon: Sparkles,
    title: 'tour.studyTitle',
    body: 'tour.studyBody',
    route: `/cert/${TOUR_CERTIFICATION_ID}?tab=study`,
    target: '[data-tour="cert-study"]',
  },
  {
    id: 'plan',
    icon: Target,
    title: 'tour.planTitle',
    body: 'tour.planBody',
    route: `/cert/${TOUR_CERTIFICATION_ID}?tab=plan`,
    target: '[data-tour="cert-plan"]',
  },
  {
    id: 'history',
    icon: History,
    title: 'tour.historyTitle',
    body: 'tour.historyBody',
    route: '/historico',
    target: '[data-tour="history"]',
  },
]

const ADMIN_STEP: CertificaTourStep = {
  id: 'admin',
  icon: Shield,
  title: 'tour.adminTitle',
  body: 'tour.adminBody',
  route: '/admin',
  target: '[data-tour="admin"]',
}

const SETTINGS_STEP: CertificaTourStep = {
  id: 'settings',
  icon: Settings2,
  title: 'tour.langTitle',
  body: 'tour.langBody',
  route: '/',
  target: '[data-tour="settings"]',
}

export function buildTourSteps(isAdmin: boolean): CertificaTourStep[] {
  return [...PARTICIPANT_STEPS, ...(isAdmin ? [ADMIN_STEP] : []), SETTINGS_STEP]
}

export function routeMatchesTourStep(route: string, pathname: string, search: string): boolean {
  const expected = new URL(route, 'https://certifica.local')
  if (pathname !== expected.pathname) return false

  const actual = new URLSearchParams(search)
  return Array.from(expected.searchParams).every(([key, value]) => actual.get(key) === value)
}

export function fitTourCardWidth(viewportWidth: number): number {
  return Math.max(0, Math.min(340, viewportWidth - 24))
}
