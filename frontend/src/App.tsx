import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import ParticipantManagement from './pages/ParticipantManagement';
import CouponManagement from './pages/CouponManagement';
import EventReports from './pages/EventReports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/create"
              element={
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:eventId"
              element={
                <ProtectedRoute>
                  <EventDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:eventId/participants"
              element={
                <ProtectedRoute>
                  <ParticipantManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:eventId/coupons"
              element={
                <ProtectedRoute>
                  <CouponManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:eventId/reports"
              element={
                <ProtectedRoute>
                  <EventReports />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
