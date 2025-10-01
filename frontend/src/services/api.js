import axios from 'axios'

// Simple helper that always sends bearer token if present
function withAuth() {
  const instance = axios.create()
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })
  return instance
}

const api = withAuth()

export async function getOnboarding() {
  const { data } = await api.get('/api/onboarding')
  return data
}

export async function saveOnboarding(payload) {
  const { data } = await api.post('/api/onboarding', payload)
  return data
}
