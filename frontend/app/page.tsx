'use client'

import { useState } from 'react'
import {
  ArrowRight, BarChart3, Bot, Check, ChevronRight, CircleHelp, Coins,
  Compass, FileText, Home, Lightbulb, Menu, Search, ShieldCheck, Sparkles,
  Target, Users, X, Zap, Loader2
} from 'lucide-react'

type View = 'dashboard' | 'assessment' | 'report' | 'villages' | 'advisor'

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'assessment', label: 'Assessment', icon: FileText },
  { id: 'report', label: 'Feasibility Report', icon: BarChart3 },
  { id: 'villages', label: 'Similar Villages', icon: Compass },
  { id: 'advisor', label: 'AI Advisor', icon: Bot },
]

const featureCards = [
  {
    icon: Target,
    title: 'Local Market Intelligence',
    body: 'Understand demand, reach, competition and the opportunity around you.',
  },
  {
    icon: Coins,
    title: 'Financial Feasibility',
    body: 'See investment, EMI and repayment capacity in plain language.',
  },
  {
    icon: Bot,
    title: 'AI Business Advisor',
    body: 'Ask questions and get practical guidance tailored to your context.',
  },
]

const similarVillagesData = [
  {
    village: 'Kheda',
    location: 'Nashik, Maharashtra',
    score: 94,
    population: '4,820',
    households: '1,080',
    signal: 'Strong dairy demand',
    accent: 'high' as const,
  },
  {
    village: 'Borgaon',
    location: 'Indore, Madhya Pradesh',
    score: 89,
    population: '3,640',
    households: '812',
    signal: 'High milk collection',
    accent: 'mid' as const,
  },
  {
    village: 'Rampur',
    location: 'Sangli, Maharashtra',
    score: 84,
    population: '5,210',
    households: '1,140',
    signal: 'Growing households',
    accent: 'low' as const,
  },
]

