'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import { useTheme } from './components/ThemeProvider';

const STORAGE_THRESHOLD = 4.5 * 1024 * 1024; // Use storage for files larger than this

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  prompt?: string;  // For assistant messages: the user query that generated this
  version?: number; // For regenerated responses: which version (2, 3, etc.)
}

export default function Alexandria() {
  const { theme, toggleTheme } = useTheme();
  const [showLanding, setShowLanding] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [mode, setMode] = useState<'input' | 'training' | 'output'>('input');
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [trainingMessages, setTrainingMessages] = useState<Message[]>([]);
  const [inputMessages, setInputMessages] = useState<Message[]>([]);
  const [outputMessages, setOutputMessages] = useState<Message[]>([]);
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadContext, setUploadContext] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<{ id: string; fileName: string; progress: number; status: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputScrollRef = useRef<HTMLDivElement>(null);

  // Check for existing session on load
  useEffect(() => {
    const storedToken = localStorage.getItem('alexandria_token');
    const storedUserId = localStorage.getItem('alexandria_user_id');
    const storedUsername = localStorage.getItem('alexandria_username');
    
    if (storedToken && storedUserId) {
      setUserId(storedUserId);
      setUsername(storedUsername || storedUserId);
      setIsAuthenticated(true);
      setShowLanding(false);
    }
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => { 
    if (isAuthenticated) {
      setSessionId(uuidv4()); 
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAuthenticated]);

  // Auto-trigger post_upload phase to ask questions about uploaded content
  useEffect(() => {
    if (carbonState.phase === 'post_upload' && userId) {
      const triggerPostUpload = async () => {
        setShowThinking(true);
        try {
          const response = await fetch('/api/input-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'processed upload' }],
              userId,
              state: carbonState
            })
          });
          
          if (response.ok) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            
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
                      if (data.delta) assistantContent += data.delta;
                      if (data.state) setCarbonState(data.state);
                    } catch {}
                  }
                }
              }
            }
            
            if (assistantContent) {
              setInputMessages(prev => [...prev, {
                id: uuidv4(),
                role: 'assistant',
                content: assistantContent
              }]);
            }
          }
        } catch (e) {
          console.error('Post-upload trigger failed:', e);
        }
        setShowThinking(false);
      };
      triggerPostUpload();
    }
  }, [carbonState.phase, userId]);

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
    setTrainingMessages([]);
    setOutputMessages([]);
    setInputMessages([]);
  };

  // Auto-scroll for training and output mode conversations
  useEffect(() => {
    if ((mode === 'training' || mode === 'output') && outputScrollRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        outputScrollRef.current?.scrollTo({
          top: outputScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  }
  }, [trainingMessages, outputMessages, mode]);

  // Auto-scroll during streaming in training/output mode
  useEffect(() => {
    if ((mode === 'training' || mode === 'output') && outputContent && outputScrollRef.current) {
      outputScrollRef.current.scrollTo({
        top: outputScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [outputContent, mode]);

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
    if (carbonLockYN && mode === 'input') {
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
        setTrainingMessages(prev => [...prev, wrapUpMessage]);
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
        setTrainingMessages(prev => [...prev, goodbyeMessage]);
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
      // Cycle through modes: input -> training -> output -> input
      setMode(mode === 'input' ? 'training' : mode === 'training' ? 'output' : 'input');
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
      const allMessages = trainingMessages.map(m => ({ role: m.role, content: m.content }));
      
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
      setTrainingMessages(prev => [...prev, { 
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
      setFeedbackPhase('regenerate');
      inputRef.current?.focus();
      
      // Process feedback in background (don't block UI)
      (async () => {
        const saved = await submitFeedback(currentRating, comment.trim() || '');
        if (saved && comment.trim()) {
          setFeedbackSaved(true);
          setTimeout(() => setFeedbackSaved(false), 1500);
        }
      })();
      return;
    }

    setInputValue('');
    setIsProcessing(true);
    
    // Collapse keyboard on mobile
    inputRef.current?.blur();

    try {
      if (mode === 'input') {
        await handleCarbon(text);
      } else if (mode === 'training') {
        await handleTraining(text);
      } else {
        await handleOutput(text);
      }
    } finally {
      setIsProcessing(false);
      // Only refocus on desktop
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        inputRef.current?.focus();
      }
    }
  };

  // Direct y/n handler for carbon mode (bypasses state update delay)
  const handleCarbonYN = async (answer: 'y' | 'n') => {
    setIsProcessing(true);
    setShowThinking(true);
    
    // Display "yes" or "no" in chat for nicer appearance
    const displayText = answer === 'y' ? 'yes' : 'no';
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: displayText
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

  const handleTraining = async (query: string) => {
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
      const newMessages = [...trainingMessages, userMessage];
      setTrainingMessages(newMessages);

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

      // Add to training messages history with the prompt for RLHF tracking
      setTrainingMessages(prev => [...prev, { 
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

  const handleOutput = async (query: string) => {
    try {
      setOutputContent('');
      setShowThinking(false);

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query
      };

      // Delay showing user message
      await new Promise(resolve => setTimeout(resolve, 300));
      const newMessages = [...outputMessages, userMessage];
      setOutputMessages(newMessages);

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

      // Add to output messages history (no RLHF tracking needed)
      setOutputMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');
      
      // No feedback loop - pure conversation mode

    } catch (error) {
      setShowThinking(false);
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };

  // Handle external carbon (file upload)
  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    const filesToUpload = [...selectedFiles];
    const context = uploadContext.trim();
    
    // Close modal immediately, go to main page with "inputting" status
    setSelectedFiles([]);
    setUploadContext('');
    setShowAttachModal(false);
    setMode('input');
    
    // Reset viewport on mobile
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Start with pending jobs to show "inputting"
    const tempJobs: { id: string; fileName: string; progress: number; status: 'pending' | 'processing' | 'completed' | 'failed' }[] = filesToUpload.map((f, i) => ({
      id: `temp-${i}`,
      fileName: f.name,
      progress: 0,
      status: 'pending'
    }));
    setPendingJobs(tempJobs);
    
    try {
      const finalJobs: typeof tempJobs = [];
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        
        // Large files: upload to storage and queue
        if (file.size > STORAGE_THRESHOLD) {
          const urlRes = await fetch('/api/get-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fileName: file.name, fileType: file.type })
          });
          
          if (!urlRes.ok) throw new Error('failed.');
          
          const { signedUrl, storagePath } = await urlRes.json();
          
          const uploadRes = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file
          });
          
          if (!uploadRes.ok) throw new Error('failed.');
          
          const jobRes = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              storagePath,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              context: context || null
            })
          });
          
          if (!jobRes.ok) throw new Error('failed.');
          
          const { jobId } = await jobRes.json();
          finalJobs.push({ id: jobId, fileName: file.name, progress: 0, status: 'pending' });
          
        } else {
          // Small files: process immediately
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', userId);
          if (context) formData.append('context', context);
          
          const response = await fetch('/api/upload-carbon', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) throw new Error('failed.');
          
          // Small file done immediately - mark as completed
          finalJobs.push({ id: `done-${i}`, fileName: file.name, progress: 100, status: 'completed' });
        }
      }
      
      setPendingJobs(finalJobs);
      
      // If all were small files (immediate), trigger post_upload
      if (finalJobs.every(j => j.status === 'completed')) {
        setCarbonState({ phase: 'post_upload' });
        setTimeout(() => setPendingJobs([]), 2000);
      }
      
    } catch (error) {
      console.error('File upload error:', error);
      setPendingJobs([{ id: 'error', fileName: 'upload', progress: 0, status: 'failed' }]);
      setTimeout(() => setPendingJobs([]), 3000);
    }
  };

  // Poll for job status updates
  useEffect(() => {
    if (pendingJobs.length === 0) return;
    
    const interval = setInterval(async () => {
      const updatedJobs = await Promise.all(
        pendingJobs.map(async (job) => {
          // Skip temp/done jobs and already finished jobs
          if (job.status === 'completed' || job.status === 'failed') return job;
          if (job.id.startsWith('temp-') || job.id.startsWith('done-') || job.id === 'error') return job;
          
          const res = await fetch(`/api/jobs?jobId=${job.id}`);
          if (!res.ok) return job;
          
          const data = await res.json();
          return { ...job, progress: data.progress || 0, status: data.status };
        })
      );
      
      setPendingJobs(updatedJobs);
      
      // Check if all done
      const allDone = updatedJobs.every(j => j.status === 'completed' || j.status === 'failed');
      if (allDone) {
        const completed = updatedJobs.filter(j => j.status === 'completed').length;
        if (completed > 0) {
          setCarbonState({ phase: 'post_upload' });
        }
        // Clear completed jobs after a delay
        setTimeout(() => {
          setPendingJobs(prev => prev.filter(j => j.status !== 'completed' && j.status !== 'failed'));
        }, 3000);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [pendingJobs]);

  // Client-side queue trigger (replaces Vercel cron on free tier)
  // NOTE: Vercel Pro ($20/mo) would allow server-side cron for background processing
  useEffect(() => {
    const hasPending = pendingJobs.some(j => j.status === 'pending' || j.status === 'processing');
    if (!hasPending) return;
    
    const trigger = setInterval(async () => {
      try {
        await fetch('/api/process-queue', { method: 'POST' });
      } catch {}
    }, 10000); // Trigger every 10s while jobs pending
    
    return () => clearInterval(trigger);
  }, [pendingJobs]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="opacity-50 animate-pulse" style={{ color: 'var(--text-primary)' }}>loading</span>
      </div>
    );
  }

  // Show landing page first if not authenticated
  if (!isAuthenticated && showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  // Show auth screen if not authenticated and landing dismissed
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} onBack={() => setShowLanding(true)} />;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6 text-[0.85rem] z-50" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-[0.75rem] opacity-40">{username}</span>
          <span className="text-[0.75rem] opacity-40">·</span>
          <button 
            onClick={handleLogout}
            className="bg-transparent border-none text-[0.75rem] cursor-pointer opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            sign out
          </button>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-55 pt-0.5">
          <span>alexandria.</span>
          <span className="text-[0.75rem] italic opacity-80">mentes aeternae</span>
        </div>
        
        <div className="relative rounded-full p-[1px] inline-flex" style={{ background: 'var(--toggle-bg)' }}>
          <button
            onClick={toggleTheme}
            className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] cursor-pointer"
            style={{ color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            light
          </button>
          <button
            onClick={toggleTheme}
            className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] cursor-pointer"
            style={{ color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            dark
          </button>
          <div
            className={`absolute top-[1px] left-[1px] w-[calc(50%-1px)] h-[calc(100%-2px)] backdrop-blur-[10px] rounded-full shadow-sm transition-transform duration-300 ease-out ${
              theme === 'dark' ? 'translate-x-full' : ''
            }`}
            style={{ background: 'var(--toggle-pill)' }}
          />
        </div>
      </div>

      {/* Output Area */}
      <div ref={outputScrollRef} className="flex-1 px-4 md:px-8 pt-16 md:pt-24 pb-4 md:pb-8 overflow-y-auto">
        <div className="max-w-[700px] mx-auto space-y-4 md:space-y-6">
          {(mode === 'input' ? inputMessages : mode === 'training' ? trainingMessages : outputMessages).map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2.5"
                style={{ 
                  background: message.role === 'user' ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  color: message.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <div className="text-[0.8rem] leading-relaxed whitespace-pre-wrap">
                  {message.version && message.version > 1 && (
                    <span className="text-[0.7rem] mr-1" style={{ color: 'var(--text-subtle)' }}>/{message.version}</span>
                  )}
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {/* Thinking indicator (Input mode only - Training/Output shows below input) */}
          {showThinking && !outputContent && mode === 'input' && (
            <div className="flex justify-start px-1">
              <span className="text-[0.75rem] italic thinking-pulse" style={{ color: 'var(--text-subtle)' }}>thinking</span>
            </div>
          )}
          {/* Streaming content */}
          {outputContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <div className="text-[0.8rem] leading-relaxed whitespace-pre-wrap">
                  {outputContent}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 pb-6 md:pb-8">
        <div className="max-w-[700px] mx-auto">
          {/* Mode Toggle */}
          <div className="flex justify-between items-center mb-3 gap-2">
            <div className="flex items-center gap-2">
              {/* Spacer to align with + button - always present */}
              <div className="w-10 flex-shrink-0" />
              <div className="relative rounded-full p-[1px] inline-flex w-[150px]" style={{ background: 'var(--toggle-bg)' }}>
                <button
                  onClick={() => setMode('input')}
                  className="relative z-10 flex-1 bg-transparent border-none py-0.5 text-[0.65rem] cursor-pointer"
                  style={{ color: mode === 'input' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  input
                </button>
                <button
                  onClick={() => setMode('training')}
                  className="relative z-10 flex-1 bg-transparent border-none py-0.5 text-[0.65rem] cursor-pointer"
                  style={{ color: mode === 'training' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  training
                </button>
                <button
                  onClick={() => setMode('output')}
                  className="relative z-10 flex-1 bg-transparent border-none py-0.5 text-[0.65rem] cursor-pointer"
                  style={{ color: mode === 'output' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  output
                </button>
                <div
                  className={`absolute top-[1px] left-[1px] w-[calc(33.33%-1px)] h-[calc(100%-2px)] backdrop-blur-[10px] rounded-full shadow-sm transition-transform duration-300 ease-out`}
                  style={{ 
                    background: 'var(--toggle-pill)',
                    transform: mode === 'input' ? 'translateX(0%)' : mode === 'training' ? 'translateX(100%)' : 'translateX(200%)'
                  }}
                />
              </div>
            </div>
            {/* Job status indicator */}
            {pendingJobs.length > 0 && (
              <span className={`text-[0.7rem] italic ${pendingJobs.some(j => j.status === 'pending' || j.status === 'processing') ? 'thinking-pulse' : ''}`} style={{ color: 'var(--text-subtle)' }}>
                {pendingJobs.some(j => j.status === 'failed') ? 'failed.' : 
                 pendingJobs.every(j => j.status === 'completed') ? 'inputted.' : 
                 `inputting · ${Math.round(pendingJobs.reduce((sum, j) => sum + j.progress, 0) / pendingJobs.length)}%`}
              </span>
            )}
          </div>

          {/* Input Container */}
          <div className="relative flex items-center gap-2">
            {/* Attach button - always present for layout stability */}
            <button
              onClick={() => feedbackPhase === 'none' && !carbonLockYN && setShowAttachModal(true)}
              className={`flex-shrink-0 w-10 h-10 rounded-full text-lg flex items-center justify-center ${feedbackPhase === 'none' && !carbonLockYN ? 'cursor-pointer' : 'opacity-0 cursor-default'}`}
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-subtle)' }}
              title="Attach text"
            >
              +
            </button>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  carbonLockYN && mode === 'input' ? "y/n" :
                  feedbackPhase === 'binary' ? "good? y/n" :
                  feedbackPhase === 'comment' ? "feedback:" :
                  feedbackPhase === 'regenerate' ? "regenerate? y/n" :
                  feedbackPhase === 'wrap_up' ? "y/n" : ""
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="send"
                data-form-type="other"
                className={`w-full border-none rounded-2xl text-[0.9rem] px-5 py-4 pr-[60px] outline-none shadow-md ${(feedbackPhase !== 'none' || carbonLockYN) ? 'placeholder-italic' : ''}`}
                style={{ 
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)',
                  caretColor: 'var(--caret-color)'
                }}
              />
              <button
                onClick={handleSubmit}
                className="absolute right-4 top-1/2 -translate-y-1/2 scale-y-[0.8] bg-transparent border-none rounded-md text-[1.2rem] cursor-pointer px-2 py-1 transition-colors"
                style={{ color: 'var(--text-whisper)' }}
              >
                →
              </button>
            </div>
          </div>
          
          {/* Status indicator below input */}
          <div className="h-4 mt-2 pl-1">
            {feedbackSaved && (
              <span className="text-[0.7rem] italic" style={{ color: 'var(--text-ghost)' }}>inputted.</span>
            )}
            {showThinking && (mode === 'training' || mode === 'output') && !outputContent && (
              <span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-subtle)' }}>thinking</span>
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
          background: var(--scrollbar-thumb);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }

        button:hover {
          color: var(--text-muted) !important;
        }
      `}</style>

      {/* File Upload Modal */}
      {showAttachModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'var(--bg-overlay)' }}
          onClick={() => !isUploading && setShowAttachModal(false)}
        >
          <div 
            className="rounded-2xl p-6 w-[90%] max-w-[400px] flex flex-col shadow-xl"
            style={{ background: 'var(--bg-modal)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => !isUploading && setShowAttachModal(false)}
                className="text-xl cursor-pointer -mt-1 -mr-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-subtle)' }}
                disabled={isUploading}
              >
                ×
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.flac,.pdf,.txt,.md,image/*,.png,.jpg,.jpeg"
              onChange={(e) => {
                const newFiles = Array.from(e.target.files || []);
                setSelectedFiles(prev => [...prev, ...newFiles]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hidden"
            />
            
            <div 
              id="upload-file-container"
              onClick={() => !isUploading && selectedFiles.length === 0 && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors max-h-32 overflow-y-auto ${isUploading ? 'opacity-50 cursor-not-allowed' : ''} ${selectedFiles.length === 0 ? 'cursor-pointer' : ''}`}
              style={{ borderColor: 'var(--border-dashed)' }}
            >
              {selectedFiles.length > 0 ? (
                <div className="text-sm space-y-2" style={{ color: 'var(--text-primary)' }}>
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-center gap-3">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = URL.createObjectURL(f);
                          window.open(url, '_blank');
                        }}
                        className="cursor-pointer hover:opacity-70"
                      >
                        {f.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                        }}
                        className="text-base leading-none px-1 cursor-pointer hover:opacity-70"
                        style={{ color: 'var(--text-ghost)' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div 
                    className="text-base mt-2 cursor-pointer hover:opacity-70"
                    style={{ color: 'var(--text-ghost)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    +
                  </div>
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-subtle)' }}>input text/audio</div>
              )}
            </div>
            
            <div id="upload-context-container" className="relative mt-3">
              <input
                type="text"
                value={uploadContext}
                onChange={(e) => setUploadContext(e.target.value)}
                placeholder="context"
                disabled={isUploading}
                className="w-full border rounded-xl text-sm px-4 py-3 pr-12 outline-none disabled:opacity-50"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isUploading) {
                    if (!uploadContext.trim()) {
                      const container = document.getElementById('upload-context-container');
                      container?.classList.add('animate-shake');
                      setTimeout(() => container?.classList.remove('animate-shake'), 500);
                    } else if (selectedFiles.length > 0) {
                      handleFileUpload();
                    }
                  }
                }}
              />
              {isUploading ? (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg thinking-pulse scale-y-[0.8]" style={{ color: 'var(--text-muted)' }}>→</span>
              ) : (
                <button
                  onClick={() => {
                    if (!uploadContext.trim()) {
                      const container = document.getElementById('upload-context-container');
                      container?.classList.add('animate-shake');
                      setTimeout(() => container?.classList.remove('animate-shake'), 500);
                    } else if (selectedFiles.length > 0) {
                      handleFileUpload();
                    }
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-lg scale-y-[0.8] transition-colors cursor-pointer"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  →
                </button>
              )}
            </div>
            <div className="mt-2 pl-1 h-[1.125rem]">
              {uploadStatus ? (
                <span className="text-[0.75rem] italic" style={{ color: 'var(--text-subtle)' }}>{uploadStatus}</span>
              ) : isUploading ? (
                <span className="text-[0.75rem] italic thinking-pulse" style={{ color: 'var(--text-subtle)' }}>uploading</span>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
