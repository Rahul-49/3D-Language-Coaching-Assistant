import axios from 'axios'

// Attach auth token if present
const api = axios.create()
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export async function startSession(avatar_url) {
  const { data } = await api.post('/api/session/start', { avatar_url })
  return data
}

export async function endSession(session_id) {
  const { data } = await api.post('/api/session/end', { session_id })
  return data
}

export async function checkAnswer(session_id, question, audioBlob) {
  const form = new FormData()
  form.append('session_id', session_id)
  form.append('question', question)
  if (audioBlob) form.append('audio', audioBlob, 'answer.webm')

  const { data } = await api.post('/api/check', form)
  return data
}

export async function signup(email, password) {
  const { data } = await api.post('/api/auth/signup', { email, password })
  return data
}

export async function login(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password })
  return data
}

export async function getMe() {
  const { data } = await api.get('/api/auth/me')
  return data
}

// Request server-side TTS for arbitrary text. The backend should return
// { audio_b64: string, visemes: Array<{time|start|end,value}>, mime?: string }
export async function tts(text, avatar_url) {
  const { data } = await api.post('/api/tts', { text, avatar_url })
  return data
}
