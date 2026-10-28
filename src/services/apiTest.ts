import api from './api'

export async function testApiConnection() {
  try {
    const response = await api.get('/users')
    console.log('API connection successful:', response.data)
  } catch (error) {
    console.error('API connection failed:', error)
  }
}
