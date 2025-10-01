import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  { key: 'knowledgeLevel', title: 'English proficiency', desc: 'Tell us your current spoken English level for interviews' },
  { key: 'goals', title: 'Interview goals', desc: 'Choose what you want to improve with the Avatar Assistant' },
  { key: 'preferredSessionMins', title: 'Session length', desc: 'Select how long each mock interview session should be' },
];

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const [form, setForm] = useState({ knowledgeLevel: 'beginner', goals: [], preferredSessionMins: 25 });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNext = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const isLast = current === steps.length - 1;
      if (isLast) {
        // Navigate to main app
        console.log('Onboarding complete:', form);
        navigate('/app', { replace: true });
      } else {
        setCurrent((c) => c + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setCurrent((c) => Math.max(0, c - 1));

  const toggleGoal = (goal) => {
    setForm((f) => {
      const has = f.goals.includes(goal);
      return { ...f, goals: has ? f.goals.filter((g) => g !== goal) : [...f.goals, goal] };
    });
  };

  const progressPercentage = ((current + 1) / steps.length) * 100;

  return (
    <div className="min-vh-100 bg-dark text-white position-relative overflow-hidden d-flex align-items-center">
      <style>{`
        .floating-orb-onboard {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .onboard-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .gradient-text-onboard {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .option-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          color: white;
          padding: 20px;
          transition: all 0.3s ease;
          border-radius: 12px;
          font-weight: 500;
        }
        .option-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(102, 126, 234, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .option-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: rgba(102, 126, 234, 0.8);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .btn-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
          color: white;
        }
        .btn-gradient:disabled {
          opacity: 0.5;
          transform: none;
        }
        .btn-outline-custom {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-outline-custom:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }
        .btn-outline-custom:disabled {
          opacity: 0.5;
        }
        .progress-gradient {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        .step-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        .step-indicator.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: rgba(102, 126, 234, 0.8);
        }
        .step-indicator.completed {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.5);
        }
        .form-range-custom::-webkit-slider-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .form-range-custom::-moz-range-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      `}</style>

      {/* Floating Background Orbs */}
      <div className="floating-orb-onboard" style={{ top: '20%', left: '10%', width: '300px', height: '300px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
      <div className="floating-orb-onboard" style={{ bottom: '20%', right: '10%', width: '350px', height: '350px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', animationDelay: '1s' }}></div>

      <div className="container position-relative" style={{ zIndex: 10 }}>
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <div className="onboard-card p-4 p-md-5 rounded-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  {steps.map((step, idx) => (
                    <div key={idx} className="d-flex align-items-center flex-column position-relative" style={{ flex: 1 }}>
                      <div className={`step-indicator mb-2 ${idx === current ? 'active' : idx < current ? 'completed' : ''}`}>
                        {idx < current ? <i className="bi bi-check-lg"></i> : idx + 1}
                      </div>
                      <small className="text-white-50 text-center d-none d-md-block">{step.title}</small>
                      {idx < steps.length - 1 && (
                        <div 
                          className="position-absolute top-50 start-100 translate-middle-y d-none d-md-block" 
                          style={{ 
                            width: '100%', 
                            height: '2px', 
                            background: idx < current ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                            zIndex: -1
                          }}
                        ></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-5">
                <h1 className="fw-bold mb-2">
                  <span className="gradient-text-onboard">{steps[current].title}</span>
                </h1>
                <p className="text-white-50 lead">{steps[current].desc}</p>
              </div>

              {/* Knowledge Level */}
              {steps[current].key === 'knowledgeLevel' && (
                <div className="row g-3 mb-4">
                  {[
                    { value: 'beginner', label: 'Beginner', sublabel: 'A1–A2', icon: 'bi-star' },
                    { value: 'intermediate', label: 'Intermediate', sublabel: 'B1–B2', icon: 'bi-lightning-charge' },
                    { value: 'advanced', label: 'Advanced', sublabel: 'C1+', icon: 'bi-rocket-takeoff' },
                  ].map((opt) => (
                    <div className="col-md-4" key={opt.value}>
                      <button
                        type="button"
                        className={`option-btn w-100 text-center ${form.knowledgeLevel === opt.value ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, knowledgeLevel: opt.value })}
                      >
                        <i className={`bi ${opt.icon} fs-2 d-block mb-2`}></i>
                        <div className="fw-bold">{opt.label}</div>
                        <small className="text-white-50">{opt.sublabel}</small>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Goals */}
              {steps[current].key === 'goals' && (
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Improve fluency', icon: 'bi-chat-dots' },
                    { label: 'Answer structure (STAR)', icon: 'bi-diagram-3' },
                    { label: 'Pronunciation & clarity', icon: 'bi-mic' },
                    { label: 'Reduce filler words', icon: 'bi-slash-circle' },
                    { label: 'Technical Q&A practice', icon: 'bi-code-slash' },
                    { label: 'Behavioral questions', icon: 'bi-person-raised-hand' },
                  ].map((g) => (
                    <div className="col-md-6" key={g.label}>
                      <button
                        type="button"
                        className={`option-btn w-100 text-start d-flex align-items-center gap-3 ${form.goals.includes(g.label) ? 'active' : ''}`}
                        onClick={() => toggleGoal(g.label)}
                      >
                        <i className={`bi ${g.icon} fs-4`}></i>
                        <span>{g.label}</span>
                        {form.goals.includes(g.label) && <i className="bi bi-check-circle-fill ms-auto"></i>}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Session Length */}
              {steps[current].key === 'preferredSessionMins' && (
                <div className="mb-4">
                  <div className="text-center mb-4">
                    <div className="display-3 fw-bold gradient-text-onboard mb-2">
                      {form.preferredSessionMins}
                    </div>
                    <p className="text-white-50">minutes per session</p>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    className="form-range form-range-custom w-100"
                    value={form.preferredSessionMins}
                    onChange={(e) => setForm({ ...form, preferredSessionMins: Number(e.target.value) })}
                  />
                  <div className="d-flex justify-content-between text-white-50 small mt-2">
                    <span>5 min</span>
                    <span>120 min</span>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="d-flex justify-content-between gap-3 mt-5">
                <button 
                  className="btn btn-outline-custom px-4 py-2 rounded-pill" 
                  onClick={handleBack} 
                  disabled={current === 0 || loading}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back
                </button>
                <button 
                  className="btn btn-gradient px-4 py-2 rounded-pill" 
                  onClick={handleNext} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      {current === steps.length - 1 ? 'Finish Setup' : 'Continue'}
                      <i className="bi bi-arrow-right ms-2"></i>
                    </>
                  )}
                </button>
              </div>

              {/* Step Counter (Mobile) */}
              <div className="text-center mt-4 d-md-none">
                <small className="text-white-50">Step {current + 1} of {steps.length}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;