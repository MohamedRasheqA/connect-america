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

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questions');
        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }
        const data = await response.json();
        setQuestions(data);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to load suggested questions');
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:relative
        w-64 h-full
        bg-[#0A0F5C] text-white
        transition-transform duration-300 ease-in-out
        z-40 lg:z-auto
      `}>
        <div className="p-4 flex flex-col h-full">
          <div className="mb-8">
            <h1 className="text-xl font-bold">ConnectAmerica</h1>
            <p className="text-sm text-gray-300 mt-2">AI Support Assistant</p>
          </div>
          
          <nav className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-teal-400">💬</span>
              <span className="text-teal-400 font-semibold">Recent Chats</span>
            </div>
            
            <div className="space-y-2">
              {messages.length > 0 ? (
                messages
                  .filter(msg => msg.role === 'user')
                  .slice(-5)
                  .map((msg, idx) => (
                    <div key={idx} className="p-2 rounded hover:bg-blue-900 cursor-pointer truncate text-sm">
                      {msg.content}
                    </div>
                  ))
              ) : (
                <div className="text-gray-400 text-sm">No recent chats</div>
              )}
            </div>
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer">
              <span>⚙️</span>
              <span>Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 border-b shadow-sm">
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-[#0A0F5C] text-white rounded-md hover:bg-[#1a2070] transition-colors"
            onClick={() => window.location.href = '/documents'}
          >
            <FileText size={20} />
            <span>Documents</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {messages.length === 0 && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Welcome to Connect America Support</h2>
                <p className="text-gray-600 mt-2">How can I help you today?</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {questionsLoading ? (
                    Array(6).fill(null).map((_, i) => (
                      <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-lg"/>
                    ))
                  ) : (
                    questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuestionClick(q.question_text)}
                        disabled={loading}
                        className="text-left p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                      >
                        {q.question_text}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`max-w-4xl mx-auto mb-4 p-4 rounded-lg ${
                message.role === 'assistant' ? 'bg-white' : 'bg-blue-50'
              }`}
            >
              <div className="mb-2 text-sm font-medium text-gray-600">
                {message.role === 'assistant' ? 'AI Assistant' : 'You'}
              </div>
              <div className="prose">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div className="max-w-4xl mx-auto p-4">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="animate-spin">⟳</span>
                <span>Processing...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-4">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  updateTextareaHeight(e.target);
                }}
                placeholder="Type your message here..."
                className="w-full border rounded-lg p-3 min-h-[60px] max-h-[150px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim()) {
                      handleSubmit();
                    }
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-[#0A0F5C] text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span>
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

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
