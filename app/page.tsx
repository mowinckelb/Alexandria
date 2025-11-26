'use client';
import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowUp, BookOpen, Sparkles, Database } from 'lucide-react';

export default function Alexandria() {
  const [activeTab, setActiveTab] = useState<'input' | 'chat'>('input');
  const [textInput, setTextInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use AI SDK's useChat hook for proper streaming support
  // Using a fixed test UUID until auth is implemented
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
  
  const { messages, input, setInput, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: {
      userId: TEST_USER_ID,
      sessionId
    }
  });

  useEffect(() => { setSessionId(uuidv4()); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleIngest = async () => {
    if (!textInput) return;
    const response = await fetch('/api/ingest', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textInput, userId: TEST_USER_ID }) 
    });
    const result = await response.json();
    setTextInput('');
    alert(result.message || "Carbon ingested. Ghost is evolving.");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans">
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md border border-white/20 shadow-sm rounded-full p-1 flex gap-1">
        <button onClick={() => setActiveTab('input')} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'input' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
          <BookOpen size={16} /> Carbon
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Sparkles size={16} /> Ghost
        </button>
      </nav>

      <main className="max-w-2xl mx-auto pt-32 px-6 pb-20">
        {activeTab === 'input' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-4xl font-semibold tracking-tight text-center mb-10 text-gray-900">Feed the Ghost.</h1>
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-2">
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Write your thoughts..." className="w-full h-80 p-6 bg-transparent border-none resize-none focus:ring-0 text-lg leading-relaxed placeholder:text-gray-300 text-gray-800" />
            </div>
            <div className="flex justify-center mt-8">
              <button onClick={handleIngest} className="bg-[#0071E3] hover:bg-[#0077ED] text-white px-8 py-3.5 rounded-full font-medium transition-all shadow-lg shadow-blue-500/20">Sync Memory</button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-[75vh]">
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-6 scrollbar-hide">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                  Error: {error.message}
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] relative px-5 py-3 shadow-sm ${m.role === 'user' ? 'bg-[#0071E3] text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'}`}>
                    {m.toolInvocations?.map((tool) => (
                      <div key={tool.toolCallId} className="mb-2 text-xs flex items-center gap-1 text-gray-400 border-b border-gray-100 pb-2">
                        {tool.toolName === 'recall_memory' && <><Database size={10} /> Orchestrator searching memory...</>}
                        {tool.toolName === 'consult_ghost' && <><Sparkles size={10} /> Orchestrator invoking Ghost...</>}
                      </div>
                    ))}
                    <p className="text-[17px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && <div className="flex justify-start"><div className="bg-gray-50 text-gray-400 text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-2"><Sparkles size={12} /> Orchestrator is thinking...</div></div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="relative mt-auto">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Speak to the Ghost..." className="w-full bg-white/70 backdrop-blur-xl h-14 pl-6 pr-14 rounded-full border border-gray-200 shadow-sm focus:ring-2 focus:ring-[#0071E3] focus:outline-none transition-all" />
              <button type="submit" disabled={isLoading} className="absolute right-2 top-2 p-2.5 bg-[#0071E3] rounded-full text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"><ArrowUp size={20} /></button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
