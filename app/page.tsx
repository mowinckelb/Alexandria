'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AuthScreen from './components/AuthScreen';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  prompt?: string;  // For assistant messages: the user query that generated this
  version?: number; // For regenerated responses: which version (2, 3, etc.)
}

export default function Alexandria() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [mode, setMode] = useState<'carbon' | 'ghost'>('carbon');
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [ghostMessages, setGhostMessages] = useState<Message[]>([]);
  const [inputMessages, setInputMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [outputContent, setOutputContent] = useState('');
  const [feedbackPhase, setFeedbackPhase] = useState<'none' | 'binary' | 'comment' | 'regenerate' | 'wrap_up'>('none');
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [lastGhostMessage, setLastGhostMessage] = useState<{ prompt: string; response: string; id: string } | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [regenerationVersion, setRegenerationVersion] = useState(1);
  
  // Carbon conversation state
  const [carbonState, setCarbonState] = useState<{
    phase: string;
    currentQuestionId?: string;
    currentTopic?: string;
  }>({ phase: 'collecting' });
  const [carbonLockYN, setCarbonLockYN] = useState(false);
  
  // External carbon (file uploads)
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check for existing session on load
  useEffect(() => {
    const storedToken = localStorage.getItem('alexandria_token');
    const storedUserId = localStorage.getItem('alexandria_user_id');
    const storedUsername = localStorage.getItem('alexandria_username');
    
    if (storedToken && storedUserId) {
      setUserId(storedUserId);
      setUsername(storedUsername || storedUserId);
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => { 
    if (isAuthenticated) {
      setSessionId(uuidv4()); 
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = (newUsername: string, token: string, newUserId: string) => {
    localStorage.setItem('alexandria_token', token);
    localStorage.setItem('alexandria_user_id', newUserId);
    localStorage.setItem('alexandria_username', newUsername);
    setUserId(newUserId);
    setUsername(newUsername);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('alexandria_token');
    localStorage.removeItem('alexandria_user_id');
    localStorage.removeItem('alexandria_username');
    setUserId('');
    setUsername('');
    setIsAuthenticated(false);
    setGhostMessages([]);
    setInputMessages([]);
  };

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
    // Carbon y/n lock (wrap_up, offer_questions, topic_continue phases)
    if (carbonLockYN && mode === 'carbon') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setCarbonLockYN(false);
        handleCarbonYN('y');
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setCarbonLockYN(false);
        handleCarbonYN('n');
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
    }

    // Phase 1: Binary y/n - instant response
    if (feedbackPhase === 'binary') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setCurrentRating(1);
        setInputValue('');
        setTimeout(() => setFeedbackPhase('comment'), 150);
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setCurrentRating(-1);
        setInputValue('');
        setTimeout(() => setFeedbackPhase('comment'), 150);
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
    }
    
    // Phase 3: Regenerate y/n - instant response
    if (feedbackPhase === 'regenerate') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setInputValue('');
        handleRegenerate();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setInputValue('');
        // Ask if there's anything else
        const wrapUpMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: "anything else?"
        };
        setGhostMessages(prev => [...prev, wrapUpMessage]);
        setLastGhostMessage(null);
        setTimeout(() => setFeedbackPhase('wrap_up'), 150);
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
    }
    
    // Phase 4: Wrap up y/n - anything else?
    if (feedbackPhase === 'wrap_up') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setInputValue('');
        setFeedbackPhase('none');
        inputRef.current?.focus();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setInputValue('');
        // Ghost says goodbye
        const goodbyeMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: "sounds good, bye for now!"
        };
        setGhostMessages(prev => [...prev, goodbyeMessage]);
        setFeedbackPhase('none');
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp' && feedbackPhase === 'none') {
      e.preventDefault();
      setMode(mode === 'carbon' ? 'ghost' : 'carbon');
    }
  };

  const [isRegenerationFeedback, setIsRegenerationFeedback] = useState(false);

  const submitFeedback = async (rating: number, comment: string): Promise<boolean> => {
    if (!lastGhostMessage) return false;
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messageId: lastGhostMessage.id,
          sessionId,
          feedback: rating,
          comment: comment.trim(),
          prompt: lastGhostMessage.prompt,
          response: lastGhostMessage.response,
          isRegeneration: isRegenerationFeedback
        })
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  };

  const handleRegenerate = async () => {
    if (!lastGhostMessage) return;
    
    // Store prompt before any state changes
    const promptToRegenerate = lastGhostMessage.prompt;
    const nextVersion = regenerationVersion + 1;
    
    // Re-run ghost with same prompt
    setFeedbackPhase('none');
    setRegenerationVersion(nextVersion);
    setIsProcessing(true);
    setOutputContent('');  // Clear immediately to prevent glitch
    setShowThinking(true);
    
    try {
      // Build messages: keep all messages, ask for a different response
      const allMessages = ghostMessages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...allMessages,
            { role: 'user', content: `Please give me a different response to my previous question: "${promptToRegenerate}"` }
          ],
          userId,
          sessionId,
          temperature: 0.9  // Higher temperature for variation
        })
      });

      if (!response.ok) throw new Error(`http ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();

      if (reader) {
        let firstChunk = true;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Hide thinking on first content
          if (firstChunk) {
            setShowThinking(false);
            firstChunk = false;
          }
          
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
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Only proceed if we got actual content
      if (!assistantContent.trim()) {
        console.error('Regenerate returned empty content');
        setFeedbackPhase('none');
        setLastGhostMessage(null);
        setOutputContent('');
        return;
      }

      // ADD new message below the previous one (don't replace - keep both for A/B comparison)
      setGhostMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent,
        prompt: promptToRegenerate,
        version: nextVersion
      }]);
      
      // Update for next potential regeneration
      setLastGhostMessage({ prompt: promptToRegenerate, response: assistantContent, id: assistantId });
      setIsRegenerationFeedback(true);  // This IS a regeneration - enables DPO pair detection
      
      // Wait for message to render, then clear streaming content and start feedback
      await new Promise(resolve => setTimeout(resolve, 100));
      setOutputContent('');
      
      // Start feedback loop again
      setTimeout(() => setFeedbackPhase('binary'), 200);
      
    } catch (error) {
      console.error('Regenerate error:', error);
      setFeedbackPhase('none');
      setLastGhostMessage(null);
    } finally {
      setIsProcessing(false);
      setShowThinking(false);
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
    
    // Allow empty submit only in comment phase (to skip)
    if (!text && feedbackPhase !== 'comment') return;

    // Prevent double submission
    if (isProcessing) {
      shakeInput();
      return;
    }

    // Phase 2: Comment submission (Enter with empty = skip)
    if (feedbackPhase === 'comment') {
      const comment = text;
      setInputValue('');
      setShowThinking(true);
      
      if (comment.trim()) {
        const saved = await submitFeedback(currentRating, comment);
        if (saved) {
          setFeedbackSaved(true);
          setTimeout(() => setFeedbackSaved(false), 1500);
        }
      } else {
        // Empty comment - still save the binary rating
        await submitFeedback(currentRating, '');
      }
      
      setShowThinking(false);
      setFeedbackPhase('regenerate');
      inputRef.current?.focus();
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

  // Direct y/n handler for carbon mode (bypasses state update delay)
  const handleCarbonYN = async (answer: 'y' | 'n') => {
    setIsProcessing(true);
    setShowThinking(true);
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: answer
    };
    const newMessages = [...inputMessages, userMessage];
    setInputMessages(newMessages);

    try {
      const response = await fetch('/api/input-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          state: carbonState
        })
      });

      if (!response.ok) throw new Error(`http ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();
      let newState = carbonState;
      let shouldLockYN = false;

      setShowThinking(false);

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
                if (data.state) newState = data.state;
                if (data.lockYN !== undefined) shouldLockYN = data.lockYN;
              } catch { /* ignore */ }
            }
          }
        }
      }

      setCarbonState(newState);
      setCarbonLockYN(shouldLockYN);
      setInputMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: assistantContent }]);
      setOutputContent('');

      if (newState.phase === 'goodbye') {
        setTimeout(() => {
          setCarbonState({ phase: 'collecting' });
          setCarbonLockYN(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Carbon YN error:', error);
      setShowThinking(false);
    } finally {
      setIsProcessing(false);
      setShowThinking(false);
    }
  };

  const handleCarbon = async (text: string) => {
    try {
      setOutputContent('');
      setShowThinking(true);

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: text
      };

      // Delay showing user message
      await new Promise(resolve => setTimeout(resolve, 300));
      const newMessages = [...inputMessages, userMessage];
      setInputMessages(newMessages);

      const response = await fetch('/api/input-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          state: carbonState
        })
      });

      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();
      let newState = carbonState;
      let shouldLockYN = false;

      if (reader) {
        let firstChunk = true;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          if (firstChunk) {
            setShowThinking(false);
            firstChunk = false;
          }
          
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
                // Handle state updates from server
                if (data.state) {
                  newState = data.state;
                }
                if (data.lockYN !== undefined) {
                  shouldLockYN = data.lockYN;
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // Update conversation state
      setCarbonState(newState);
      setCarbonLockYN(shouldLockYN);

      // Add to input messages history
      setInputMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent 
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');
      
      // Reset state if conversation ended
      if (newState.phase === 'goodbye') {
        setTimeout(() => {
          setCarbonState({ phase: 'collecting' });
          setCarbonLockYN(false);
        }, 2000);
      }

      // Show "saved." if data was ingested
      if (assistantContent.includes("I've saved it")) {
        setTimeout(() => {
          setFeedbackSaved(true);
          setTimeout(() => setFeedbackSaved(false), 1500);
        }, 200);
      }

    } catch (error) {
      setShowThinking(false);
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };

  const handleGhost = async (query: string) => {
    try {
      setOutputContent('');
      setShowThinking(false);
      setRegenerationVersion(1);  // Reset version for new prompt

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query
      };

      // Delay showing user message
      await new Promise(resolve => setTimeout(resolve, 300));
      const newMessages = [...ghostMessages, userMessage];
      setGhostMessages(newMessages);

      // Delay showing thinking indicator
      setTimeout(() => setShowThinking(true), 700);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
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

      // Hide thinking when streaming starts
      setShowThinking(false);

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

      // Add to ghost messages history with the prompt for RLHF tracking
      setGhostMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent,
        prompt: query  // Store the user query that generated this response
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');
      
      // Enter feedback mode - user must provide feedback before next query
      setLastGhostMessage({ prompt: query, response: assistantContent, id: assistantId });
      setIsRegenerationFeedback(false);  // First response, not a regeneration
      setTimeout(() => setFeedbackPhase('binary'), 300);

    } catch (error) {
      setShowThinking(false);
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };

  // Handle external carbon (file upload)
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', userId);
      
      const response = await fetch('/api/upload-carbon', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }
      
      const result = await response.json();
      const { summary } = result;
      
      setUploadStatus(`done! ${summary.chunksProcessed} chunks, ${summary.factsExtracted} facts, ${summary.memoryItemsStored} memories`);
      setSelectedFile(null);
      
      // Clear status after delay
      setTimeout(() => {
        setUploadStatus(null);
        setShowAttachModal(false);
      }, 3000);
      
    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatus(error instanceof Error ? error.message : 'error - try again');
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fafafa]">
        <span className="text-[#3a3a3a] opacity-50 animate-pulse">loading</span>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fafafa] text-[#3a3a3a]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between p-6 text-[0.85rem] z-50 bg-[#fafafa]">
        <button 
          onClick={handleLogout}
          className="bg-transparent border-none text-[#3a3a3a] text-[0.75rem] cursor-pointer opacity-40 hover:opacity-70 transition-opacity"
        >
          sign out
        </button>
        
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-55">
          <span>alexandria.</span>
          <span className="text-[0.75rem] italic opacity-80">immortalise the greats</span>
        </div>
        
        <span className="text-[0.75rem] opacity-40">{username}</span>
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
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-[#efefef] text-[#3a3a3a]'
                    : 'bg-[#f4f4f4] text-[#4a4a4a]'
                }`}
              >
                <div className="text-[0.8rem] leading-relaxed whitespace-pre-wrap">
                  {message.version && message.version > 1 && (
                    <span className="text-[0.7rem] text-[#999] mr-1">/{message.version}</span>
                  )}
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {/* Thinking indicator (Carbon mode only - Ghost shows below input) */}
          {showThinking && !outputContent && mode === 'carbon' && (
            <div className="flex justify-start px-1">
              <span className="text-[0.75rem] text-[#999] italic thinking-pulse">thinking</span>
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
          <div className="flex justify-start items-center mb-3 gap-2">
            {/* Spacer to align with + button */}
            {feedbackPhase === 'none' && !carbonLockYN && (
              <div className="w-10 flex-shrink-0" />
            )}
            <div className="relative bg-[#3a3a3a]/[0.06] rounded-full p-[2px] inline-flex">
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
                className={`absolute top-[2px] left-[2px] w-[calc(50%-2px)] h-[calc(100%-4px)] bg-white/55 backdrop-blur-[10px] rounded-full shadow-sm transition-transform duration-300 ease-out ${
                  mode === 'ghost' ? 'translate-x-full' : ''
                }`}
              />
            </div>
          </div>

          {/* Input Container */}
          <div className="relative flex items-center gap-2">
            {/* Attach button (both modes - future: docs for ghost Q&A) */}
            {feedbackPhase === 'none' && !carbonLockYN && (
              <button
                onClick={() => setShowAttachModal(true)}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-[#f4f4f4] text-[#999] text-lg flex items-center justify-center hover:bg-[#efefef] hover:text-[#666] transition-colors cursor-pointer"
                title="Attach text"
              >
                +
              </button>
            )}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  carbonLockYN && mode === 'carbon' ? "y/n" :
                  feedbackPhase === 'binary' ? "good? y/n" :
                  feedbackPhase === 'comment' ? "feedback:" :
                  feedbackPhase === 'regenerate' ? "regenerate? y/n" :
                  feedbackPhase === 'wrap_up' ? "y/n" : ""
                }
                autoComplete="off"
                spellCheck="false"
                className={`w-full bg-[#f4f4f4] border-none rounded-2xl text-[#3a3a3a] text-[0.9rem] px-5 py-4 pr-[60px] outline-none transition-colors shadow-md caret-[#3a3a3a]/40 focus:bg-[#efefef] ${(feedbackPhase !== 'none' || carbonLockYN) ? 'placeholder:text-[#aaa] placeholder:italic' : ''}`}
              />
              <button
                onClick={handleSubmit}
                className="absolute right-4 top-1/2 -translate-y-1/2 scale-y-[0.8] bg-transparent border-none rounded-md text-[#ccc] text-[1.2rem] cursor-pointer px-2 py-1 transition-colors hover:text-[#999] focus:text-[#999] focus:shadow-[0_0_0_2px_rgba(58,58,58,0.1)]"
              >
                →
              </button>
            </div>
          </div>
          
          {/* Status indicator below input */}
          <div className="h-4 mt-2 pl-1">
            {feedbackSaved && (
              <span className="text-[0.7rem] text-[#bbb] italic">saved.</span>
            )}
            {showThinking && mode === 'ghost' && !outputContent && (
              <span className="text-[0.7rem] text-[#999] italic thinking-pulse">thinking</span>
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

        @keyframes thinkingPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }

        .thinking-pulse {
          animation: thinkingPulse 1.5s ease-in-out infinite;
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

      {/* File Upload Modal */}
      {showAttachModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => !isUploading && setShowAttachModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-[90%] max-w-[400px] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[#3a3a3a] text-lg font-medium">upload external input</h2>
              <button
                onClick={() => !isUploading && setShowAttachModal(false)}
                className="text-[#999] hover:text-[#666] text-xl cursor-pointer"
                disabled={isUploading}
              >
                ×
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.flac,.pdf,.txt,.md,image/*,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-[#ddd] rounded-xl p-8 text-center cursor-pointer hover:border-[#bbb] transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {selectedFile ? (
                <div>
                  <div className="text-[#3a3a3a] font-medium">{selectedFile.name}</div>
                  <div className="text-[#999] text-sm mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[#999] text-sm">click to select file</div>
                  <div className="text-[#bbb] text-xs mt-2">audio, pdf, image, or text</div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <span className="text-[0.75rem] text-[#999]">
                {uploadStatus || ''}
              </span>
              <button
                onClick={handleFileUpload}
                disabled={isUploading || !selectedFile}
                className="px-5 py-2 bg-[#3a3a3a] text-white rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              >
                {isUploading ? 'processing...' : 'upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
