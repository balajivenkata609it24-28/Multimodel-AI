import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Paperclip, 
  Send, 
  Bot, 
  FileCode, 
  Image as ImageIcon, 
  X, 
  Loader2 
} from 'lucide-react';

const API_BASE = '/api';

const Chat = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/app/chat/chat_demo_session');
    } else {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`${API_BASE}/chats/${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            setMessages(data.messages || []);
          }
        } catch (e) {
          console.error("Failed to fetch messages", e);
        }
      };
      fetchMessages();
    }
  }, [sessionId, navigate]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview({ name: selectedFile.name, size: selectedFile.size });
    }
  };

  const handleRemoveAttachment = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !file) return;

    const userText = input;
    setInput('');
    setLoading(true);

    const formData = new FormData();
    formData.append('content', userText || "Analyze the uploaded file.");
    if (file) {
      formData.append('file', file);
    }

    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userText || "Uploaded file.",
      image_url: file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      document_url: file && !file.type.startsWith('image/') ? file.name : null,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    handleRemoveAttachment();

    try {
      const response = await fetch(`${API_BASE}/chats/${sessionId}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newMsgs = await response.json();

        console.log("Backend response:", newMsgs);

        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, ...newMsgs];
        });
      } else {
        const errorText = await response.text();
        console.error("Backend error:", response.status, errorText);
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Unable to get a response from the backend. ${error.message || 'Please make sure the API server is running.'}`,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-header-title">
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.75rem', fontWeight: '700' }}>AI Assistant</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Upload an image or ask any question</span>
      </div>

      {messages.length === 0 ? (
        <div className="chat-empty">
          <div className="chat-empty-icon">
            <Bot size={32} />
          </div>
          <h2>VLM Assistant</h2>
          <p style={{ maxWidth: '400px', fontSize: '0.9rem' }}>
            Upload an image, document, chart, or ask any question. The Vision Language Model is ready to assist.
          </p>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const hasPrecedingImage = msg.role === 'assistant' && prevMsg && prevMsg.role === 'user' && prevMsg.image_url;
            const precedingImageSrc = hasPrecedingImage ? prevMsg.image_url : null;

            return (
              <div key={msg.id} className={`message-bubble ${msg.role}`}>
                {/* For assistant bubbles, if user uploaded an image in their query, render it here */}
                {hasPrecedingImage && (
                  <div className="message-attachment">
                    <img 
                      src={precedingImageSrc.startsWith('data:') || precedingImageSrc.startsWith('blob:') || precedingImageSrc.startsWith('http') ? precedingImageSrc : `http://127.0.0.1:8001${precedingImageSrc}`} 
                      alt="Attached context" 
                    />
                  </div>
                )}
                
                {/* Documents are displayed in the user bubble */}
                {msg.role === 'user' && msg.document_url && (
                  <div className="message-doc-attachment">
                    <FileCode size={18} className="text-primary" />
                    <span>{msg.document_url.split('/').pop()}</span>
                  </div>
                )}
                
                <div className="result-content">{msg.content}</div>
                <div className="message-meta">
                  {msg.role === 'user' ? 'You' : 'AI Assistant'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="message-bubble assistant">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>AI is processing files and thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <form className="chat-input-area" onSubmit={handleSend}>
        {filePreview && (
          <div className="attachment-preview-container">
            {typeof filePreview === 'string' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={16} />
                <span>Image attached</span>
                <img src={filePreview} alt="Thumbnail" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={16} />
                <span>{filePreview.name} ({(filePreview.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
            <button type="button" className="btn-remove-attachment" onClick={handleRemoveAttachment}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="chat-input-row">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }}
            accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt"
          />
          <button 
            type="button" 
            className="chat-action-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
          
          <textarea 
            className="chat-input"
            rows="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type your message..."
          />

          <button type="submit" className="btn-send" disabled={loading}>
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
