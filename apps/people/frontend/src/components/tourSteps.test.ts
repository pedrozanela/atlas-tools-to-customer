import { describe, expect, it } from 'vitest'
import {
  TOUR_CERTIFICATION_ID,
  buildTourSteps,
  fitTourCardWidth,
  routeMatchesTourStep,
} from './tourSteps'

describe('Certifica guided tour steps', () => {
  it('walks a participant through every learning surface in route order', () => {
    const steps = buildTourSteps(false)

    expect(steps.map(step => step.id)).toEqual([
      'program',
      'routes',
      'certification',
      'practice',
      'flashcards',
      'study',
      'plan',
      'history',
      'settings',
    ])
    expect(steps.map(step => step.route)).toContain(
      `/cert/${TOUR_CERTIFICATION_ID}?tab=flashcards`,
    )
    expect(new Set(steps.map(step => step.target)).size).toBe(steps.length)
  })

  it('adds the protected admin step only for administrators', () => {
    expect(buildTourSteps(false).some(step => step.id === 'admin')).toBe(false)
    expect(buildTourSteps(true).map(step => step.id)).toEqual([
      'program',
      'routes',
      'certification',
      'practice',
      'flashcards',
      'study',
      'plan',
      'history',
      'admin',
      'settings',
    ])
  })

  it('matches tab routes while tolerating unrelated hand-off parameters', () => {
    expect(routeMatchesTourStep(
      `/cert/${TOUR_CERTIFICATION_ID}?tab=practice`,
      `/cert/${TOUR_CERTIFICATION_ID}`,
      '?atlas_tour=people&tab=practice',
    )).toBe(true)
    expect(routeMatchesTourStep(
      `/cert/${TOUR_CERTIFICATION_ID}?tab=practice`,
      `/cert/${TOUR_CERTIFICATION_ID}`,
      '?tab=flashcards',
    )).toBe(false)
  })

  it('fits the tour card inside a 320px viewport', () => {
    expect(fitTourCardWidth(320)).toBe(296)
    expect(fitTourCardWidth(1440)).toBe(340)
  })
})
