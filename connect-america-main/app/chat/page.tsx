'use client';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  urls?: Array<{ url: string; content: string }>;
  isExpanded?: boolean;
}

interface Question {
  question_text: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textareaHeight, setTextareaHeight] = useState('60px');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getDocumentTitle = (url: string) => {
    const filename = url.split('/').pop() || '';
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\.[^/.]+$/, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleDownload = async (url: string) => {
    let downloadUrl: string | undefined;
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      downloadUrl = window.URL.createObjectURL(blob);
      const filename = url.split('/').pop() || 'document';

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Failed to download the file. Please try again.');
    } finally {
      if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
    }
  };

  const sendMessageToAPI = async (message: string, isExpanded: boolean = false) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          is_expanded: isExpanded 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      return {
        ...data,
        isExpanded
      };
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const handleExpandConversation = async (message: Message, index: number) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const expandedResponse = await sendMessageToAPI(message.content, true);
      setMessages(prevMessages => 
        prevMessages.map((msg, i) => 
          i === index ? { ...expandedResponse, isExpanded: true } : msg
        )
      );
    } catch (err) {
      console.error('Expansion Error:', err);
      setError('Failed to expand response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }
    const messageToSend = inputValue.trim();
    
    if (messageToSend && !loading) {
      setError(null);
      setLoading(true);
      
      const userMessage: Message = { role: 'user', content: messageToSend };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      
      if (textareaRef.current) {
        updateTextareaHeight(textareaRef.current);
      }

      try {
        const aiResponse = await sendMessageToAPI(messageToSend, false);
        setMessages(prev => [...prev, { ...aiResponse, isExpanded: false }]);
      } catch (err: unknown) {
        console.error('Chat Error:', err);
        setError('Failed to get response. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleQuestionClick = async (question: string) => {
    if (loading) return;
    
    setError(null);
    setLoading(true);
    
    // Add user's question to messages immediately
    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get AI response directly
      const aiResponse = await sendMessageToAPI(question, false);
      setMessages(prev => [...prev, { ...aiResponse, isExpanded: false }]);
    } catch (err) {
      console.error('FAQ Question Error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateTextareaHeight = (element: HTMLTextAreaElement) => {
    const minHeight = 60;
    const maxHeight = 150;
    
    element.style.height = 'auto';
    const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight);
    element.style.height = `${newHeight}px`;
    setTextareaHeight(`${newHeight}px`);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      updateTextareaHeight(textareaRef.current);
    }
  }, []);

  // ... [Previous components and effects remain the same] ...

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Same as before */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:relative
        w-64 h-full
        bg-[#0A0F5C] text-white
        transition-transform duration-300 ease-in-out
        z-40 lg:z-auto
      `}>
        {/* Sidebar content */}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full lg:w-auto">
        {/* Previous sections remain the same */}
        
        {/* Modified Input Area */}
        <div className="bg-[#F0F2FF] sticky bottom-0 z-10 p-4">
          <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className="flex gap-3 items-start max-w-5xl mx-auto"
          >
            <div className="flex-1">
              <textarea 
                ref={textareaRef}
                className="w-full bg-[#F5F7FF] focus:bg-white
                  text-gray-800 text-base font-medium 
                  placeholder-gray-400
                  border border-gray-200
                  rounded-lg
                  outline-none resize-none 
                  py-3 px-4
                  overflow-auto transition-all duration-200
                  focus:ring-2 focus:ring-blue-500
                  focus:border-transparent
                  cursor-text
                  leading-normal"
                style={{
                  height: textareaHeight,
                  maxHeight: '150px',
                  minHeight: '60px',
                }}
                placeholder="Type your message here..."
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  e.preventDefault();
                  const target = e.target;
                  setInputValue(target.value);
                  updateTextareaHeight(target);
                }}
                onFocus={(e) => {
                  updateTextareaHeight(e.target);
                }}
                onClick={(e) => {
                  e.currentTarget.focus();
                }}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim()) {
                      formRef.current?.requestSubmit();
                    }
                  }
                }}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-[#0A0F5C] text-white 
                px-6 py-3
                rounded-lg hover:bg-blue-900 
                transition-colors 
                disabled:opacity-50 
                disabled:cursor-not-allowed
                flex items-center gap-2
                min-w-[120px]
                justify-center
                self-stretch"
            >
              {loading ? (
                <>
                  <span className="animate-spin text-xl">⟳</span>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
