import axios from 'axios'

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

console.log('API Configuration:', { API_URL })

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (email, name, phone, password) =>
    api.post('/api/auth/register', { email, name, phone, password }),
  // Updated: now sends email instead of phone
  resetPassword: (email) => api.post('/api/auth/reset-password', { email }),
  // Code-based reset confirmation used on /reset-password page
  resetPasswordWithToken: (email, code, newPassword) =>
    api.post('/api/auth/reset-password-token', { email, token: code, new_password: newPassword })
}

// Products API
export const productsAPI = {
  getAll: () => api.get('/api/products'),
  getAvailable: (id) => api.get(`/api/products/${id}/available`),
  create: (data) => api.post('/api/products', data),
  update: (id, data) => api.put(`/api/products/${id}`, data),
  delete: (id) => api.delete(`/api/products/${id}`)
}

// Ingredients API
export const ingredientsAPI = {
  getAll: () => api.get('/api/ingredients'),
  create: (data) => api.post('/api/ingredients', data),
  update: (id, data) => api.put(`/api/ingredients/${id}`, data),
  delete: (id) => api.delete(`/api/ingredients/${id}`)
}

// Recipes API
export const recipesAPI = {
  getByProduct: (productId) => api.get(`/api/recipes/${productId}`),
  create: (data) => api.post('/api/recipes', data)
}

// Sales API
export const salesAPI = {
  getAll: () => api.get('/api/sales'),
  create: (data) => api.post('/api/sales', data)
}

// Users API — updated with getAll, suspend, unsuspend, delete
export const usersAPI = {
  getAll: () => api.get('/api/users'),
  getPending: () => api.get('/api/users/pending'),
  create: (data) => api.post('/api/users', data),
  approve: (id) => api.post(`/api/users/${id}/approve`),
  reject: (id) => api.post(`/api/users/${id}/reject`),
  suspend: (id) => api.post(`/api/users/${id}/suspend`),
  unsuspend: (id) => api.post(`/api/users/${id}/unsuspend`),
  delete: (id) => api.delete(`/api/users/${id}`)
}

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  getTrend: (days = 7) => api.get(`/api/analytics/trend?days=${days}`),
  getTopProducts: (limit = 5) => api.get(`/api/analytics/top-products?limit=${limit}`)
}

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/api/notifications'),
  markAsRead: (id) => api.post(`/api/notifications/${id}/read`)
}

// Manager Analytics API
export const managerAPI = {
  getDashboard: () => api.get('/api/manager/analytics/dashboard'),
  getSalesPerformance: (days = 30) =>
    api.get(`/api/manager/analytics/sales-performance?days=${days}`),
  getUsers: () => api.get('/api/manager/users')
}

export default api
