import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Type, 
  Eye, 
  BarChart3, 
  Upload, 
  MoreHorizontal, 
  Loader2 
} from 'lucide-react';

const API_BASE = '/api';

const Analysis = () => {
  const [image, setImage] = useState(null);
  const [filePath, setFilePath] = useState('backend/uploads/lake_landscape.png');
  const [imageUrl, setImageUrl] = useState('/api/uploads/lake_landscape.png');
  const [activeAction, setActiveAction] = useState('describe');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('The image is a beautiful landscape featuring a lake surrounded by mountains and trees. The sky is blue with some clouds. There is a small house near the lake.');
  const [objects, setObjects] = useState([
    {name: "mountain", box: [50, 100, 950, 550], confidence: 0.97},
    {name: "lake", box: [0, 500, 1000, 950], confidence: 0.99},
    {name: "trees", box: [0, 400, 300, 550], confidence: 0.85},
    {name: "sky", box: [0, 0, 1000, 300], confidence: 0.98},
    {name: "house", box: [800, 480, 880, 550], confidence: 0.91},
    {name: "clouds", box: [200, 50, 600, 200], confidence: 0.92}
  ]);
  const [colors, setColors] = useState(["#080C14", "#1D4ED8", "#1E3A8A", "#10B981", "#78350F"]);
  
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setLoading(true);
    setResult('');
    setObjects([]);
    setColors([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/analysis/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFilePath(data.file_path);
        setImageUrl(data.image_url);
        setColors(data.color_palette || []);
        
        // Wait for the automatic description so upload and analysis state do not race.
        await handleRunAction('describe', data.file_path);
      } else {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setResult(`Failed to upload image. ${error.message || 'Please ensure the backend is running.'}`);
      setLoading(false);
    }
  };

  const handleRunAction = async (actionType, pathOverride = '') => {
    const path = pathOverride || filePath;
    if (!path) {
      setResult('Upload an image before starting an analysis.');
      return;
    }

    setActiveAction(actionType);
    setLoading(true);
    setResult('');
    if (actionType !== 'detect') {
      setObjects([]);
    }

    try {
      const endpoint = `${API_BASE}/analysis/${actionType}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: path }),
      });

      if (response.ok) {
        const data = await response.json();
        if (actionType === 'detect') {
          setObjects(data.objects || []);
          setResult(`Detected ${data.objects?.length || 0} objects in the image. Bounding boxes are overlaid in the preview.`);
        } else {
          setResult(data.result || 'The analysis completed without returning text.');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Analysis failed (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error(`Error with ${actionType}:`, error);
      setResult(`The ${actionType} analysis failed. ${error.message || 'Check the backend connection.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.75rem', marginBottom: '20px' }}>Image Analysis</h2>
      
      <div className="analysis-container">
        
        {/* Left Side: Image display and results */}
        <div className="analysis-main-panel">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImageUpload}
            accept=".png,.jpg,.jpeg,.webp"
          />

          {!imageUrl ? (
            <div className="image-dropzone glass-panel" onClick={() => fileInputRef.current?.click()}>
              <Upload size={36} className="text-primary" />
              <h3>Drag & drop your image here</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Supports PNG, JPG, JPEG, WEBP</p>
              <button type="button" className="btn-secondary" style={{ marginTop: '10px' }}>Choose File</button>
            </div>
          ) : (
            <div className="image-preview-wrapper glass-panel">
              <img src={imageUrl} alt="Analyze preview" />
              
              {/* Bounding Boxes overlay */}
              {objects.map((obj, index) => {
                const [xmin, ymin, xmax, ymax] = obj.box;
                return (
                  <div 
                    key={index} 
                    style={{
                      position: 'absolute',
                      border: '2px solid #2563eb',
                      background: 'rgba(37, 99, 235, 0.1)',
                      left: `${xmin / 10}%`,
                      top: `${ymin / 10}%`,
                      width: `${(xmax - xmin) / 10}%`,
                      height: `${(ymax - ymin) / 10}%`,
                      boxShadow: '0 0 8px rgba(37, 99, 235, 0.5)',
                      pointerEvents: 'none'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '-2px',
                      background: '#2563eb',
                      color: 'white',
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {obj.name} ({Math.round(obj.confidence * 100)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {imageUrl && (
            <div className="result-card glass-panel">
              <h3>Analysis Result</h3>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Analyzing image content...</span>
                </div>
              ) : (
                <div className="result-content">{result || "Select an action on the right to start analyzing."}</div>
              )}

              {/* Bounding box list */}
              {objects.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <span className="chips-label">Detected Objects</span>
                  <div className="detected-chips">
                    {objects.map((obj, i) => (
                      <span key={i} className="object-chip">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }}></span>
                        {obj.name} ({Math.round(obj.confidence * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Palette section */}
              {colors.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <span className="chips-label">Color Palette</span>
                  <div className="palette-container">
                    {colors.map((color, i) => (
                      <div 
                        key={i} 
                        className="color-swatch" 
                        style={{ backgroundColor: color }}
                        onClick={() => navigator.clipboard.writeText(color)}
                      >
                        <div className="color-hex">{color}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Actions list */}
        <div className="actions-panel">
          <div className="result-card glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ border: 'none', padding: '0', margin: '0 0 15px 0' }}>Actions</h3>
            
            <div className="actions-list">
              <div 
                className={`action-card ${activeAction === 'describe' ? 'active' : ''}`}
                onClick={() => handleRunAction('describe')}
                style={{ opacity: !filePath ? 0.5 : 1, pointerEvents: !filePath ? 'none' : 'auto' }}
              >
                <div className="action-info">
                  <FileText className="action-icon" size={20} />
                  <div>
                    <div className="action-title">Describe Image</div>
                    <div className="action-desc">Detailed natural language report</div>
                  </div>
                </div>
              </div>

              <div 
                className={`action-card ${activeAction === 'ocr' ? 'active' : ''}`}
                onClick={() => handleRunAction('ocr')}
                style={{ opacity: !filePath ? 0.5 : 1, pointerEvents: !filePath ? 'none' : 'auto' }}
              >
                <div className="action-info">
                  <Type className="action-icon" size={20} />
                  <div>
                    <div className="action-title">Extract Text</div>
                    <div className="action-desc">Retrieve textual components</div>
                  </div>
                </div>
              </div>

              <div 
                className={`action-card ${activeAction === 'detect' ? 'active' : ''}`}
                onClick={() => handleRunAction('detect')}
                style={{ opacity: !filePath ? 0.5 : 1, pointerEvents: !filePath ? 'none' : 'auto' }}
              >
                <div className="action-info">
                  <Eye className="action-icon" size={20} />
                  <div>
                    <div className="action-title">Detect Objects</div>
                    <div className="action-desc">Map components & coordinates</div>
                  </div>
                </div>
              </div>

              <div 
                className={`action-card ${activeAction === 'chart' ? 'active' : ''}`}
                onClick={() => handleRunAction('chart')}
                style={{ opacity: !filePath ? 0.5 : 1, pointerEvents: !filePath ? 'none' : 'auto' }}
              >
                <div className="action-info">
                  <BarChart3 className="action-icon" size={20} />
                  <div>
                    <div className="action-title">Analyze Chart</div>
                    <div className="action-desc">Audit graphs & data tables</div>
                  </div>
                </div>
              </div>

              <div 
                className="action-card"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="action-info">
                  <MoreHorizontal className="action-icon" size={20} />
                  <div>
                    <div className="action-title">Upload New</div>
                    <div className="action-desc">Choose a different file</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
