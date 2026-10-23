'use client';

import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  X,
  Sparkles,
  Trash2,
  User,
  Bot,
  Paperclip,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import type { ChatMessage, SavedChat } from '@/types';

// We polyfill uuid on client with crypto.randomUUID
function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

const STARTER_PROMPTS = [
  'How do I record a new business order?',
  'What languages does Taskora support?',
  'میری مدد کریں ایک نئی انٹری بنانے میں',
  'Mujhe batao ke kaise record save hota hai?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am **Taskora AI**, your intelligent business assistant. I can help you manage records, answer questions about your business, and analyze images with text. I speak English, Urdu, and Roman Urdu!\n\nYou can also send me photos of invoices, receipts, or handwritten notes and I\'ll extract the business information for you.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [loadingChats, setLoadingChats] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetch('/api/chats').then(response => response.json()).then(data => {
      if (data.success) setChats(data.data);
    }).catch(() => setError('Could not load saved chats.')).finally(() => setLoadingChats(false));
  }, []);

  async function persistChat(nextMessages: ChatMessage[], chatId = activeChatId) {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId, messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Save failed');
      setActiveChatId(data.data.id);
      setChats(previous => [data.data, ...previous.filter(chat => chat.id !== data.data.id)]);
    } catch {
      setError('Chat could not be saved. Check that the app can write to its data folder.');
    }
  }

  async function openChat(id: string) {
    const response = await fetch(`/api/chats/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok || !data.success) { setError('Could not open this saved chat.'); return; }
    setActiveChatId(id);
    setMessages(data.data.messages);
    setError('');
  }

  function newChat() {
    setActiveChatId(undefined);
    setMessages([{ id: 'welcome', role: 'assistant', content: 'Hello! I am **Taskora AI**, your intelligent business assistant. I can help you manage records, answer questions about your business, and analyze images with text. I speak English, Urdu, and Roman Urdu!\n\nYou can also send me photos of invoices, receipts, or handwritten notes and I\'ll extract the business information for you.', timestamp: new Date().toISOString() }]);
    setError('');
  }

  async function removeChat(id: string) {
    const response = await fetch(`/api/chats?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok || !data.success) { setError('Could not delete this chat.'); return; }
    setChats(previous => previous.filter(chat => chat.id !== id));
    if (activeChatId === id) newChat();
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow images
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extract base64 from data URL
      const base64 = dataUrl.split(',')[1];
      setImagePreview({ url: dataUrl, base64, mimeType: file.type });
      setError('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function removeImage() {
    setImagePreview(null);
  }

  async function sendMessage(text?: string) {
    const msgText = (text ?? input).trim();
    if (!msgText && !imagePreview) return;
    if (sending) return;

    const userMsg: ChatMessage = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      role: 'user',
      content: msgText,
      timestamp: new Date().toISOString(),
      imageUrl: imagePreview?.url,
    };

    const messagesWithUser = [...messages, { ...userMsg, imageUrl: undefined }];
    setMessages(messagesWithUser);
    void persistChat(messagesWithUser);
    setInput('');
    setImagePreview(null);
    setSending(true);
    setError('');

    // Build history (exclude welcome message)
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const body: Record<string, unknown> = {
        message: msgText || '(user sent an image)',
        history,
      };
      if (imagePreview) {
        body.imageBase64 = imagePreview.base64;
        body.imageMimeType = imagePreview.mimeType;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: genId(),
          role: 'assistant',
          content: data.data.reply,
          timestamp: new Date().toISOString(),
        };
        const completeMessages = [...messagesWithUser, assistantMsg];
        setMessages(completeMessages);
        void persistChat(completeMessages);
      } else {
        setError(data.details ?? data.error ?? 'Failed to get response.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    if (activeChatId) void removeChat(activeChatId);
    else newChat();
  }

  // Simple markdown-like rendering
  function renderContent(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)', gap: '1.25rem' }}>
      <aside style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        <button className="btn btn-primary btn-sm" onClick={newChat} style={{ width: '100%', justifyContent: 'center' }}><Plus size={15} /> New chat</button>
        <div style={{ margin: '1rem 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Saved chats</div>
        {loadingChats && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading…</div>}
        {!loadingChats && chats.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Your conversations will appear here.</div>}
        {chats.map(chat => <div key={chat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => void openChat(chat.id)} title={chat.title} style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: activeChatId === chat.id ? 'var(--primary)' : undefined }}>{chat.title}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => void removeChat(chat.id)} aria-label={`Delete ${chat.title}`} title="Delete chat"><X size={14} /></button>
        </div>)}
      </aside>
      <section style={{ minWidth: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Chat in English, Urdu, or Roman Urdu · Send images for analysis</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={clearChat}>
          <Trash2 size={14} />
          Clear Chat
        </button>
      </div>
      </section>
      </div>

      <div
        className="page-body"
        style={{ display: 'flex', flexDirection: 'column', gap: '0', height: 'calc(100vh - 80px)', paddingBottom: '0' }}
      >
        {/* Chat messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Starter prompts (show only if only welcome message) */}
          {messages.length === 1 && (
            <div style={{ padding: '0 0 1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.625rem', fontWeight: 500 }}>
                💡 Try asking:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    className="btn btn-sm btn-secondary"
                    onClick={() => sendMessage(p)}
                    style={{ textAlign: 'left', whiteSpace: 'normal', height: 'auto', padding: '0.5rem 0.75rem' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
              className="fade-in"
            >
              {/* Avatar */}
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  background: msg.role === 'user' ? 'var(--primary)' : '#18181B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {msg.role === 'user' ? <User size={14} color="#fff" /> : <Sparkles size={14} color="#A78BFA" />}
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Uploaded"
                    style={{
                      maxWidth: '240px',
                      maxHeight: '180px',
                      borderRadius: 'var(--radius)',
                      objectFit: 'cover',
                      border: '1px solid var(--border)',
                    }}
                  />
                )}
                {msg.content && (
                  <div
                    className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                  />
                )}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="fade-in">
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={14} color="#A78BFA" />
              </div>
              <div className="chat-bubble chat-bubble-assistant" style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <div className="spinner spinner-sm" />
                <span style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error fade-in">
              <AlertCircle size={16} />
              <div>
                {error}
                <button className="btn btn-sm btn-ghost" style={{ marginLeft: '0.5rem' }} onClick={() => setError('')}>
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.875rem',
            marginTop: 'auto',
            marginBottom: '1.5rem',
          }}
        >
          {/* Image preview */}
          {imagePreview && (
            <div style={{ marginBottom: '0.75rem', position: 'relative', display: 'inline-block' }}>
              <img
                src={imagePreview.url}
                alt="Preview"
                style={{
                  height: '80px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  objectFit: 'cover',
                }}
              />
              <button
                onClick={removeImage}
                style={{
                  position: 'absolute',
                  top: '-0.375rem',
                  right: '-0.375rem',
                  width: '1.25rem',
                  height: '1.25rem',
                  background: 'var(--error)',
                  border: 'none',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Remove image"
              >
                <X size={10} color="#fff" />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: '0.125rem' }}
              title="Upload image"
              aria-label="Upload image"
            >
              <ImageIcon size={16} />
            </button>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              className="form-input"
              style={{
                flex: 1,
                minHeight: '42px',
                maxHeight: '160px',
                resize: 'none',
                overflowY: 'auto',
                border: 'none',
                boxShadow: 'none',
                padding: '0.5rem 0',
                fontSize: '0.9rem',
                outline: 'none',
              }}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              rows={1}
            />

            {/* Send button */}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => sendMessage()}
              disabled={sending || (!input.trim() && !imagePreview)}
              style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: '0.125rem' }}
              aria-label="Send message"
            >
              {sending ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : <Send size={16} />}
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            📷 You can upload invoice/receipt images · Supports English, Urdu, Roman Urdu
          </div>
        </div>
      </div>
    </>
  );
}
