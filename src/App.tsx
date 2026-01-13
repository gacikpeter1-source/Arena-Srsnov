import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from './components/ui/toaster'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import TrainersPage from './pages/TrainersPage'
import TrainerDetailPage from './pages/TrainerDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EventDetailPage from './pages/EventDetailPage'
import CreateEventPage from './pages/CreateEventPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import CancelRegistrationPage from './pages/CancelRegistrationPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/trainers" element={<TrainersPage />} />
            <Route path="/trainers/:trainerId" element={<TrainerDetailPage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/my-registration/:registrationId/:token" element={<CancelRegistrationPage />} />
            
            {/* Protected routes for trainers/admin */}
            <Route 
              path="/events/create" 
              element={
                <ProtectedRoute>
                  <CreateEventPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/events/:eventId/edit" 
              element={
                <ProtectedRoute>
                  <CreateEventPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
        <Toaster />
      </AuthProvider>
    </Router>
  )
}

export default App




