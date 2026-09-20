import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Brain, 
  ArrowLeft,
  Settings as SettingsIcon, 
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <Brain size={18} />
          </div>
          <span>VLM Assistant</span>
        </Link>
      </div>

      <div className="sidebar-menu sidebar-dashboard-controls">
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-actions">
          <button className="sidebar-item sidebar-back-home" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </button>
          <button className="sidebar-item" onClick={() => navigate('/app/settings')}>
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
