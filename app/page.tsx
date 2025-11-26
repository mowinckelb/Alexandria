'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Test UUID until auth is implemented
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export default function Alexandria() {
  const [mode, setMode] = useState<'carbon' | 'ghost'>('carbon');
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [ghostMessages, setGhostMessages] = useState<Message[]>([]);
  const [inputMessages, setInputMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [outputContent, setOutputContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    setSessionId(uuidv4()); 
    // Auto-focus input on load
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [ghostMessages.length, inputMessages.length, isProcessing, outputContent]);

  const showStatus = (message: string, isThinking = false) => {
    if (isThinking) {
      setStatusMessage('thinking');
    } else {
      setStatusMessage(message);
    }
  };

  const clearStatus = () => {
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMode(mode === 'carbon' ? 'ghost' : 'carbon');
    }
  };

  const shakeInput = () => {
    const input = inputRef.current;
    if (input) {
      input.classList.add('animate-shake');
      setTimeout(() => input.classList.remove('animate-shake'), 500);
    }
  };

  const handleSubmit = async () => {
    const text = inputValue.trim();
    if (!text) return;

    // Prevent double submission
    if (isProcessing) {
      shakeInput();
      return;
    }

    setInputValue('');
    setIsProcessing(true);

    try {
      if (mode === 'carbon') {
        await handleCarbon(text);
      } else {
        await handleGhost(text);
      }
    } finally {
      setIsProcessing(false);
      // Only refocus on desktop to avoid triggering mobile keyboard
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        inputRef.current?.focus();
      }
    }
  };

  const handleCarbon = async (text: string) => {
    try {
      setOutputContent('');
      
      // Delay thinking indicator slightly
      setTimeout(() => {
        if (isProcessing) showStatus('', true);
      }, 500);

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: text
      };

      const newMessages = [...inputMessages, userMessage];
      setInputMessages(newMessages);

      const response = await fetch('/api/input-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId: TEST_USER_ID
        })
      });

      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();

      // Clear status when streaming starts
      setStatusMessage('');

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // Add to input messages history
      setInputMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent 
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');

    } catch (error) {
      setStatusMessage('');
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };

  const handleGhost = async (query: string) => {
    try {
      setOutputContent('');
      
      // Delay thinking indicator slightly
      setTimeout(() => {
        if (isProcessing) showStatus('', true);
      }, 500);

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query
      };

      const newMessages = [...ghostMessages, userMessage];
      setGhostMessages(newMessages);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId: TEST_USER_ID,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();

      // Clear status when streaming starts
      setStatusMessage('');

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // Add to ghost messages history
      setGhostMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent 
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');

    } catch (error) {
      setStatusMessage('');
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] text-[#3a3a3a]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-center p-6 opacity-55 text-[0.85rem] z-50 bg-[#fafafa]">
        <div className="flex flex-col items-center gap-1">
          <span>alexandria.</span>
          <span className="text-[0.75rem] italic opacity-80">immortalise the greats</span>
        </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 px-8 pt-24 pb-8 overflow-y-auto">
        <div className="max-w-[700px] mx-auto space-y-6">
          {(mode === 'ghost' ? ghostMessages : inputMessages).map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-[#e8e8e8] text-[#3a3a3a]'
                    : 'bg-[#f4f4f4] text-[#4a4a4a]'
                }`}
              >
                <div className="text-[0.8rem] leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {/* Thinking indicator */}
          {isProcessing && !outputContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[#f4f4f4] text-[#4a4a4a]">
                <div className="text-[0.8rem] leading-relaxed">
                  <span className="animate-pulse">thinking</span>
                </div>
              </div>
            </div>
          )}
          {/* Streaming content */}
          {outputContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[#f4f4f4] text-[#4a4a4a]">
                <div className="text-[0.8rem] leading-relaxed whitespace-pre-wrap">
                  {outputContent}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 pb-8">
        <div className="max-w-[700px] mx-auto">
          {/* Mode Toggle */}
          <div className="flex justify-start items-center mb-3 px-2">
            <div className="relative bg-[#3a3a3a]/[0.06] rounded-lg p-[2px] inline-flex">
              <button
                onClick={() => setMode('carbon')}
                className={`relative z-10 bg-transparent border-none px-3.5 py-1 text-[0.75rem] transition-colors cursor-pointer ${
                  mode === 'carbon' ? 'text-[#3a3a3a]' : 'text-[#888]'
                }`}
              >
                input
              </button>
              <button
                onClick={() => setMode('ghost')}
                className={`relative z-10 bg-transparent border-none px-3.5 py-1 text-[0.75rem] transition-colors cursor-pointer ${
                  mode === 'ghost' ? 'text-[#3a3a3a]' : 'text-[#888]'
                }`}
              >
                output
              </button>
              <div
                className={`absolute top-[2px] left-[2px] w-[calc(50%-2px)] h-[calc(100%-4px)] bg-white/55 backdrop-blur-[10px] rounded-md shadow-sm transition-transform duration-300 ease-out ${
                  mode === 'ghost' ? 'translate-x-full' : ''
                }`}
              />
            </div>
          </div>

          {/* Input Container */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              autoComplete="off"
              spellCheck="false"
              className="w-full bg-[#f4f4f4] border-none rounded-2xl text-[#3a3a3a] text-[0.9rem] px-5 py-4 pr-[60px] outline-none transition-colors shadow-md caret-[#3a3a3a]/40 focus:bg-[#efefef]"
            />
            <button
              onClick={handleSubmit}
              className="absolute right-4 top-1/2 -translate-y-1/2 scale-y-[0.8] bg-transparent border-none rounded-md text-[#ccc] text-[1.2rem] cursor-pointer px-2 py-1 transition-colors hover:text-[#999] focus:text-[#999] focus:shadow-[0_0_0_2px_rgba(58,58,58,0.1)]"
            >
              →
            </button>
          </div>

          {/* Status Message */}
          <div className="text-[0.75rem] mt-3 text-left pl-5 h-4 text-[#999]">
            {statusMessage && (
              <span className={statusMessage === 'thinking' ? 'inline-block animate-pulse' : ''}>
                {statusMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }

        .animate-shake {
          animation: shake 0.2s ease-in-out;
        }

        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(58, 58, 58, 0.15);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(58, 58, 58, 0.25);
        }

        input::-webkit-input-placeholder {
          color: #999;
        }

        @supports (caret-width: 2px) {
          input {
            caret-width: 2px;
          }
        }
      `}</style>
    </div>
  );
}
