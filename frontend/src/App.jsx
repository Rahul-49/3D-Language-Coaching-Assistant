import React, { useRef, useState } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { login as apiLogin, signup as apiSignup, getMe } from './api/apiClient'
import AvatarScene from './components/AvatarScene.jsx'
import InterviewPanel from './components/InterviewPanel.jsx'
import ScoreReport from './components/ScoreReport.jsx'

function Protected({ children }) {
  const token = localStorage.getItem('auth_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const onSubmit = async (e)=>{
    e.preventDefault()
    setError('')
    try {
      const { token } = await apiLogin(email, password)
      localStorage.setItem('auth_token', token)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed')
    }
  }
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h4 mb-3">Login</h2>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
                </div>
                <button className="btn btn-primary w-100" type="submit">Login</button>
              </form>
              <div className="mt-3 text-center">
                <span>Don't have an account? </span>
                <Link to="/signup">Sign up</Link>
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
  const navigate = useNavigate()
  const onSubmit = async (e)=>{
    e.preventDefault()
    setError('')
    try {
      const { token } = await apiSignup(email, password)
      localStorage.setItem('auth_token', token)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Signup failed')
    }
  }
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h4 mb-3">Sign Up</h2>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
                </div>
                <button className="btn btn-primary w-100" type="submit">Create account</button>
              </form>
              <div className="mt-3 text-center">
                <span>Already have an account? </span>
                <Link to="/login">Login</Link>
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

  const MainApp = (
    <div className="container-fluid" style={{height:'100vh'}}>
      <div className="row h-100">
        <div className="col-md-8 p-0" style={{background:'#0b0e14', color:'#fff'}}>
          <AvatarScene avatarUrl={avatarUrl} visemes={visemes} audioRef={audioRef} />
        </div>
        <div className="col-md-4 d-flex flex-column" style={{overflow:'auto'}}>
          <div className="py-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h4 mb-0">3D Avatar English Interview Assistant</h2>
              <button className="btn btn-sm btn-outline-secondary" onClick={()=>{ localStorage.removeItem('auth_token'); window.location.href='/login' }}>Logout</button>
            </div>
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Ready Player Me Avatar URL</label>
                  <input className="form-control" value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} placeholder="https://models.readyplayer.me/...glb" />
                </div>
                <InterviewPanel avatarUrl={avatarUrl} sessionId={sessionId} setSessionId={setSessionId} setFinalScores={setFinalScores} setVisemes={setVisemes} audioRef={audioRef} />
                {finalScores && (
                  <div className="mt-3">
                    <ScoreReport scores={finalScores} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<Protected>{MainApp}</Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
