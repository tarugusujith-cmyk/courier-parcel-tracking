import axios from 'axios'

// Local JSON Server base URL. Set VITE_API_URL in .env for a deployed API.
const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined
const rawBaseURL = configuredApiUrl?.trim() || 'http://localhost:5000'
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL.slice(0, -1) : rawBaseURL

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
