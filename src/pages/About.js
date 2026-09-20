import React from 'react';
import { Brain, Cpu, Blocks, Code2, Database } from 'lucide-react';

const About = () => {
  return (
    <div className="about-container">
      <div className="about-logo-wrapper">
        <Brain size={48} />
      </div>

      <div className="about-header">
        <h2 className="about-title">Multimodal AI Assistant</h2>
        <h4 style={{ color: 'var(--primary)', fontWeight: '600', marginBottom: '15px' }}>using Vision Language Models</h4>
      </div>

      <p className="about-desc">
        This assistant leverages state-of-the-art Vision Language Models (VLMs) to analyze and process images, documents, charts, and diagrams. It enables unified understanding of both visual elements and linguistic content, facilitating intelligent conversation and standalone auditing.
      </p>

      <section className="about-techs">
        <h3>Technologies Used</h3>
        
        <div className="tech-grid">
          <div className="tech-card glass-panel">
            <Blocks size={32} className="tech-icon" />
            <span className="tech-name">React</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Component UI Framework</p>
          </div>

          <div className="tech-card glass-panel">
            <Cpu size={32} className="tech-icon" />
            <span className="tech-name">FastAPI</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High-Performance Server</p>
          </div>

          <div className="tech-card glass-panel">
            <Code2 size={32} className="tech-icon" />
            <span className="tech-name">Python</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Processing & Parsing</p>
          </div>

          <div className="tech-card glass-panel">
            <Database size={32} className="tech-icon" />
            <span className="tech-name">Qwen2.5-VL</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VLM Vision Transformer</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
