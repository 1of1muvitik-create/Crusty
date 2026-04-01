import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, AuthContext } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { UserDashboard } from './pages/user/UserDashboard'
import { ManagerDashboard } from './pages/manager/ManagerDashboard'
import { ResetPasswordPage } from './pages/ResetPasswordPage'

function AppRoutes() {
  const auth = React.useContext(AuthContext)

  React.useEffect(() => {
    console.log('[App.jsx] --- ROUTE MATCHING/AUTH STATE CHANGED ---')
    console.log('[App.jsx] Current auth state:', { 
      isAuthenticated: auth.isAuthenticated, 
      userRole: auth.user?.role,
      userName: auth.user?.name,
      hasToken: !!auth.token,
      loading: auth.loading,
      timestamp: new Date().toISOString()
    })
  }, [auth.isAuthenticated, auth.user, auth.token, auth.loading])

  if (auth.loading) {
    console.log('[App.jsx] Auth is still loading...')
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Manager routes */}
      <Route 
        path="/manager/*" 
        element={
          auth.isAuthenticated && auth.user?.role === 'manager' ? (
            (() => {
              console.log('[App.jsx] ✓ Manager route passed! Rendering ManagerDashboard')
              return <ManagerDashboard />
            })()
          ) : (
            (() => {
              console.log('[App.jsx] ✗ Manager route failed! Redirecting to /login')
              console.log('[App.jsx] Check details:', {
                isAuthenticated: auth.isAuthenticated,
                userRole: auth.user?.role,
                isManger: auth.user?.role === 'manager'
              })
              return <Navigate to="/login" />
            })()
          )
        } 
      />
      
      {/* Admin routes */}
      <Route 
        path="/admin/*" 
        element={
          auth.isAuthenticated && auth.user?.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      
      {/* User routes */}
      <Route 
        path="/user/*" 
        element={
          auth.isAuthenticated && auth.user?.role === 'user' ? (
            <UserDashboard />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      
      {/* Redirect root to appropriate dashboard */}
      <Route 
        path="/" 
        element={
          auth.isAuthenticated ? (
            auth.user?.role === 'admin' ? (
              <Navigate to="/admin" />
            ) : auth.user?.role === 'manager' ? (
              <Navigate to="/manager" />
            ) : (
              <Navigate to="/user/pos" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
