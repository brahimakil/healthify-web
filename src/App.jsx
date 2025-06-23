import { Routes, Route } from 'react-router-dom'
import './App.css'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { BrowserRouter as Router } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProtectedRoute from './components/ProtectedRoute'
import ChatHistory from './pages/ChatHistory'
import DietitianChats from './pages/DietitianChats'
import Users from './pages/Users'
import Dietitians from './pages/Dietitians'
import Plans from './pages/Plans'

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/chats" element={
              <ProtectedRoute>
                <Layout>
                  <ChatHistory />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dietitian-chats" element={
              <ProtectedRoute>
                <Layout>
                  <DietitianChats />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dietitians" element={
              <ProtectedRoute>
                <Layout>
                  <Dietitians />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/plans" element={
              <ProtectedRoute>
                <Layout>
                  <Plans />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
