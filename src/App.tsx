import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TimeBlocking from './pages/TimeBlocking';
import Pomodoro from './pages/Pomodoro';
import Eisenhower from './pages/Eisenhower';
import Parkinson from './pages/Parkinson';
import ParkinsonHub from './pages/ParkinsonHub';
import ProtectedRoute from './components/layout/ProtectedRoute';
import GuestRoute from './components/layout/GuestRoute';


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-blocking"
            element={
              <ProtectedRoute>
                <TimeBlocking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pomodoro"
            element={
              <ProtectedRoute>
                <Pomodoro />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eisenhower"
            element={
              <ProtectedRoute>
                <Eisenhower />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parkinson"
            element={
              <ProtectedRoute>
                <ParkinsonHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parkinson/:type"
            element={
              <ProtectedRoute>
                <Parkinson />
              </ProtectedRoute>
            }
          />
        
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
