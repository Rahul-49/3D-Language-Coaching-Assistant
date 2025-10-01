import React from 'react'

export default function ScoreReport({ scores }) {
  if (!scores) return null
  
  const metrics = [
    { key: 'grammar', label: 'Grammar', icon: 'bi-pencil-fill', gradientClass: 'gradient-text-purple' },
    { key: 'pronunciation', label: 'Pronunciation', icon: 'bi-soundwave', gradientClass: 'gradient-text-blue' },
    { key: 'semantic', label: 'Semantic', icon: 'bi-brain', gradientClass: 'gradient-text-pink' },
    { key: 'fluency', label: 'Fluency', icon: 'bi-arrow-repeat', gradientClass: 'gradient-text-green' }
  ]

  // Normalize score to 0-100 range (backend may send 0-1 or 0-100)
  const normalizeScore = (score) => {
    if (!score) return 0
    return score > 1 ? Math.min(100, score) : Math.min(100, score * 100)
  }

  const finalScore = normalizeScore(scores.final)
  const getScoreColor = (score) => {
    const normalized = normalizeScore(score)
    if (normalized >= 80) return 'success'
    if (normalized >= 60) return 'warning'
    return 'danger'
  }

  const getScoreMessage = (score) => {
    if (score >= 80) return { text: 'Excellent Performance!', icon: 'bi-trophy-fill' }
    if (score >= 60) return { text: 'Good Job! Keep Practicing', icon: 'bi-hand-thumbs-up-fill' }
    return { text: 'Keep Learning & Improving', icon: 'bi-arrow-up-circle-fill' }
  }

  const scoreMessage = getScoreMessage(finalScore)

  return (
    <div className="container-fluid p-0">
      <style>{`
        .gradient-text-purple {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-blue {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-pink {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .score-card-compact {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .score-card-compact::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .score-card-compact:hover {
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }
        .score-card-compact:hover::before {
          opacity: 1;
        }
        .metric-icon-sm {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      {/* Header - Compact */}
      <div className="text-center mb-3">
        <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
          <i className={`bi ${scoreMessage.icon} text-${getScoreColor(finalScore)}`} style={{ fontSize: '1.5rem' }}></i>
          <h4 className="mb-0 fw-bold">{scoreMessage.text}</h4>
        </div>
        <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill" style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(244, 114, 182, 0.2) 100%)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <span className="text-white-50 small">Final Score:</span>
          <span className="display-6 fw-bold gradient-text-purple">{Math.round(finalScore)}%</span>
          <div className="d-flex gap-1 ms-2">
            {[...Array(5)].map((_, i) => (
              <i 
                key={i} 
                className={`bi bi-star-fill ${i < Math.round(finalScore / 20) ? 'text-warning' : 'text-white-50'}`}
                style={{ fontSize: '0.75rem' }}
              ></i>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Metrics - Compact Grid */}
      <div className="row g-2 mb-3">
        {metrics.map((metric) => {
          const value = scores[metric.key] || 0
          const percentage = Math.round(normalizeScore(value))
          
          return (
            <div key={metric.key} className="col-6">
              <div className="score-card-compact rounded-3 p-3 position-relative">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="metric-icon-sm position-relative" style={{ background: `linear-gradient(135deg, ${metric.key === 'grammar' ? '#667eea, #764ba2' : metric.key === 'pronunciation' ? '#4facfe, #00f2fe' : metric.key === 'semantic' ? '#fa709a, #fee140' : '#10b981, #059669'})` }}>
                    <i className={`bi ${metric.icon} text-white`} style={{ fontSize: '1.1rem' }}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="text-white-50 small mb-1" style={{ fontSize: '0.75rem' }}>{metric.label}</div>
                    <div className="d-flex align-items-baseline gap-2">
                      <div className={`${metric.gradientClass} fw-bold`} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                        {percentage}
                      </div>
                      <span className="text-white-50 small">%</span>
                    </div>
                  </div>
                </div>
                <div className="progress rounded-pill" style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)' }}>
                  <div 
                    className={`progress-bar bg-${getScoreColor(value)} rounded-pill`}
                    style={{ width: `${Math.min(100, percentage)}%`, transition: 'width 0.6s ease' }}
                  ></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary - Compact */}
      <div className="row g-2">
        <div className="col-6">
          <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <i className="bi bi-check-circle-fill text-success"></i>
            <div className="flex-grow-1">
              <div className="fw-semibold small">Strengths</div>
              <div className="text-white-50" style={{ fontSize: '0.7rem' }}>
                {metrics
                  .filter(m => normalizeScore(scores[m.key]) > 75)
                  .map(m => m.label)
                  .join(', ') || 'Keep practicing!'}
              </div>
            </div>
          </div>
        </div>
        <div className="col-6">
          <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <i className="bi bi-arrow-up-circle-fill text-danger"></i>
            <div className="flex-grow-1">
              <div className="fw-semibold small">Improve</div>
              <div className="text-white-50" style={{ fontSize: '0.7rem' }}>
                {metrics
                  .filter(m => normalizeScore(scores[m.key]) < 75)
                  .map(m => m.label)
                  .join(', ') || 'All good!'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}