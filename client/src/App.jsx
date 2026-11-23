import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

// Student Pages
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { TestScreen } from './pages/TestScreen';
import { ResultScreen } from './pages/ResultScreen';
import { HistoryScreen } from './pages/HistoryScreen';
import { NotFound } from './pages/NotFound';

// Layout with Navbar
const AppLayout = () => (
  <>
    <Navbar />
    <main>
      <Outlet />
    </main>
  </>
);

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Student Authenticated Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Focused test screen without Navbar */}
            <Route path="/test/:attemptId" element={<TestScreen />} />

            {/* Standard screens with Navbar */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/results/:attemptId" element={<ResultScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              
              {/* Admin Routes placeholder - will mount admin pages in Phase 6 */}
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/*" element={<Outlet />} />
            </Route>
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