export default function Page() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [formData, setFormData] = useState({
    entrepreneur_name: 'Ananya Kulkarni',
    village_id: '556078',
    experience_level: 'beginner',
    available_capital: 75000,
    business_category: 'dairy',
    language: 'English',
  })

  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([])
  const [uiMessages, setUiMessages] = useState([
    {
      from: 'ai',
      text: "Hello Ananya. I'm here to help you turn your local opportunity into a stronger business plan. What would you like to explore?",
    },
  ])

  const navigate = (view: View) => {
    setActiveView(view)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generateReport = async () => {
    setIsLoading(true)
    setError(null)
    navigate('report')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'my-secret-02101431908',
        },
        body: JSON.stringify({
          ...formData,
          business_category: formData.business_category.toLowerCase(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate report')
      if (data.report_error) throw new Error(data.report_error)

      setReportData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const sendQuestion = async (text = question) => {
    if (!text.trim() || !reportData?.report) return
    setUiMessages((items) => [...items, { from: 'user', text }])
    setQuestion('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'my-secret-02101431908',
        },
        body: JSON.stringify({
          report: reportData.report,
          conversation_history: chatHistory,
          new_question: text,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chat failed')

      setUiMessages((items) => [...items, { from: 'ai', text: data.answer }])
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.answer },
      ])
    } catch (err: any) {
      setUiMessages((items) => [...items, { from: 'ai', text: `Error: ${err.message}` }])
    }
  }

  return (
    <div className="app-shell" suppressHydrationWarning>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <span>R</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong>RuralBiz</strong>
            <small>Business Advisory</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="workspace">
          <span className="avatar">{formData.entrepreneur_name.slice(0, 2).toUpperCase()}</span>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <b style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {formData.entrepreneur_name}
            </b>
            <small style={{ color: 'var(--text-muted)' }}>Maharashtra, India</small>
          </div>
          <ChevronRight size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />
        </div>

        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeView === id ? 'active' : ''}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'report' && reportData && <em>New</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card" onClick={() => navigate('advisor')}>
            <CircleHelp size={18} />
            <div>
              <b>Need a hand?</b>
              <small>Talk to your AI advisor</small>
            </div>
            <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
          </div>
          <div className="sidebar-meta">
            <span className="status-dot" /> Demo workspace <span style={{ marginLeft: 'auto' }}>v1.0</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="crumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{navItems.find((n) => n.id === activeView)?.label}</b>
          </div>
          <div className="top-actions">
            <button className="icon-button">
              <Search size={18} />
            </button>
            <div className="notification">
              <span>3</span>
            </div>
            <div className="top-avatar">{formData.entrepreneur_name.slice(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <div className="content">
          {activeView === 'dashboard' && <Dashboard navigate={navigate} />}
          {activeView === 'assessment' && (
            <Assessment formData={formData} setFormData={setFormData} onComplete={generateReport} />
          )}
          {activeView === 'report' && (
            <Report
              navigate={navigate}
              reportData={reportData}
              isLoading={isLoading}
              error={error}
              formData={formData}
            />
          )}
          {activeView === 'villages' && <Villages />}
          {activeView === 'advisor' && (
            <Advisor
              messages={uiMessages}
              question={question}
              setQuestion={setQuestion}
              sendQuestion={sendQuestion}
              hasReport={!!reportData}
            />
          )}
        </div>
      </main>
    </div>
  )
}

/* ==================== DASHBOARD ==================== */
function Dashboard({ navigate }: { navigate: (view: View) => void }) {
  return (
    <div className="dashboard-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="pulse" /> BUILT FOR RURAL ENTREPRENEURS
          </div>
          <h1>
            Turn local opportunities
            <br />
            <i>into sustainable businesses.</i>
          </h1>
          <p>
            Make confident business decisions with local market intelligence, clear financial
            insights and an AI advisor that understands your context.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('assessment')}>
              Start Business Assessment <ArrowRight size={17} />
            </button>
            <span
              className="link"
              onClick={() => navigate('report')}
              style={{ cursor: 'pointer', color: 'var(--sage)', fontWeight: 500, fontSize: 14 }}
            >
              View sample report →
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-bg">
            <div className="location-card">
              <div className="icon-wrap">
                <Target size={17} />
              </div>
              <div>
                <small>ASSESSING LOCATION</small>
                <b>Disali Village</b>
                <span>Pune, Maharashtra</span>
              </div>
              <Check size={17} style={{ marginLeft: 'auto', color: 'var(--sage)' }} />
            </div>

            <div className="floating-chip potential">
              <span style={{ opacity: 0.7, marginRight: 6 }}>↗</span> High potential
            </div>

            <div className="floating-chip health">
              <small style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>
                FINANCIAL HEALTH
              </small>
              <b>Healthy</b>
            </div>
          </div>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">ONE CLEAR VIEW</span>
          <h2>From idea to informed action.</h2>
        </div>
      </div>

      <section className="feature-grid">
        {featureCards.map(({ icon: Icon, title, body }) => (
          <button className="feature-card" key={title} onClick={() => navigate('assessment')}>
            <div className="icon-box">
              <Icon size={21} />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
            <ArrowRight size={18} className="arrow" />
          </button>
        ))}
      </section>

      <div className="journey-strip">
        <span className="label">✦ Your journey starts here</span>
        <div className="journey-steps">
          <div className="journey-step">
            <span className="num">1</span> Assess your idea
          </div>
          <ChevronRight size={14} style={{ opacity: 0.5 }} />
          <div className="journey-step">
            <span className="num">2</span> Understand the numbers
          </div>
          <ChevronRight size={14} style={{ opacity: 0.5 }} />
          <div className="journey-step">
            <span className="num">3</span> Take the next step
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==================== ASSESSMENT ==================== */
function Assessment({ formData, setFormData, onComplete }: any) {
  return (
    <div className="inner-page assessment-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">STEP 01 / BUSINESS PROFILE</span>
          <h1>Tell us about your idea.</h1>
          <p>A few details help us create a feasibility report that feels relevant to your village.</p>
        </div>
        <div className="step-indicator">
          <b>1</b>
          <span>of 3</span>
        </div>
      </div>

      <div className="form-card">
        <div className="form-intro">
          <div className="icon-box">
            <Lightbulb size={19} />
          </div>
          <div>
            <h3>Business basics</h3>
            <p>Start with the essentials. You can refine this later.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Entrepreneur name
            <input
              value={formData.entrepreneur_name}
              onChange={(e) => setFormData({ ...formData, entrepreneur_name: e.target.value })}
            />
          </label>

          <label>
            Village
            <select
              value={formData.village_id}
              onChange={(e) => setFormData({ ...formData, village_id: e.target.value })}
            >
              <option value="556078">Disali, Pune (Real Census Data)</option>
              <option value="555465">Gangapur Kh., Pune</option>
              <option value="556479">Pandeshwar, Pune</option>
              <option value="555832">Mahalunge, Pune</option>
              <option value="556952">Pandare, Pune</option>
              <option value="556975">Baramati Rural, Pune</option>
            </select>
          </label>

          <label>
            Experience level
            <select
              value={formData.experience_level}
              onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
            >
              <option value="beginner">New to business</option>
              <option value="some experience">Some experience</option>
              <option value="experienced">Experienced entrepreneur</option>
            </select>
          </label>

          <label>
            Available capital
            <div className="capital-input">
              <span>₹</span>
              <input
                type="number"
                value={formData.available_capital}
                onChange={(e) =>
                  setFormData({ ...formData, available_capital: Number(e.target.value) })
                }
              />
            </div>
          </label>

          <label>
            Business category
            <select
              value={formData.business_category}
              onChange={(e) => setFormData({ ...formData, business_category: e.target.value })}
            >
              <option value="dairy">Dairy</option>
              <option value="tailoring">Tailoring</option>
              <option value="agro-processing">Agro-processing</option>
              <option value="kirana">Kirana / Retail</option>
              <option value="poultry">Poultry</option>
              <option value="handloom">Handloom</option>
            </select>
          </label>

          <label>
            Preferred language
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
          </label>
        </div>

        <div className="form-footer">
          <span className="privacy-note">
            <ShieldCheck size={16} /> Your information stays private
          </span>
          <button className="primary-button" onClick={onComplete}>
            Generate Feasibility Report <ArrowRight size={17} />
          </button>
        </div>
      </div>

      <div className="good-to-know">
        <Sparkles size={18} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <b>Good to know</b>
          A great assessment is built from honest inputs. Estimates are okay — the report gets
          smarter as you learn.
        </div>
      </div>
    </div>
  )
}

/* ==================== REPORT ==================== */
function Report({ navigate, reportData, isLoading, error, formData }: any) {
  if (isLoading) {
    return (
      <div className="loading-state">
        <Loader2 className="spinner" size={40} />
        <h3>Analyzing Census Data & Generating AI Report…</h3>
        <p style={{ color: 'var(--text-muted)' }}>Please wait up to 30 seconds.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <h3>Error generating report</h3>
        <p>{error}</p>
        <button onClick={() => navigate('assessment')} className="primary-button" style={{ marginTop: 16 }}>
          Try Again
        </button>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="empty-state">
        <div className="form-card">
          <h3>No Feasibility Report Generated Yet</h3>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0 24px' }}>
            Configure your inputs in the assessment page to generate a live report.
          </p>
          <button onClick={() => navigate('assessment')} className="primary-button">
            Start Assessment <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  const r = reportData.report || {}
  const fin = reportData.financial_roadmap || {}
  const dscr = r.loan_repayment_capacity || {}
  const swot = r.swot || {}
  const evidence = reportData.evidence_packet || {}
  const risks = r.threats?.risk_register || []
  const competitors = r.competitor_mapping?.competitors || []

  const score = dscr.dscr ? Math.min(Math.round(Number(dscr.dscr) * 50), 98) : 86
  const status = (dscr.status || 'weak').toLowerCase()
  const statusColor = status === 'healthy' ? '#4C7A5C' : status === 'tight' ? '#B9860B' : '#9C4A3C'
  const statusBg = status === 'healthy' ? '#E9F1EA' : status === 'tight' ? '#FBF1DA' : '#F7E9E6'

  const inr = (n: any) => (n || n === 0 ? `₹${Number(n).toLocaleString('en-IN')}` : '—')

  return (
    <div className="inner-page report-page">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#4C7A5C', marginBottom: 8 }}>
            FEASIBILITY REPORT • READY TO REVIEW
          </div>
          <h1 style={{ fontSize: 32, margin: '0 0 6px', lineHeight: 1.2 }}>
            Your {formData.business_category} business,<br />at a glance.
          </h1>
          <p style={{ color: '#6B6A60', margin: 0, fontSize: 14 }}>
            Prepared for {formData.entrepreneur_name} · Maharashtra ·{' '}
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="outline-button">
          <FileText size={16} /> Export report
        </button>
      </div>

      {/* EXECUTIVE + SCORE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{
          background: 'linear-gradient(145deg, #3B5E47 0%, #2F4A38 100%)',
          borderRadius: 12, padding: '28px 32px', color: 'white',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 210
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#A8D5B5', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, background: '#A8D5B5', borderRadius: '50%' }} />
              EXECUTIVE SUMMARY
            </div>
            <h2 style={{ color: 'white', fontSize: 22, margin: '0 0 12px', lineHeight: 1.3 }}>
              {fin.eligible ? `Qualifies for the ${fin.scheme_name}` : 'A promising opportunity with a strong local fit.'}
            </h2>
            <p style={{ color: '#D1E5D6', fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              {r.market_reach?.catchment_description?.replace(/\s*\[[^\]]+\]/g, '') ||
                `Village of ${evidence.inputs_used?.population || 278} people with ${evidence.inputs_used?.households || 54} households.`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.18)' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{dscr.dscr ? `${dscr.dscr}x` : '—'}</div>
              <div style={{ fontSize: 12, color: '#B8D4BE' }}>DSCR Ratio</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'capitalize' }}>{status}</div>
              <div style={{ fontSize: 12, color: '#B8D4BE' }}>Status</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{inr(dscr.estimated_monthly_cash_surplus)}</div>
              <div style={{ fontSize: 12, color: '#B8D4BE' }}>Monthly Surplus</div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white', border: '1px solid #DFDACB', borderRadius: 12,
          padding: '28px 24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }}>
          <div style={{
            width: 100, height: 100, border: '7px solid #E5E0D5',
            borderTopColor: statusColor, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14
          }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 12, color: '#6B6A60' }}>/100</div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#6B6A60' }}>FEASIBILITY SCORE</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4, color: statusColor, textTransform: 'capitalize' }}>{status}</div>
          <div style={{ fontSize: 12, color: '#6B6A60', marginTop: 6 }}>Based on DSCR & demand model</div>
        </div>
      </div>

      {/* FINANCIAL ROADMAP */}
      <div style={{ background: 'white', border: '1px solid #DFDACB', borderRadius: 12, padding: '24px 26px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#4C7A5C', marginBottom: 4 }}>FINANCIAL ROADMAP</div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Investment & repayment</h3>
          </div>
          <span style={{ background: statusBg, color: statusColor, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
            {status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <div style={{ background: '#F6F3EC', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#6B6A60' }}>Project Cost</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{inr(fin.project_cost)}</div>
            <div style={{ fontSize: 11, color: '#6B6A60' }}>10% margin</div>
          </div>
          <div style={{ background: '#F6F3EC', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#6B6A60' }}>Loan Amount</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{inr(fin.loan_amount)}</div>
            <div style={{ fontSize: 11, color: '#6B6A60' }}>{fin.quarterly_interest_rate_pct || '—'}% / qtr</div>
          </div>
          <div style={{ background: '#F6F3EC', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#6B6A60' }}>Monthly EMI</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {fin.quarterly_installment ? inr(Math.round(fin.quarterly_installment / 3)) : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#6B6A60' }}>Debt service</div>
          </div>
          <div style={{ background: '#F6F3EC', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#6B6A60' }}>DSCR</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: statusColor }}>{dscr.dscr ? `${dscr.dscr}x` : '—'}</div>
            <div style={{ fontSize: 11, color: '#6B6A60' }}>Coverage</div>
          </div>
        </div>

        {/* DSCR Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Repayment Capacity</span>
            <span style={{ fontWeight: 700, color: statusColor }}>{dscr.dscr ? `${dscr.dscr}x` : '—'}</span>
          </div>
          <div style={{ height: 10, background: '#E5E0D5', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(((Number(dscr.dscr) || 0) / 2) * 100, 100)}%`,
              background: statusColor,
              borderRadius: 99,
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>
      </div>

      {/* DEMAND NUMBERS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#E9F1EA', borderRadius: 12, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#6B6A60', marginBottom: 4 }}>ADDRESSABLE HH</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#4C7A5C' }}>
            {evidence.addressable_households?.value ? Math.round(evidence.addressable_households.value) : '—'}
          </div>
        </div>
        <div style={{ background: '#FBF1DA', borderRadius: 12, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#6B6A60', marginBottom: 4 }}>COMPETITORS</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#B9860B' }}>
            {evidence.supply_gap?.components?.existing_supply_count ?? 0}
          </div>
        </div>
        <div style={{ background: '#EFEAF6', borderRadius: 12, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#6B6A60', marginBottom: 4 }}>SUPPLY GAP</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#5A4A8A' }}>
            {evidence.supply_gap?.value ? Math.round(evidence.supply_gap.value) : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#6B6A60' }}>HH / enterprise</div>
        </div>
      </div>

      {/* FULL 4-BOX SWOT */}
      <div style={{ background: 'white', border: '1px solid #DFDACB', borderRadius: 12, padding: '24px 26px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#4C7A5C', marginBottom: 4 }}>STRATEGIC VIEW</div>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>SWOT Analysis</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: '#E9F1EA', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#4C7A5C', marginBottom: 8 }}>Strengths</div>
            {(swot.strengths || ['Available capital']).map((s: string, i: number) => (
              <p key={i} style={{ margin: '5px 0', fontSize: 13.5 }}>• {s.replace(/\s*\[[^\]]+\]/g, '')}</p>
            ))}
          </div>
          <div style={{ background: '#F7E9E6', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#9C4A3C', marginBottom: 8 }}>Weaknesses</div>
            {(swot.weaknesses || ['Limited track record']).map((s: string, i: number) => (
              <p key={i} style={{ margin: '5px 0', fontSize: 13.5 }}>• {s.replace(/\s*\[[^\]]+\]/g, '')}</p>
            ))}
          </div>
          <div style={{ background: '#FBF1DA', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#B9860B', marginBottom: 8 }}>Opportunities</div>
            {(swot.opportunities || ['Market gap']).map((s: string, i: number) => (
              <p key={i} style={{ margin: '5px 0', fontSize: 13.5 }}>• {s.replace(/\s*\[[^\]]+\]/g, '')}</p>
            ))}
          </div>
          <div style={{ background: '#EFEAF6', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#5A4A8A', marginBottom: 8 }}>Threats</div>
            {(swot.threats || ['Competition risk']).map((s: string, i: number) => (
              <p key={i} style={{ margin: '5px 0', fontSize: 13.5 }}>• {s.replace(/\s*\[[^\]]+\]/g, '')}</p>
            ))}
          </div>
        </div>
      </div>

      {/* RISK + COMPETITORS */}
      <div style={{ display: 'grid', gridTemplateColumns: risks.length > 0 ? '1.2fr 0.8fr' : '1fr', gap: 20, marginBottom: 20 }}>
        {risks.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #DFDACB', borderRadius: 12, padding: '24px 26px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#4C7A5C', marginBottom: 4 }}>RISK REGISTER</div>
            <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>What to watch</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {risks.slice(0, 4).map((row: any, i: number) => (
                <div key={i} style={{ background: '#F7F6F2', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                    {row.risk?.replace(/\s*\[[^\]]+\]/g, '')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <span style={{ background: '#FBF1DA', color: '#B9860B', padding: '2px 8px', borderRadius: 99 }}>{row.likelihood}</span>
                    <span style={{ background: '#F7E9E6', color: '#9C4A3C', padding: '2px 8px', borderRadius: 99 }}>{row.impact} impact</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: 'white', border: '1px solid #DFDACB', borderRadius: 12, padding: '24px 26px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#4C7A5C', marginBottom: 4 }}>COMPETITORS</div>
          <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>Existing players</h3>
          {competitors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {competitors.map((c: any, i: number) => (
                <div key={i} style={{ background: '#F7F6F2', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name_or_type}</div>
                  <div style={{ fontSize: 12.5, color: '#6B6A60', marginTop: 2 }}>
                    {c.notes?.replace(/\s*\[[^\]]+\]/g, '') || 'Local enterprise'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6B6A60', fontSize: 14 }}>No direct competitors recorded in this village.</p>
          )}
        </div>
      </div>

      {/* NEXT STEP */}
      <div style={{
        background: 'linear-gradient(135deg, #1B3A4B 0%, #2C4A6E 100%)',
        borderRadius: 12, padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#C77D26', marginBottom: 6 }}>
            RECOMMENDED NEXT STEP
          </div>
          <h3 style={{ color: 'white', margin: '0 0 6px', fontSize: 18 }}>Validate demand before you invest.</h3>
          <p style={{ margin: 0, color: '#CBD5E1', fontSize: 14 }}>
            Speak to 20 households this week. If 12+ commit to delivery, your plan is ready.
          </p>
        </div>
        <button
          onClick={() => navigate('advisor')}
          style={{
            background: '#C77D26', color: 'white', border: 'none',
            padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap'
          }}
        >
          Ask AI Advisor <Bot size={17} />
        </button>
      </div>
    </div>
  )
}

function Metric({ label, value, note, positive }: any) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b className={positive ? 'positive' : ''}>{value}</b>
      <small>{note}</small>
    </div>
  )
}

/* ==================== VILLAGES ==================== */
function Villages() {
  return (
    <div className="inner-page villages-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LOCAL BENCHMARKS</span>
          <h1>Learn from places like yours.</h1>
          <p>
            Compare Disali with villages that share similar people, markets and business conditions.
          </p>
        </div>
      </div>

      <div className="your-village-card">
        <div>
          <h3>Disali Village</h3>
          <div className="meta">Pune, Maharashtra · We found similar business conditions nearby.</div>
        </div>
        <div className="stats">
          <div className="stat">
            <b>278</b>
            <span>Population</span>
          </div>
          <div className="stat">
            <b>54</b>
            <span>Households</span>
          </div>
          <div className="stat">
            <b>—</b>
            <span>Market fit</span>
          </div>
        </div>
      </div>

      <div className="village-grid">
        {similarVillagesData.map((v) => (
          <div className="village-card" key={v.village}>
            <span className={`match-badge ${v.accent}`}>{v.score}% match</span>
            <h3>{v.village}</h3>
            <div className="loc">{v.location}</div>
            <div className="nums">
              <b>{v.population}</b> population · <b>{v.households}</b> households
            </div>
            <span className="signal">{v.signal}</span>
            <div>
              <a href="#">
                View village profile <ArrowRight size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ==================== ADVISOR ==================== */
function Advisor({ messages, question, setQuestion, sendQuestion, hasReport }: any) {
  if (!hasReport) {
    return (
      <div className="empty-state">
        <div className="form-card">
          <h3>AI Advisor Awaiting Report</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Please generate a feasibility report first before consulting your AI business advisor.
          </p>
        </div>
      </div>
    )
  }

  const suggestions = [
    'Is this business financially feasible?',
    'What are the biggest risks?',
    'How can I improve profitability?',
    'What should I focus on first?',
  ]

  return (
    <div className="inner-page advisor-page">
      <div className="advisor-heading">
        <div className="icon-box">
          <Bot size={24} />
        </div>
        <div>
          <span className="eyebrow">AI BUSINESS ADVISOR • ONLINE</span>
          <h1>Let’s think this through.</h1>
          <p>Ask anything about your business idea or financial roadmap.</p>
        </div>
      </div>

      <div className="chat-shell">
        <div className="chat-messages">
          {messages.map((m: any, i: number) => (
            <div className={`message ${m.from}`} key={i}>
              {m.from === 'ai' && (
                <div className="ai-avatar">
                  <Sparkles size={12} />
                </div>
              )}
              <div className="bubble">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="suggestion-chips">
          {suggestions.map((s) => (
            <button key={s} onClick={() => sendQuestion(s)}>
              {s} →
            </button>
          ))}
        </div>

        <div className="chat-input">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendQuestion()}
            placeholder="Ask about your business idea…"
          />
          <button onClick={() => sendQuestion()} className="primary-button">
            Send <ArrowRight size={18} />
          </button>
        </div>
        <p className="chat-disclaimer">
          AI suggestions are based on your assessment and are for guidance only.
        </p>
      </div>
    </div>
  )
}
