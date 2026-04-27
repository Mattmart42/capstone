'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

type ProposedPath = {
  title: string
  description: string
  real_world_titles?: string[]
  estimated_salary?: string
}

type AIMode = 'absorb' | 'probe' | 'advise' | 'onboard'

export default function ChatInterface({ 
  userId, 
  activeGem, 
  clearActiveGem,
  onboardingMode = false,
  onOnboardingComplete
}: { 
  userId: string, 
  activeGem: any, 
  clearActiveGem: () => void,
  onboardingMode?: boolean,
  onOnboardingComplete?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFetchingHistory, setIsFetchingHistory] = useState(true)
  const [mode, setMode] = useState<AIMode>(onboardingMode ? 'onboard' : 'probe') 
  const [savedPaths, setSavedPaths] = useState<any[]>([])
  const [savedPathIds, setSavedPathIds] = useState<string[]>([])
  const [isOnboardingDone, setIsOnboardingDone] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Auto-focus input
  useEffect(() => {
    // Only auto-focus on desktop to avoid mobile keyboard layout shifts
    if (!isLoading && !isOnboardingDone && window.innerWidth >= 1024) {
      inputRef.current?.focus()
    }
  }, [isLoading, isOnboardingDone, activeGem])

  useEffect(() => {
    async function fetchInitialData() {
      if (!userId) return

      try {
        // 1. Fetch Chat History
        const historyUrl = `${process.env.NEXT_PUBLIC_API_URL}/chat/history/${userId}`
        const historyResponse = await fetch(historyUrl)
        let historyMessages: Message[] = []
        if (historyResponse.ok) {
          const data = await historyResponse.json()
          historyMessages = data.messages
          setMessages(historyMessages)

          // Check if onboarding was already completed in history
          const lastAssistantMessage = [...historyMessages].reverse().find(m => m.role === 'assistant')
          if (lastAssistantMessage?.content.includes('===ONBOARDING_COMPLETE===')) {
            setIsOnboardingDone(true)
          }
        }

        // 2. Fetch Profile for Ikigai Nodes and Saved Paths
        const { data: profile } = await supabase
          .from('profiles')
          .select('ikigai_nodes, saved_paths')
          .eq('id', userId)
          .single()

        const nodes = profile?.ikigai_nodes || []
        const paths = profile?.saved_paths || []
        setSavedPaths(paths)

        // 3. Onboarding Logic
        if (onboardingMode || nodes.length === 0) {
          if (!onboardingMode && nodes.length === 0) {
            // If they are on the main dashboard but have no nodes, 
            // maybe we should have redirected them, but for now just set mode.
            setMode('onboard')
          }

          // Auto-trigger greeting if no messages exist
          if (historyMessages.length === 0) {
            const greeting: Message = {
              id: 'onboarding-greeting',
              role: 'assistant',
              content: "Welcome to IkigAI. Before we map your future, let's figure out who you are. I have a few quick questions for you. First, what are you here for — searching for a job, new hobbies, or exploring new options?"
            }
            setMessages([greeting])
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch initial data:", error)
        setError("Failed to load conversation history. Some data might be missing.")
      } finally {
        setIsFetchingHistory(false)
      }
    }

    fetchInitialData()
  }, [userId, supabase, onboardingMode])

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSavePath = async (path: ProposedPath, pathIndex: number, messageId: string) => {
    const uniqueId = `${messageId}-${pathIndex}`
    if (savedPathIds.includes(uniqueId)) return

    try {
      // 1. Fetch current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('saved_paths')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      const currentPaths = profile?.saved_paths || []
      
      // 2. Append new path
      const newPath = {
        id: Date.now().toString(),
        title: path.title,
        description: path.description,
        real_world_titles: path.real_world_titles,
        estimated_salary: path.estimated_salary,
        created_at: new Date().toISOString()
      }

      const updatedPaths = [...currentPaths, newPath]

      // 3. Update table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ saved_paths: updatedPaths })
        .eq('id', userId)

      if (updateError) throw updateError

      setSavedPaths(updatedPaths)
      setSavedPathIds(prev => [...prev, uniqueId])
    } catch (error: any) {
      console.error("Error saving path:", error)
      setError("Failed to save path. Please try again.")
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const aiMessageId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'assistant',
        content: ''
      }])

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          mode: mode,
          saved_paths: savedPaths,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to connect to the AI service.'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If response is not JSON, use default or status text
          errorMessage = `Error ${response.status}: ${response.statusText || errorMessage}`
        }
        throw new Error(errorMessage)
      }
      
      if (!response.body) throw new Error('No response body from AI service.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let accumulatedText = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value, { stream: true })
        accumulatedText += chunkValue

        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: accumulatedText }
            : msg
        ))

        if (accumulatedText.includes('===ONBOARDING_COMPLETE===')) {
          setIsOnboardingDone(true)
        }
      }

    } catch (error: any) {
      console.error('Chat Error:', error)
      setError(error.message || "Failed to send message. Please try again.")
      // Remove the empty assistant message if it failed
      setMessages(prev => prev.filter(msg => msg.content !== '' || msg.role !== 'assistant'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const textToSend = input
    setInput('')
    await sendMessage(textToSend)
  }

  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion)
    clearActiveGem()
  }

  const getSuggestions = () => {
    if (!activeGem) return []
    const suggestions = []
    if (!activeGem.ai) suggestions.push(`How can I get paid for ${activeGem.concept}?`)
    if (!activeGem.g) suggestions.push(`How does the world need ${activeGem.concept}?`)
    if (!activeGem.i) suggestions.push(`How can I get better at ${activeGem.concept}?`)
    
    if (activeGem.ik && activeGem.i && activeGem.g && activeGem.ai) {
      suggestions.push(`How can I scale ${activeGem.concept}?`)
    }
    return suggestions.slice(0, 3)
  }

  return (
    <div className="flex h-full flex-col w-full bg-100 overflow-hidden">

      {/* Header */}
      <div className="bg-100 p-4 text-text">
        <h2 className="text-lg font-semibold flex items-center gap-2 font-serif">
          {onboardingMode ? "Onboarding" : "Wayfinder"}
        </h2>
        <p className="text-xs text-secondary-text">
          {onboardingMode ? "Tell us about yourself to populate your board" : "Discover your passion, mission, vocation, or profession"}
        </p>
      </div>

      <div className="px-2 bg-100">
        <div className="h-px bg-400 w-full" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-100 relative">
        {/* Error Toast */}
        {error && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle className="shrink-0 w-5 h-5 text-red-600" />
              <div className="flex-1 text-sm font-medium">{error}</div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {isFetchingHistory && (
          <div className="flex justify-center mt-10">
            <div className="animate-pulse text-primary">Loading your conversation...</div>
          </div>
        )}

        {!isFetchingHistory && messages.length === 0 && (
          <div className="text-center text-text mt-10">
            <p>👋 Hi there! I'm here to help you find your path.</p>
            <p className="text-sm">Tell me a bit about yourself to get started.</p>
          </div>
        )}

        {messages.map((m) => {
          // Parse paths if they exist
          const pathsRegex = /===PATHS_JSON=== (.*?) ===END_PATHS_JSON===/
          const match = m.content.match(pathsRegex)

          // Filter out tokens
          let displayContent = m.content
            .split('===PATHS_JSON===')[0]
            .split('===ONBOARDING_COMPLETE===')[0]
            .trim()

          let parsedPaths: ProposedPath[] = []

          if (match) {
            try {
              parsedPaths = JSON.parse(match[1])
            } catch (e) {
              console.error("Failed to parse paths JSON", e)
            }
          }

          return (
            <div key={m.id} className="flex flex-col space-y-2">
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[100%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : ' text-text  rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{displayContent}</div>
                </div>
              </div>

              {/* Render Path Cards if they exist */}
              {parsedPaths.length > 0 && (
                <div className="flex flex-col gap-3 ml-2 mr-8 mt-2">
                  {parsedPaths.map((path, idx) => {
                    const isSaved = savedPathIds.includes(`${m.id}-${idx}`)
                    return (
                      <div 
                        key={idx}
                        className="bg-200 backdrop-blur-sm rounded-xl p-4 transition-all animate-in fade-in slide-in-from-left-4 duration-300"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-text font-bold text-sm font-serif">{path.title}</h4>
                              {path.estimated_salary && (
                                <span className="bg-success-light text-success rounded-xl px-2 py-0.5 text-[10px] font-bold">
                                  {path.estimated_salary}
                                </span>
                              )}
                            </div>

                            {path.real_world_titles && path.real_world_titles.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {path.real_world_titles.map((title, tIdx) => (
                                  <span key={tIdx} className="bg-300 text-text px-1.5 py-0.5 rounded text-[10px]">
                                    {title}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="text-text text-xs leading-relaxed">{path.description}</p>
                          </div>
                          <button
                            onClick={() => handleSavePath(path, idx, m.id)}
                            disabled={isSaved}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isSaved 
                                ? 'bg-success-light text-success cursor-default' 
                                : 'bg-primary text-white hover:bg-primary-hover shadow-sm active:scale-95'
                            }`}
                          >
                            {isSaved ? (
                              <><CheckCircle2 size={14} /> Saved!</>
                            ) : (
                              <><Save size={14} /> Save Path</>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-200 text-text rounded-2xl px-4 py-2 text-sm animate-pulse flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1 h-1 bg-text/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-text/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-text/50 rounded-full animate-bounce"></span>
              </span>
              Analyzing your profile...
            </div>
          </div>
        )}

        {isOnboardingDone && onboardingMode && (
          <div className="flex justify-center p-4">
            <button
              onClick={onOnboardingComplete}
              className="bg-success text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
            >
              <CheckCircle2 size={24} />
              Show my Board
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Banner */}
      {activeGem && !onboardingMode && (
        <div className="mx-4 mb-2 p-3 bg-100/50 backdrop-blur border border-border rounded-xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold text-secondary-text uppercase tracking-tighter">Targeting Gem</p>
              <h3 className="text-sm font-bold text-text flex items-center gap-1">
                {activeGem.emoji} {activeGem.concept}
              </h3>
            </div>
            <button onClick={clearActiveGem} className="text-secondary-text hover:text-text">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getSuggestions().map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="text-[11px] bg-primary-light text-primary px-2 py-1 rounded-lg border border-primary-light hover:bg-primary-light transition-colors text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-2 bg-100">
        <div className="h-px bg-400 w-full" />
      </div>

      {/* Input Area with Mode Selector */}
      <div className="bg-100 p-4 flex flex-col gap-3">

        {/* Mode Selector UI */}
        {!onboardingMode && (
          <div className="flex items-center justify-left gap-2">
            <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider mr-2">Goal:</span>

            <button 
              onClick={() => setMode('absorb')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                mode === 'absorb' ? 'bg-primary text-white border border-primary-light' : 'bg-200 text-text hover:bg-300'
              }`}
            >
              Listen
            </button>

            <button 
              onClick={() => setMode('probe')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                mode === 'probe' ? 'bg-primary text-white border border-primary-light' : 'bg-200 text-text hover:bg-300'
              }`}
            >
              Ask
            </button>

            <button 
              onClick={() => setMode('advise')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                mode === 'advise' ? 'bg-primary text-white border border-primary-light' : 'bg-200 text-text hover:bg-300'
              }`}
            >
              Advise
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 px-5 h-12 bg-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text placeholder-secondary-text text-base"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'onboard' ? "Answer the assessment..." :
              mode === 'absorb' ? "Hear my thoughts..." :
              mode === 'probe' ? "Ask me questions..." :
              "Give me advice..."
            }
            disabled={isLoading || (onboardingMode && isOnboardingDone)}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || (onboardingMode && isOnboardingDone)}
            className="bg-primary text-white w-12 h-12 flex items-center justify-center rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
