import React, { useState, useEffect } from 'react';
import { Palette, Cpu, ToggleLeft, Loader2, Save } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    theme: 'dark',
    primaryColor: 'blue',
    model: 'Qwen/Qwen2.5-VL-7B-Instruct',
    responseLength: 'medium',
    saveChatHistory: true,
    autoDescribeImages: false,
    enableVoiceInput: true,
    enableVoiceOutput: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/settings');
        if (response.ok) {
          const data = await response.json();
          // Convert string booleans to boolean type
          const parsedSettings = {
            ...data,
            saveChatHistory: data.saveChatHistory === 'true',
            autoDescribeImages: data.autoDescribeImages === 'true',
            enableVoiceInput: data.enableVoiceInput === 'true',
            enableVoiceOutput: data.enableVoiceOutput === 'true'
          };
          setSettings(parsedSettings);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const response = await fetch('http://localhost:8000/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} className="animate-spin text-primary" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.75rem' }}>Settings</h2>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          <span>Save Preferences</span>
        </button>
      </div>

      {saveSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
          Preferences updated and saved to backend database!
        </div>
      )}

      {/* Appearance Section */}
      <section className="settings-section glass-panel">
        <h3>
          <Palette size={18} className="text-primary" />
          <span>Appearance</span>
        </h3>
        <div className="settings-grid">
          <div className="setting-control">
            <label>Theme</label>
            <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)}>
              <option value="dark">Dark Theme (Recommended)</option>
              <option value="light">Light Theme</option>
            </select>
          </div>
          <div className="setting-control">
            <label>Primary Highlight Color</label>
            <select value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)}>
              <option value="blue">Electric Blue</option>
              <option value="purple">Royal Purple</option>
              <option value="green">Neon Green</option>
              <option value="indigo">Indigo Glow</option>
            </select>
          </div>
        </div>
      </section>

      {/* AI Preferences */}
      <section className="settings-section glass-panel">
        <h3>
          <Cpu size={18} className="text-primary" />
          <span>AI Model Preferences</span>
        </h3>
        <div className="settings-grid">
          <div className="setting-control">
            <label>VLM / Vision Model</label>
            <select value={settings.model} onChange={(e) => handleChange('model', e.target.value)}>
              <option value="Qwen/Qwen2.5-VL-7B-Instruct">Qwen 2.5 VL 7B (Default)</option>
              <option value="meta-llama/Llama-3.2-11B-Vision-Instruct">Llama 3.2 11B Vision</option>
              <option value="Salesforce/blip2-opt-2.7b">BLIP-2 Image-to-Text</option>
            </select>
          </div>
          <div className="setting-control">
            <label>Response Length</label>
            <select value={settings.responseLength} onChange={(e) => handleChange('responseLength', e.target.value)}>
              <option value="short">Short & Concise</option>
              <option value="medium">Medium / Balanced</option>
              <option value="long">Detailed / Exhaustive</option>
            </select>
          </div>
        </div>
      </section>

      {/* Toggle Switches */}
      <section className="settings-section glass-panel">
        <h3>
          <ToggleLeft size={18} className="text-primary" />
          <span>Other Settings</span>
        </h3>
        
        <div className="setting-row">
          <div className="setting-meta">
            <span className="setting-title">Save Chat History</span>
            <span className="setting-desc">Persist chat records to database for future reference.</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.saveChatHistory} 
              onChange={() => handleToggle('saveChatHistory')} 
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-meta">
            <span className="setting-title">Auto-Describe Images</span>
            <span className="setting-desc">Automatically describe images immediately when attached to chat.</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.autoDescribeImages} 
              onChange={() => handleToggle('autoDescribeImages')} 
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-meta">
            <span className="setting-title">Enable Voice Input</span>
            <span className="setting-desc">Utilize microphone for voice-to-text queries.</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.enableVoiceInput} 
              onChange={() => handleToggle('enableVoiceInput')} 
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-meta">
            <span className="setting-title">Enable Voice Output</span>
            <span className="setting-desc">Convert assistant responses to synthesized speech.</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.enableVoiceOutput} 
              onChange={() => handleToggle('enableVoiceOutput')} 
            />
            <span className="slider"></span>
          </label>
        </div>
      </section>
    </div>
  );
};

export default Settings;
