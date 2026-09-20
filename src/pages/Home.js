import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Image, FileText, MessageSquareCode, Info } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <Navbar />
      
      <main className="hero-section-two-col">
        {/* Left Column: Descriptions & CTAs */}
        <div className="hero-text-side">
          <h1 className="hero-title">
            Multimodal AI Assistant<br />
            <span className="hero-gradient">using Vision Language Models</span>
          </h1>
          
          <p className="hero-subtitle">
            Upload images, documents, charts or ask questions. Get intelligent answers, descriptions, text extraction and much more - all in one place.
          </p>

          <div className="hero-ctas">
            <span className="hero-text-link">Get started with your work</span>
          </div>
        </div>

        {/* Right Column: Dashboard Graphic */}
        <div className="hero-graphic-side">
          <img 
            className="hero-image-mockup"
            src="/dashboard_preview.png" 
            alt="VLM Assistant Dashboard Preview" 
          />
        </div>
      </main>

      <section className="features-grid home-dashboard-grid">
        <div className="feature-card glass-panel dashboard-card" onClick={() => navigate('/app/analysis')}>
          <div className="feature-icon-container">
            <Image size={24} />
          </div>
          <h3>Upload Image</h3>
          <p>Describe and analyze any image, from complex landscapes to details in photographic elements.</p>
        </div>

        <div className="feature-card glass-panel dashboard-card" onClick={() => navigate('/app/upload')}>
          <div className="feature-icon-container">
            <FileText size={24} />
          </div>
          <h3>Upload Document</h3>
          <p>Extract text from images, invoices, and documents using state-of-the-art vision models.</p>
        </div>

        <div className="feature-card glass-panel dashboard-card" onClick={() => navigate('/app/chat')}>
          <div className="feature-icon-container">
            <MessageSquareCode size={24} />
          </div>
          <h3>Document Q&A</h3>
          <p>Ask questions and get intelligent context-aware answers directly extracted from your text documents.</p>
        </div>
        <div className="feature-card glass-panel dashboard-card" onClick={() => navigate('/app/about')}>
          <div className="feature-icon-container"><Info size={24} /></div>
          <h3>About Assistant</h3>
          <p>Learn how the multimodal assistant works and which technologies power it.</p>
        </div>
      </section>

      <footer className="home-footer" id="contact">
        <div>
          <strong>Contact</strong>
          <span>Questions or feedback? Reach us at support@vlmassistant.local</span>
        </div>
        <span>© 2026 VLM Assistant</span>
      </footer>
    </div>
  );
};

export default Home;
