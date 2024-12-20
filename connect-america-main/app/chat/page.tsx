'use client';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Search } from 'lucide-react';

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

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement> | { preventDefault: () => void }) => {
    if (e) {
      e.preventDefault();
    }
    const messageToSend = inputValue.trim();
    
    if (messageToSend) {
      setError(null);
      setLoading(true);
      
      const userMessage: Message = { role: 'user', content: messageToSend };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');

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
    
    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);

    try {
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

  const References = ({ urls }: { urls: Array<{ url: string; content: string }> }) => {
    if (!urls || urls.length === 0) return null;

    return (
      <div className="flex flex-col gap-4 p-4 relative z-10 bg-transparent">
        <h2 className="text-xl font-semibold text-gray-800 bg-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Referenced Documents
        </h2>
        <div className="flex flex-col gap-3">
          {urls.map(({ url }, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors bg-white shadow-sm hover:shadow-md">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700 font-semibold">#{index + 1}</span>
                  <h3 className="text-gray-900 text-lg font-medium">
                    {getDocumentTitle(url)}
                  </h3>
                </div>
                <p className="text-gray-500 mb-6">How can I assist you today?</p>
                {!questionsLoading && questions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
                    {questions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuestionClick(question.question_text)}
                        className="p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 bg-white text-sm text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        {question.question_text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === 'assistant'
                  ? 'bg-white shadow-sm rounded-lg p-4'
                  : 'bg-blue-50 rounded-lg p-4'
              }`}
            >
              <div className="prose max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              {message.urls && <References urls={message.urls} />}
              {message.role === 'assistant' && !message.isExpanded && (
                <button
                  onClick={() => handleExpandConversation(message, index)}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  disabled={loading}
                >
                  {loading ? 'Expanding...' : 'Expand response'}
                </button>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area with External Search Button */}
        <div className="bg-white border-t p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} ref={formRef} className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                updateTextareaHeight(e.target);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Type your message here..."
              style={{ height: textareaHeight }}
              className="flex-1 resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#0A0F5C] text-white rounded-lg hover:bg-[#1a2070] transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <Search size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}text-sm text-gray-500 mt-1">
                  {url.includes('.pdf') ? 'PDF Document' : 
                   url.includes('.doc') ? 'Word Document' : 
                   'Document'}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <a 
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-1 sm:flex-initial justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </a>
                <button 
                  onClick={() => handleDownload(url)}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors flex-1 sm:flex-initial justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questions');
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || 
            `Failed to fetch questions (Status: ${response.status})`
          );
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format: expected an array of questions');
        }
        setQuestions(data);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load suggested questions');
        setQuestions([]); // Set empty array on error
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
          <div className="mb-8 hidden lg:block">
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full lg:w-auto">
        {/* Add Document Button */}
        <div className="bg-white p-4 border-b shadow-sm">
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-[#0A0F5C] text-white rounded-md hover:bg-[#1a2070] transition-colors"
            onClick={() => window.location.href = '/documents'}
          >
            <FileText size={20} />
            <span>Documents</span>
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block bg-white py-4 px-6">
          <h2 className="text-lg font-semibold text-gray-800">Chat Assistant</h2>
          <p className="text-sm text-gray-500">Ask me anything about Connect America</p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 bg-gray-50 overflow-y-auto px-2 sm:px-4 pt-14 lg:pt-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Welcome to Connect America Support
                </h3>
                <p className="text-gray-500 mb-6">How can I assist you today?</p>
                {!questionsLoading && questions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
                    {questions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuestionClick(question.question_text)}
                        className="p-3 text-left rounded-lg border border-gray-200 hover:border-blue-500 bg-white text-sm text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        {question.question_text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === 'assistant'
                  ? 'bg-white shadow-sm rounded-lg p-4'
                  : 'bg-blue-50 rounded-lg p-4'
              }`}
            >
              <div className="prose max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              {message.urls && <References urls={message.urls} />}
              {message.role === 'assistant' && !message.isExpanded && (
                <button
                  onClick={() => handleExpandConversation(message, index)}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  disabled={loading}
                >
                  {loading ? 'Expanding...' : 'Expand response'}
                </button>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area with External Search Button */}
        <div className="bg-white border-t p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} ref={formRef} className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                updateTextareaHeight(e.target);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Type your message here..."
              style={{ height: textareaHeight }}
              className="flex-1 resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#0A0F5C] text-white rounded-lg hover:bg-[#1a2070] transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <Search size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
