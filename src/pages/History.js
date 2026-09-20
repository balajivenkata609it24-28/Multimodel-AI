import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Trash2, 
  MessageSquare, 
  Calendar,
  Loader2 
} from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/chats');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;

    try {
      const response = await fetch(`http://localhost:8000/api/chats/${sessionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  // Perform search and dropdown filtering
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Custom logic to identify image/document chats based on model title or history
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'chats') {
      return matchesSearch && !session.title.toLowerCase().includes('dog') && !session.title.toLowerCase().includes('chart') && !session.title.toLowerCase().includes('doc');
    }
    if (filterType === 'images') {
      return matchesSearch && (session.title.toLowerCase().includes('dog') || session.title.toLowerCase().includes('chart') || session.title.toLowerCase().includes('image') || session.title.toLowerCase().includes('landscape'));
    }
    if (filterType === 'docs') {
      return matchesSearch && (session.title.toLowerCase().includes('doc') || session.title.toLowerCase().includes('pdf') || session.title.toLowerCase().includes('text') || session.title.toLowerCase().includes('report'));
    }
    return matchesSearch;
  });

  return (
    <div className="history-container">
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.75rem', marginBottom: '20px' }}>History</h2>

      <div className="history-search-row">
        <div className="search-input-wrapper">
          <Search size={18} className="text-dark" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search your history..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          className="history-filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All</option>
          <option value="chats">Chats</option>
          <option value="images">Images</option>
          <option value="docs">Docs</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={32} className="animate-spin text-primary" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {searchQuery ? "No history logs match your search term." : "No saved history items in this category."}
        </div>
      ) : (
        <div className="history-list">
          {filteredSessions.map((session) => (
            <div 
              key={session.id} 
              className="history-card glass-panel"
              onClick={() => navigate(`/app/chat/${session.id}`)}
            >
              <div className="history-info">
                <div className="history-thumbnail">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className="history-title">{session.title}</div>
                  <div className="history-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={12} />
                    <span>{new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <button 
                className="btn-delete-history"
                onClick={(e) => handleDelete(e, session.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
