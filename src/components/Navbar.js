import React from 'react';
import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <div className="logo-icon">
          <Brain size={18} />
        </div>
        <span>VLM Assistant</span>
      </Link>
      
      <Link to="/login" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
        Login
      </Link>
    </nav>
  );
};

export default Navbar;
