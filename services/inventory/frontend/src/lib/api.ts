import axios from 'axios'
import { API_URL } from './config'

// Log para debugging
if (typeof window !== 'undefined') {
  console.log('🔧 API URL configurada:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        window.location.href = '/login.html'
      }
    } else if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard.html'
      }
    }
    return Promise.reject(error)
  }
)

export default api
