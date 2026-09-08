import { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import {
  buildTourSteps,
  fitTourCardWidth,
  routeMatchesTourStep,
} from '@/components/tourSteps'
import './Tour.css'

const SEEN_KEY = 'certifica_tour_seen'
const ATLAS_GUIDE_QUERY = 'atlas_guide'
const ATLAS_GUIDE_PENDING = 'certifica_atlas_guide_pending'

/** Captura o hand-off do Guia Atlas sem remover outros parâmetros da URL. */
export function captureAtlasGuideIntent(): boolean {
  const url = new URL(window.location.href)
  if (url.searchParams.get(ATLAS_GUIDE_QUERY) !== '1') return false

  sessionStorage.setItem(ATLAS_GUIDE_PENDING, '1')
  url.searchParams.delete(ATLAS_GUIDE_QUERY)
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  )
  return true
}

const PAD = 8          // respiro do recorte em volta do alvo
const GAP = 14         // distância entre o alvo e o balão

/** Dispara a abertura do tour de qualquer lugar (ex.: menu mobile). */
export const OPEN_TOUR_EVENT = 'certifica:open-tour'
export const openTourEvent = () => window.dispatchEvent(new Event(OPEN_TOUR_EVENT))

export function useTour() {
  const [open, setOpen] = useState(false)
  const openTour = useCallback(() => setOpen(true), [])
  const closeTour = useCallback(() => {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }, [])
  useEffect(() => {
    const atlasRequested = captureAtlasGuideIntent()
      || sessionStorage.getItem(ATLAS_GUIDE_PENDING) === '1'
    if (atlasRequested) {
      sessionStorage.removeItem(ATLAS_GUIDE_PENDING)
      setOpen(true)
    } else if (!localStorage.getItem(SEEN_KEY)) {
      setOpen(true)
    }
    const handler = () => setOpen(true)
    window.addEventListener(OPEN_TOUR_EVENT, handler)
    return () => window.removeEventListener(OPEN_TOUR_EVENT, handler)
  }, [])
  return { open, openTour, closeTour }
}

interface Rect { top: number; left: number; width: number; height: number }

function findVisibleTarget(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(el => {
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return rect.width > 0 && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
  }) ?? null
}

export default function Tour({
  open,
  onClose,
  isAdmin = false,
}: {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
}) {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const steps = useMemo(() => buildTourSteps(isAdmin), [isAdmin])
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => { if (open) setI(0) }, [open])

  const step = steps[i] ?? steps[0]

  // Cada passo é uma tela real. A navegação com replace evita poluir o
  // histórico do navegador com todos os passos do onboarding.
  useEffect(() => {
    if (!open || !step) return
    if (!routeMatchesTourStep(step.route, location.pathname, location.search)) {
      navigate(step.route, { replace: true })
    }
  }, [location.pathname, location.search, navigate, open, step])

  // Localiza o primeiro alvo visível. Desktop e mobile compartilham os mesmos
  // data-tour; isso permite destacar a nav superior ou a bottom-nav conforme o viewport.
  useLayoutEffect(() => {
    if (!open || !step) return
    const measure = () => {
      const el = findVisibleTarget(step.target)
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        const r = el.getBoundingClientRect()
        const next = { top: r.top, left: r.left, width: r.width, height: r.height }
        setRect(prev => prev
          && prev.top === next.top
          && prev.left === next.left
          && prev.width === next.width
          && prev.height === next.height
          ? prev
          : next)
      } else {
        setRect(prev => prev === null ? prev : null)
      }
    }
    measure()
    const observer = new MutationObserver(measure)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [location.pathname, location.search, open, step])

  // Esc fecha; setas navegam.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setI(v => Math.min(v + 1, steps.length - 1))
      else if (e.key === 'ArrowLeft') setI(v => Math.max(v - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, steps.length])

  if (!open || !step) return null
  const Icon = step.icon
  const isLast = i === steps.length - 1

  // Recorte (spotlight) em volta do alvo, se houver.
  const hole = rect ? {
    top: rect.top - PAD, left: rect.left - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  } : null

  // Posição do balão: abaixo do alvo (ou acima se não couber); centralizado se sem alvo.
  let cardStyle: React.CSSProperties
  let placement: 'center' | 'below' | 'above' = 'center'
  const cardWidth = fitTourCardWidth(window.innerWidth)
  if (hole) {
    const vw = window.innerWidth
    const belowTop = hole.top + hole.height + GAP
    const spaceBelow = window.innerHeight - belowTop
    placement = spaceBelow > 220 ? 'below' : 'above'
    let left = hole.left + hole.width / 2 - cardWidth / 2
    left = Math.max(12, Math.min(left, vw - cardWidth - 12))
    cardStyle = placement === 'below'
      ? { top: belowTop, left, width: cardWidth }
      : { bottom: window.innerHeight - hole.top + GAP, left, width: cardWidth }
  } else {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: cardWidth }
  }

  // Seta do balão apontando para o alvo.
  const arrowLeft = hole
    ? Math.max(16, Math.min(hole.left + hole.width / 2 - (cardStyle.left as number), cardWidth - 16))
    : 0

  return (
    <div className="tour-root">
      {/* Camada escura com recorte; sem alvo, escurece tudo. */}
      {hole ? (
        <div className="tour-mask" style={{
          top: hole.top, left: hole.left, width: hole.width, height: hole.height,
        }} onClick={onClose} />
      ) : (
        <div className="tour-dim" onClick={onClose} />
      )}

      <div className={`tour-card tour-${placement}`} style={cardStyle}
           role="dialog" aria-modal="true" aria-label={t('tour.title')}>
        {placement !== 'center' && (
          <span className={`tour-arrow tour-arrow-${placement}`} style={{ left: arrowLeft }} />
        )}
        <button className="tour-close" aria-label={t('tour.skip')} onClick={onClose}><X size={17} /></button>

        <div className="tour-head">
          <span className="tour-icon"><Icon size={20} /></span>
          <h2 className="tour-title">{t(step.title)}</h2>
        </div>
        <p className="tour-body">{t(step.body)}</p>

        <div className="tour-dots" role="tablist">
          {steps.map((tourStep, k) => (
            <button key={tourStep.id} className={k === i ? 'tour-dot active' : 'tour-dot'}
                    aria-label={t('tour.step', { i: k + 1, n: steps.length })}
                    aria-selected={k === i} onClick={() => setI(k)} />
          ))}
        </div>

        <div className="tour-actions">
          <span className="tour-step">{t('tour.step', { i: i + 1, n: steps.length })}</span>
          <div className="tour-btns">
            {i > 0 && <button className="btn tour-btn-sm" onClick={() => setI(i - 1)}>{t('tour.back')}</button>}
            {isLast
              ? <button className="btn btn-primary tour-btn-sm" onClick={onClose}>{t('tour.done')}</button>
              : <button className="btn btn-primary tour-btn-sm" onClick={() => setI(i + 1)}>{t('tour.next')}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
