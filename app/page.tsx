'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AuthScreen from './components/AuthScreen';

const STORAGE_THRESHOLD = 4.5 * 1024 * 1024; // Use storage for files larger than this

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadContext, setUploadContext] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<{ id: string; fileName: string; progress: number; status: string }[]>([]);
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
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadStatus(null);
    
    let totalChunks = 0, totalFacts = 0, totalMemories = 0;
    let queuedJobs: { id: string; fileName: string; progress: number; status: string }[] = [];
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatus(`${i + 1}/${selectedFiles.length}: ${file.name}`);
        
        // Large files: upload to storage and queue for background processing
        if (file.size > STORAGE_THRESHOLD) {
          setUploadStatus(`uploading ${file.name}...`);
          
          const urlRes = await fetch('/api/get-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fileName: file.name, fileType: file.type })
          });
          
          if (!urlRes.ok) {
            const err = await urlRes.json();
            throw new Error(`Upload URL failed: ${err.error}`);
          }
          
          const { signedUrl, storagePath } = await urlRes.json();
          
          const uploadRes = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file
          });
          
          if (!uploadRes.ok) throw new Error(`Storage upload failed`);
          
          // Create background job
          const jobRes = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              storagePath,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              context: uploadContext.trim() || null
            })
          });
          
          if (!jobRes.ok) throw new Error('Failed to create job');
          
          const { jobId } = await jobRes.json();
          queuedJobs.push({ id: jobId, fileName: file.name, progress: 0, status: 'pending' });
          
        } else {
          // Small files: process immediately
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', userId);
          if (uploadContext.trim()) formData.append('context', uploadContext.trim());
          
          const response = await fetch('/api/upload-carbon', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Upload failed for ${file.name}`);
          }
          
          const result = await response.json();
          totalChunks += result.summary.chunksProcessed;
          totalFacts += result.summary.factsExtracted;
          totalMemories += result.summary.memoryItemsStored;
        }
      }
      
      // Update pending jobs for tracking
      if (queuedJobs.length > 0) {
        setPendingJobs(prev => [...prev, ...queuedJobs]);
        setUploadStatus(`${queuedJobs.length} file(s) queued for processing`);
      } else {
        setUploadStatus(`done! ${totalChunks} chunks, ${totalFacts} facts, ${totalMemories} memories`);
      }
      
      setSelectedFiles([]);
      setUploadContext('');
      
      setTimeout(() => {
        setUploadStatus(null);
        setShowAttachModal(false);
        setMode('carbon');
        if (queuedJobs.length === 0) {
          setCarbonState({ phase: 'post_upload' });
        }
      }, 1500);
      
    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatus(error instanceof Error ? error.message : 'error - try again');
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  // Poll for job status updates
  useEffect(() => {
    if (pendingJobs.length === 0) return;
    
    const interval = setInterval(async () => {
      const updatedJobs = await Promise.all(
        pendingJobs.map(async (job) => {
          if (job.status === 'completed' || job.status === 'failed') return job;
          
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#fafafa] text-[#3a3a3a]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6 text-[0.85rem] z-50 bg-[#fafafa]">
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
      <div className="flex-1 px-4 md:px-8 pt-16 md:pt-24 pb-4 md:pb-8 overflow-y-auto">
        <div className="max-w-[700px] mx-auto space-y-4 md:space-y-6">
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
      <div className="p-4 md:p-6 pb-6 md:pb-8">
        <div className="max-w-[700px] mx-auto">
          {/* Mode Toggle */}
          <div className="flex justify-between items-center mb-3 gap-2">
            <div className="flex items-center gap-2">
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
            {/* Job status indicator */}
            {pendingJobs.length > 0 && (
              <span className={`text-[0.7rem] text-[#999] italic ${pendingJobs.some(j => j.status === 'pending' || j.status === 'processing') ? 'thinking-pulse' : ''}`}>
                {pendingJobs.every(j => j.status === 'completed') ? 'inputted.' : 'inputting'}
              </span>
            )}
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
              <span className="text-[0.7rem] text-[#bbb] italic">inputted.</span>
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
            <div className="flex justify-end">
              <button
                onClick={() => !isUploading && setShowAttachModal(false)}
                className="text-[#999] hover:text-[#666] text-xl cursor-pointer -mt-1 -mr-1"
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
              className={`border-2 border-dashed border-[#ddd] rounded-xl p-4 text-center hover:border-[#bbb] transition-colors max-h-32 overflow-y-auto ${isUploading ? 'opacity-50 cursor-not-allowed' : ''} ${selectedFiles.length === 0 ? 'cursor-pointer' : ''}`}
            >
              {selectedFiles.length > 0 ? (
                <div className="text-[#3a3a3a] text-sm space-y-2">
                  <div className="text-[#bbb] text-xs">
                    {(() => {
                      const totalMB = selectedFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
                      return `${totalMB.toFixed(1)}MB`;
                    })()}
                  </div>
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-center gap-3">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = URL.createObjectURL(f);
                          window.open(url, '_blank');
                        }}
                        className="cursor-pointer hover:text-[#666]"
                      >
                        {f.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                        }}
                        className="text-[#bbb] hover:text-[#666] text-base leading-none px-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div 
                    className="text-[#bbb] text-xs mt-2 hover:text-[#999] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    + add more
                  </div>
                </div>
              ) : (
                <div className="text-[#999] text-sm">input text/audio</div>
              )}
            </div>
            
            <div id="upload-context-container" className="relative mt-3">
              <input
                type="text"
                value={uploadContext}
                onChange={(e) => setUploadContext(e.target.value)}
                placeholder="context:"
                disabled={isUploading}
                className="w-full bg-[#f8f8f8] border border-[#eee] rounded-xl text-[#3a3a3a] text-sm px-4 py-3 pr-12 outline-none placeholder:text-[#aaa] disabled:opacity-50"
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
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] text-lg thinking-pulse scale-y-[0.8]">→</span>
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] text-lg scale-y-[0.8] hover:text-[#666] transition-colors cursor-pointer"
                >
                  →
                </button>
              )}
            </div>
            <div className="mt-2 pl-1 h-[1.125rem]">
              {isUploading && (
                <span className="text-[0.75rem] text-[#999] italic thinking-pulse">thinking</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
