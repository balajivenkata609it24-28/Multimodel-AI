import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import DashboardLayout from './components/DashboardLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';

// Dashboard Pages
import Chat from './pages/Chat';
import Analysis from './pages/Analysis';
import UploadDoc from './pages/UploadDoc';
import History from './pages/History';
import Settings from './pages/Settings';
import About from './pages/About';

const isAuthenticated = () => localStorage.getItem('vlm_authenticated') === 'true';

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

const HomeRoute = () => {
  return isAuthenticated() ? <Home /> : <Navigate to="/login" replace />;
};

const LoginRoute = () => {
  return isAuthenticated() ? <Navigate to="/" replace /> : <Login />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<HomeRoute />}
        />
        <Route
          path="/login"
          element={<LoginRoute />}
        />

        {/* Dashboard/App Routes */}
        <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:sessionId" element={<Chat />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="upload" element={<UploadDoc />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
