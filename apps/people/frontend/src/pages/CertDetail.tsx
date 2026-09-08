import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, FlaskConical, Layers, ExternalLink, GraduationCap, Target } from 'lucide-react'
import { getCertification } from '@/services/api'
import { useT } from '@/i18n'
import PracticeTest from '@/pages/PracticeTest'
import Flashcards from '@/pages/Flashcards'
import StudyAI from '@/pages/StudyAI'
import StudyPlan from '@/pages/StudyPlan'
import { parseCertTab, type CertTab } from '@/pages/certTabs'
import './CertDetail.css'

export default function CertDetail() {
  const { id = '' } = useParams()
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseCertTab(searchParams.get('tab'))
  const { data: cert, isLoading } = useQuery({
    queryKey: ['cert', id],
    queryFn: () => getCertification(id),
  })

  if (isLoading) return <div className="spinner" />
  if (!cert) return <p className="muted">{t('cert.notFound')}</p>

  const selectTab = (nextTab: CertTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <div className="cd-header card">
        <div className="cd-header-main">
          <span className={`badge badge-${cert.level}`}>{cert.level}</span>
          <h1>{cert.name}</h1>
          <p className="muted">{cert.description}</p>
          <div className="cd-links">
            {cert.exam_guide_url && (
              <a href={cert.exam_guide_url} target="_blank" rel="noreferrer" className="btn">
                <BookOpen size={16} /> {t('cert.examGuide')}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="cd-tabs" role="tablist" aria-label={cert.name}>
        <button id="cert-tab-overview" role="tab" aria-selected={tab === 'overview'}
          data-tour="cert-overview"
          aria-controls="cert-active-panel" className={tab === 'overview' ? 'active' : ''}
          onClick={() => selectTab('overview')}>
          <Layers size={16} /> {t('cert.overview')}
        </button>
        <button id="cert-tab-practice" role="tab" aria-selected={tab === 'practice'}
          data-tour="cert-practice"
          aria-controls="cert-active-panel" className={tab === 'practice' ? 'active' : ''}
          onClick={() => selectTab('practice')}>
          <FlaskConical size={16} /> {t('cert.practice')}
        </button>
        <button id="cert-tab-flashcards" role="tab" aria-selected={tab === 'flashcards'}
          data-tour="cert-flashcards"
          aria-controls="cert-active-panel" className={tab === 'flashcards' ? 'active' : ''}
          onClick={() => selectTab('flashcards')}>
          <BookOpen size={16} /> {t('cert.flashcards')}
        </button>
        <button id="cert-tab-study" role="tab" aria-selected={tab === 'study'}
          data-tour="cert-study"
          aria-controls="cert-active-panel" className={tab === 'study' ? 'active' : ''}
          onClick={() => selectTab('study')}>
          <GraduationCap size={16} /> {t('cert.studyAI')}
        </button>
        <button id="cert-tab-plan" role="tab" aria-selected={tab === 'plan'}
          data-tour="cert-plan"
          aria-controls="cert-active-panel" className={tab === 'plan' ? 'active' : ''}
          onClick={() => selectTab('plan')}>
          <Target size={16} /> {t('cert.studyPlan')}
        </button>
      </div>

      <div id="cert-active-panel" className="cd-panel" role="tabpanel"
        aria-labelledby={`cert-tab-${tab}`}>
        {tab === 'overview' && (
          <div className="cd-overview">
            <div className="card cd-topics">
              <h3>{t('cert.topicsCovered')}</h3>
              <ul>{cert.topics.map(tp => <li key={tp}>{tp}</li>)}</ul>
            </div>
            <div className="cd-overview-cards">
              <div className="card cd-action" onClick={() => selectTab('practice')}>
                <FlaskConical size={26} color="var(--brand-primary)" />
                <h4>{t('cert.practice')}</h4>
                <p className="muted">{t('cert.practiceDesc')}</p>
              </div>
              <div className="card cd-action" onClick={() => selectTab('flashcards')}>
                <BookOpen size={26} color="var(--brand-primary)" />
                <h4>{t('cert.flashcards')}</h4>
                <p className="muted">{t('cert.flashcardsDesc')}</p>
              </div>
            </div>
            {cert.resources?.length > 0 && (
              <div className="card cd-resources">
                <h3>{t('cert.studyResources')}</h3>
                <ul>
                  {cert.resources.map(r => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} /> {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {tab === 'practice' && <PracticeTest cert={cert} />}
        {tab === 'flashcards' && <Flashcards cert={cert} />}
        {tab === 'study' && <StudyAI cert={cert} />}
        {tab === 'plan' && <StudyPlan cert={cert} />}
      </div>
    </div>
  )
}
