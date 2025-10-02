import React, { useRef, useState } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { login as apiLogin, signup as apiSignup } from './api/apiClient'
import AvatarScene from './components/AvatarScene.jsx'
import InterviewPanel from './components/InterviewPanel.jsx'
import ScoreReport from './components/ScoreReport.jsx'
import Onboarding from './components/Onboarding.jsx'
import HomePage from './components/HomePage.jsx'

function Protected({ children }) {
  const token = localStorage.getItem('auth_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const onSubmit = async (e)=>{
    e.preventDefault()
    setError('')
    try {
      const { token } = await apiLogin(email, password)
      localStorage.setItem('auth_token', token)
      navigate('/app')
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed')
    }
  }
  return (
    <div className="min-vh-100 bg-dark text-white position-relative overflow-hidden">
      <style>{`
        .auth-gradient-bg {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
        }
        .floating-orb-auth {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .auth-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .gradient-text-auth {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .btn-social {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          transition: all 0.3s ease;
        }
        .btn-social:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
          transform: translateY(-2px);
        }
        .form-control-dark {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          transition: all 0.3s ease;
        }
        .form-control-dark:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(102, 126, 234, 0.5);
          color: white;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .form-control-dark::placeholder {
          color: rgba(255, 255, 255, 0.4);
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
        .form-label-dark {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }
      `}</style>

      {/* Floating Background Orbs */}
      <div className="floating-orb-auth" style={{ top: '20%', left: '10%', width: '300px', height: '300px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
      <div className="floating-orb-auth" style={{ bottom: '20%', right: '10%', width: '350px', height: '350px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', animationDelay: '1s' }}></div>

      <div className="container py-5 position-relative" style={{ zIndex: 10 }}>
        <div className="row justify-content-center min-vh-100 align-items-center">
          <div className="col-lg-5 col-md-7">
            <div className="auth-card p-4 p-md-5 rounded-4">
              <div className="text-center mb-4">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                  <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <i className="bi bi-robot fs-4"></i>
                  </div>
                  <h3 className="mb-0 fw-bold">Avatar Assistant</h3>
                </div>
                <h1 className="fw-bold mb-2"><span className="gradient-text-auth">Welcome Back</span></h1>
                <p className="text-white-50">Sign in to continue your interview practice</p>
              </div>

              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{error}</span>
                </div>
              )}

              <div className="d-grid gap-2 mb-3">
                <button className="btn btn-social py-2">
                  <i className="bi bi-google me-2"></i> Continue with Google
                </button>
                <button className="btn btn-social py-2">
                  <i className="bi bi-github me-2"></i> Continue with GitHub
                </button>
              </div>

              <div className="text-center text-white-50 small my-3 position-relative">
                <span className="px-3" style={{ background: 'rgba(26, 26, 46, 0.9)' }}>Or continue with email</span>
                <hr className="position-absolute top-50 start-0 end-0" style={{ zIndex: -1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              </div>

              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label form-label-dark">Email Address</label>
                  <input 
                    className="form-control form-control-dark" 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email} 
                    onChange={e=>setEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label form-label-dark">Password</label>
                  <div className="input-group">
                    <input 
                      className="form-control form-control-dark" 
                      type={showPwd ? 'text' : 'password'} 
                      placeholder="Enter your password" 
                      value={password} 
                      onChange={e=>setPassword(e.target.value)} 
                      required 
                    />
                    <button 
                      type="button" 
                      className="btn btn-social border-start-0" 
                      onClick={()=>setShowPwd(s=>!s)} 
                      aria-label="Toggle password visibility"
                    >
                      <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="rememberMe" />
                    <label className="form-check-label text-white-50 small" htmlFor="rememberMe">Remember me</label>
                  </div>
                  <a className="text-white-50 text-decoration-none small" href="#">Forgot password?</a>
                </div>

                <button className="btn btn-gradient w-100 py-2" type="submit">
                  <i className="bi bi-box-arrow-in-right me-2"></i> Sign In
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-white-50">Don't have an account? </span>
                <Link to="/signup" className="text-decoration-none fw-semibold" style={{ color: '#667eea' }}>Create one</Link>
                <div className="small text-white-50 mt-2">By continuing you agree to our Terms and Privacy.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const navigate = useNavigate()
  const onSubmit = async (e)=>{
    e.preventDefault()
    setError('')
    try {
      const { token } = await apiSignup(email, password)
      localStorage.setItem('auth_token', token)
      navigate('/onboarding')
    } catch (err) {
      setError(err?.response?.data?.error || 'Signup failed')
    }
  }
  return (
    <div className="min-vh-100 bg-dark text-white position-relative overflow-hidden">
      <style>{`
        .auth-gradient-bg {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
        }
        .floating-orb-auth {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .auth-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .gradient-text-auth {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .btn-social {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          transition: all 0.3s ease;
        }
        .btn-social:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
          transform: translateY(-2px);
        }
        .form-control-dark {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          transition: all 0.3s ease;
        }
        .form-control-dark:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(102, 126, 234, 0.5);
          color: white;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .form-control-dark::placeholder {
          color: rgba(255, 255, 255, 0.4);
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
        .form-label-dark {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }
      `}</style>

      {/* Floating Background Orbs */}
      <div className="floating-orb-auth" style={{ top: '20%', left: '10%', width: '300px', height: '300px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
      <div className="floating-orb-auth" style={{ bottom: '20%', right: '10%', width: '350px', height: '350px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', animationDelay: '1s' }}></div>

      <div className="container py-5 position-relative" style={{ zIndex: 10 }}>
        <div className="row justify-content-center min-vh-100 align-items-center">
          <div className="col-lg-5 col-md-7">
            <div className="auth-card p-4 p-md-5 rounded-4">
              <div className="text-center mb-4">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                  <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <i className="bi bi-robot fs-4"></i>
                  </div>
                  <h3 className="mb-0 fw-bold">Avatar Assistant</h3>
                </div>
                <h1 className="fw-bold mb-2"><span className="gradient-text-auth">Create Account</span></h1>
                <p className="text-white-50">Start your journey with AI-powered practice</p>
              </div>

              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{error}</span>
                </div>
              )}

              <div className="d-grid gap-2 mb-3">
                <button className="btn btn-social py-2">
                  <i className="bi bi-google me-2"></i> Continue with Google
                </button>
                <button className="btn btn-social py-2">
                  <i className="bi bi-github me-2"></i> Continue with GitHub
                </button>
              </div>

              <div className="text-center text-white-50 small my-3 position-relative">
                <span className="px-3" style={{ background: 'rgba(26, 26, 46, 0.9)' }}>Or use your email</span>
                <hr className="position-absolute top-50 start-0 end-0" style={{ zIndex: -1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              </div>

              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label form-label-dark">Email Address</label>
                  <input 
                    className="form-control form-control-dark" 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email} 
                    onChange={e=>setEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label form-label-dark">Password</label>
                  <div className="input-group">
                    <input 
                      className="form-control form-control-dark" 
                      type={showPwd ? 'text' : 'password'} 
                      placeholder="Create a password" 
                      value={password} 
                      onChange={e=>setPassword(e.target.value)} 
                      required 
                    />
                    <button 
                      type="button" 
                      className="btn btn-social border-start-0" 
                      onClick={()=>setShowPwd(s=>!s)} 
                      aria-label="Toggle password visibility"
                    >
                      <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button className="btn btn-gradient w-100 py-2" type="submit">
                  <i className="bi bi-person-plus me-2"></i> Create Account
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-white-50">Already have an account? </span>
                <Link to="/login" className="text-decoration-none fw-semibold" style={{ color: '#667eea' }}>Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [avatarUrl, setAvatarUrl] = useState('https://models.readyplayer.me/68d6076e9603200be591e17a.glb')
  const [sessionId, setSessionId] = useState('')
  const [finalScores, setFinalScores] = useState(null)
  const [visemes, setVisemes] = useState([])
  const audioRef = useRef(null)
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)

  const handleFinish = (scores) => {
    setFinalScores(scores)
    setShowPerformanceModal(true)
  }

  const MainApp = (
    <div className="vh-100 bg-dark text-white position-relative overflow-hidden">
      <style>{`
        .app-dark-bg {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
        }
        .floating-orb-app {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.2;
          pointer-events: none;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .avatar-container-dark {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          overflow: hidden;
        }
        .btn-logout {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-logout:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
          transform: translateY(-2px);
        }
        .input-dark {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          transition: all 0.3s ease;
        }
        .input-dark:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(102, 126, 234, 0.5);
          color: white;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .input-dark::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .label-dark {
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .gradient-text-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .performance-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .performance-modal {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(244, 114, 182, 0.15) 100%);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.4s ease-out;
          position: relative;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .performance-modal::-webkit-scrollbar {
          display: none;
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .confetti {
          position: fixed;
          width: 10px;
          height: 10px;
          background: #f0f;
          position: absolute;
          animation: confetti-fall linear infinite;
        }
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        .confetti:nth-child(1) { left: 10%; animation-duration: 3s; background: #667eea; }
        .confetti:nth-child(2) { left: 20%; animation-duration: 2.5s; background: #764ba2; animation-delay: 0.2s; }
        .confetti:nth-child(3) { left: 30%; animation-duration: 2.8s; background: #f093fb; animation-delay: 0.4s; }
        .confetti:nth-child(4) { left: 40%; animation-duration: 3.2s; background: #f5576c; animation-delay: 0.1s; }
        .confetti:nth-child(5) { left: 50%; animation-duration: 2.6s; background: #667eea; animation-delay: 0.3s; }
        .confetti:nth-child(6) { left: 60%; animation-duration: 3.1s; background: #764ba2; animation-delay: 0.5s; }
        .confetti:nth-child(7) { left: 70%; animation-duration: 2.7s; background: #f093fb; animation-delay: 0.2s; }
        .confetti:nth-child(8) { left: 80%; animation-duration: 2.9s; background: #f5576c; animation-delay: 0.4s; }
        .confetti:nth-child(9) { left: 90%; animation-duration: 3.3s; background: #667eea; animation-delay: 0.1s; }
        .confetti:nth-child(10) { left: 15%; animation-duration: 2.4s; background: #764ba2; animation-delay: 0.6s; }
        .confetti:nth-child(11) { left: 25%; animation-duration: 3.0s; background: #f093fb; animation-delay: 0.3s; }
        .confetti:nth-child(12) { left: 35%; animation-duration: 2.8s; background: #f5576c; animation-delay: 0.5s; }
        .confetti:nth-child(13) { left: 45%; animation-duration: 3.2s; background: #667eea; animation-delay: 0.2s; }
        .confetti:nth-child(14) { left: 55%; animation-duration: 2.6s; background: #764ba2; animation-delay: 0.4s; }
        .confetti:nth-child(15) { left: 65%; animation-duration: 2.9s; background: #f093fb; animation-delay: 0.1s; }
        .confetti:nth-child(16) { left: 75%; animation-duration: 3.1s; background: #f5576c; animation-delay: 0.6s; }
        .confetti:nth-child(17) { left: 85%; animation-duration: 2.7s; background: #667eea; animation-delay: 0.3s; }
        .confetti:nth-child(18) { left: 95%; animation-duration: 3.0s; background: #764ba2; animation-delay: 0.5s; }
        .confetti:nth-child(19) { left: 5%; animation-duration: 2.5s; background: #f093fb; animation-delay: 0.2s; }
        .confetti:nth-child(20) { left: 50%; animation-duration: 2.8s; background: #f5576c; animation-delay: 0.4s; }
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
      `}</style>

      {/* Floating Background Orbs */}
      <div className="floating-orb-app" style={{ top: '10%', left: '15%', width: '300px', height: '300px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
      <div className="floating-orb-app" style={{ top: '60%', right: '10%', width: '350px', height: '350px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}></div>

      <div className="container-fluid h-100 position-relative" style={{ zIndex: 10 }}>
        <div className="row g-0 h-100">
          {/* Avatar Section */}
          <div className="col-lg-8 p-4 h-100">
            <div className="avatar-container-dark h-100">
              <AvatarScene avatarUrl={avatarUrl} visemes={visemes} audioRef={audioRef} />
            </div>
          </div>

          {/* Control Panel */}
          <div className="col-lg-4 p-3 h-100" style={{ overflowY: 'auto' }}>
            {/* Header */}
            <div className="glass-panel rounded-3 p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="header-icon">
                    <i className="bi bi-robot fs-4 text-white"></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold gradient-text-header">Avatar Assistant</h5>
                    <small className="text-white-50">AI Interview Practice</small>
                  </div>
                </div>
                <button 
                  className="btn btn-logout btn-sm rounded-pill px-3"
                  onClick={()=>{ localStorage.removeItem('auth_token'); window.location.href='/login' }}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </button>
              </div>
            </div>

            {/* Interview Panel */}
            {!showPerformanceModal && (
              <div className="glass-panel rounded-3 p-3 mb-3">
                <InterviewPanel 
                  avatarUrl={avatarUrl} 
                  sessionId={sessionId} 
                  setSessionId={setSessionId} 
                  setFinalScores={handleFinish} 
                  setVisemes={setVisemes} 
                  audioRef={audioRef} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Modal with Confetti */}
      {showPerformanceModal && finalScores && (
        <div className="performance-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPerformanceModal(false)}>
          {/* Confetti */}
          {[...Array(20)].map((_, i) => (
            <div key={i} className="confetti" style={{ top: '-10px' }}></div>
          ))}
          
          <div className="performance-modal p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="mb-3">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <i className="bi bi-trophy-fill text-white" style={{ fontSize: '2.5rem' }}></i>
                </div>
              </div>
              <h2 className="fw-bold mb-2">
                <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Interview Complete!
                </span>
              </h2>
              <p className="text-white-50 mb-0">Here's your performance summary</p>
            </div>

            {/* Score Report */}
            <div className="mb-4">
              <ScoreReport scores={finalScores} />
            </div>

            {/* Action Buttons */}
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              <button 
                className="btn btn-gradient rounded-pill px-4 py-2 d-flex align-items-center gap-2"
                onClick={() => {
                  setShowPerformanceModal(false)
                  setFinalScores(null)
                  setSessionId('')
                }}
              >
                <i className="bi bi-arrow-clockwise"></i>
                <span>Start New Session</span>
              </button>
              <button 
                className="btn btn-outline-custom rounded-pill px-4 py-2 d-flex align-items-center gap-2"
                onClick={() => setShowPerformanceModal(false)}
              >
                <i className="bi bi-eye"></i>
                <span>Review Answers</span>
              </button>
            </div>

            {/* Close button */}
            <button 
              className="btn btn-link text-white-50 position-absolute top-0 end-0 m-3"
              onClick={() => setShowPerformanceModal(false)}
              style={{ textDecoration: 'none', fontSize: '1.5rem' }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route path="/app" element={<Protected>{MainApp}</Protected>} />
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}