import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Send,
  Loader2,
  FileCode,
  Network
} from 'lucide-react';

const API_BASE = '/api';

const UploadDoc = () => {
  const [docFile, setDocFile] = useState(null);
  const [filePath, setFilePath] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);

  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState([]);

  const fileInputRef = useRef(null);
  const qaEndRef = useRef(null);

  // Create one chat session for this dashboard page.
  const [chatId] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `dashboard-${crypto.randomUUID()}`;
    }

    return `dashboard-${Date.now()}`;
  });

  useEffect(() => {
    qaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaHistory]);

  /*
   * Create/reuse the backend chat session.
   */
  const ensureChatSession = async () => {
    const response = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: chatId,
        title: fileName
          ? `Document Chat - ${fileName}`
          : 'Document Chat',
      }),
    });

    if (!response.ok) {
      let message = 'Failed to create chat session.';

      try {
        const errorData = await response.json();
        message = errorData.detail || message;
      } catch {
        // Keep default error message.
      }

      throw new Error(message);
    }

    return response.json();
  };

  /*
   * Send a question and the selected file to the backend.
   *
   * The backend expects:
   *   content = question
   *   file    = uploaded document
   *
   * The file is intentionally sent with every question because
   * the current backend processes the document from the uploaded
   * file for each message.
   */
  const sendToBackend = async (activeQuestion) => {
    if (!docFile) {
      throw new Error('Please upload a document first.');
    }

    await ensureChatSession();

    const formData = new FormData();
    formData.append('content', activeQuestion);
    formData.append('file', docFile);

    const response = await fetch(
      `${API_BASE}/chats/${encodeURIComponent(chatId)}/messages`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      let message = 'Failed to process the document.';

      try {
        const errorData = await response.json();
        message = errorData.detail || message;
      } catch {
        // Keep default error message.
      }

      throw new Error(message);
    }

    return response.json();
  };

  /* Upload the document through the dedicated upload endpoint. */
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setDocFile(file);
    setFileName(file.name);
    setFilePath(file.name);
    setLoading(true);
    setPreviewText('');
    setQaHistory([]);
    setQuestion('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let message = 'Failed to upload the document.';
        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          // Keep the default message when the server does not return JSON.
        }
        throw new Error(message);
      }

      const data = await response.json();
      setFilePath(data.file_path || file.name);
      setPreviewText(
        data.preview ||
        data.extracted_text ||
        'The document was uploaded, but no readable text was returned.'
      );
      setQaHistory([]);
    } catch (error) {
      console.error('Error uploading document:', error);

      setPreviewText(
        `Failed to upload and process the document.\n\nError: ${
          error.message || 'Unknown error'
        }` 
      );

      setFilePath('');
    } finally {
      setLoading(false);

      // Allow selecting the same file again later.
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /*
   * Ask a question about the currently selected document.
   */
  const handleAskQuestion = async (qText) => {
    const activeQuestion = (qText || question).trim();

    if (!activeQuestion || !docFile) {
      return;
    }

    setQuestion('');
    setQueryLoading(true);

    // Show user's question immediately.
    setQaHistory((prev) => [
      ...prev,
      {
        role: 'user',
        content: activeQuestion,
      },
    ]);

    try {
      const data = await sendToBackend(activeQuestion);

      const assistantMessage =
        Array.isArray(data)
          ? data.find((message) => message.role === 'assistant')
          : null;

      if (!assistantMessage?.content) {
        throw new Error('The backend returned an empty answer.');
      }

      setQaHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage.content,
        },
      ]);
    } catch (error) {
      console.error('Error querying document:', error);

      setQaHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            `Sorry, I could not process that question.\n\n` +
            `${error.message || 'Please check that the backend is running.'}`,
        },
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  const clearFile = () => {
    setDocFile(null);
    setFilePath('');
    setFileName('');
    setPreviewText('');
    setQaHistory([]);
    setQuestion('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const suggestions = [
    'What is this document about?',
    'Summarize this document',
    'Extract all the text',
    'What are the key points?',
  ];

  return (
    <div style={{ width: '100%' }}>
      <h2
        style={{
          fontFamily: 'var(--font-title)',
          fontSize: '1.75rem',
          marginBottom: '20px',
        }}
      >
        Upload Document
      </h2>

      <div className="doc-grid">

        {/* LEFT COLUMN */}
        <div className="doc-upload-side">

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleDocUpload}
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
          />

          {!filePath ? (
            <div
              className="image-dropzone glass-panel"
              style={{ padding: '50px 20px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                size={32}
                className="text-primary"
              />

              <h3>Drag & drop your document here</h3>

              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                }}
              >
                Supports: PDF, JPG, PNG, DOCX, TXT
              </p>

              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: '10px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose File
              </button>
            </div>
          ) : (
            <div
              className="glass-panel"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '15px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: 0,
                }}
              >
                <FileCode
                  size={18}
                  className="text-primary"
                />

                <span
                  style={{
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {fileName}
                </span>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  flexShrink: 0,
                }}
                onClick={clearFile}
              >
                Clear File
              </button>
            </div>
          )}

          {/* ASK QUESTIONS */}
          <div
            className="result-card glass-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <h3
              style={{
                border: 'none',
                padding: '0',
                margin: '0',
                fontSize: '1rem',
              }}
            >
              Ask Questions About This Document
            </h3>

            {filePath && (
              <div className="suggestion-chips">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="chip-btn"
                    onClick={() =>
                      handleAskQuestion(suggestion)
                    }
                    disabled={queryLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* QA MESSAGE PANEL */}
            <div
              style={{
                height: '180px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                background: 'rgba(8, 11, 17, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {qaHistory.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-dark)',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                  }}
                >
                  {!filePath
                    ? 'Upload a document to start asking questions.'
                    : 'Ask a custom question below or click a suggestion chip.'}
                </div>
              ) : (
                qaHistory.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      alignSelf:
                        item.role === 'user'
                          ? 'flex-end'
                          : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div
                      style={{
                        background:
                          item.role === 'user'
                            ? 'var(--chat-user)'
                            : 'rgba(255, 255, 255, 0.05)',
                        border:
                          item.role === 'user'
                            ? 'none'
                            : '1px solid var(--border-color)',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        lineHeight: '1.4',
                        color: 'white',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.content}
                    </div>
                  </div>
                ))
              )}

              {queryLoading && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  <Loader2
                    size={10}
                    className="animate-spin text-primary"
                    style={{
                      animation: 'spin 1s linear infinite',
                    }}
                  />

                  <span>
                    Analyzing document content...
                  </span>
                </div>
              )}

              <div ref={qaEndRef} />
            </div>

            {/* QUESTION INPUT */}
            <form
              style={{
                display: 'flex',
                gap: '10px',
              }}
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
            >
              <input
                type="text"
                value={question}
                onChange={(e) =>
                  setQuestion(e.target.value)
                }
                placeholder={
                  filePath
                    ? 'Ask a custom question...'
                    : 'Please upload a file first...'
                }
                style={{
                  flexGrow: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'white',
                  outline: 'none',
                  fontSize: '0.85rem',
                }}
                disabled={!filePath || queryLoading}
              />

              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                }}
                disabled={
                  !filePath ||
                  !question.trim() ||
                  queryLoading
                }
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="doc-preview-panel">

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <FileText
              size={18}
              className="text-primary"
            />

            <span
              style={{
                fontWeight: '600',
                fontSize: '0.95rem',
              }}
            >
              Document Preview
            </span>
          </div>

          {loading ? (
            <div
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexGrow: 1,
                minHeight: '420px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Loader2
                  size={28}
                  className="animate-spin text-primary"
                  style={{
                    animation: 'spin 1s linear infinite',
                  }}
                />

                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  Processing document...
                </span>
              </div>
            </div>
          ) : (
            <div className="document-sheet">

              <div>
                <h3>
                  {fileName ||
                    'Artificial Intelligence in Everyday Life'}
                </h3>

                <div className="document-sheet-body">
                  {previewText || (
                    <>
                      The usage of Artificial Intelligence
                      (AI) has become an integral part of
                      modern society. From recommendation
                      algorithms that suggest your next movie
                      to natural language models that help
                      draft emails, AI operates silently in
                      the background of our daily digital
                      lives.

                      {'\n\n'}

                      Large Language Models (LLMs) and Vision
                      Models are now transforming fields like
                      healthcare, education, and software
                      development, enabling machines to
                      understand both text and visuals
                      contextually.

                      {'\n\n'}

                      Select a file to display its processed
                      contents.
                    </>
                  )}
                </div>
              </div>

              <div className="document-sheet-footer">
                <div className="document-sheet-graphic">
                  <Network size={36} />
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UploadDoc;