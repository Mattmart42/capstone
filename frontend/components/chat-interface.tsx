'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Save, CheckCircle2 } from 'lucide-react'
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
  clearActiveGem 
}: { 
  userId: string, 
  activeGem: any, 
  clearActiveGem: () => void 
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(true)
  const [mode, setMode] = useState<AIMode>('probe') 
  const [savedPaths, setSavedPaths] = useState<any[]>([])
  const [savedPathIds, setSavedPathIds] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchInitialData() {
      if (!userId) return
      
      try {
        // 1. Fetch Chat History
        const historyUrl = `http://localhost:8000/chat/history/${userId}`
        const historyResponse = await fetch(historyUrl)
        let historyMessages: Message[] = []
        if (historyResponse.ok) {
          const data = await historyResponse.json()
          historyMessages = data.messages
          setMessages(historyMessages)
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
        if (nodes.length === 0) {
          setMode('onboard')
          
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
      } catch (error) {
        console.error("Failed to fetch initial data:", error)
      } finally {
        setIsFetchingHistory(false)
      }
    }

    fetchInitialData()
  }, [userId, supabase])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    } catch (error) {
      console.error("Error saving path:", error)
      alert("Failed to save path.")
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

      // UPDATED: Now we pass the 'mode' and 'saved_paths' to the backend
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          mode: mode,
          saved_paths: savedPaths, // <--- INJECTING SAVED PATHS HERE
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Network response was not ok')
      if (!response.body) throw new Error('No response body')

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
      }

    } catch (error) {
      console.error('Error:', error)
      alert("Failed to send message")
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
    <div className="flex h-full flex-col w-full bg-white overflow-hidden">
      
      {/* Header */}
      <div className="bg-indigo-600 p-4 text-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🤖 Ikigai Career Coach
        </h2>
        <p className="text-xs text-indigo-100 opacity-80">
          Discovering your passion, mission, vocation, and profession.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isFetchingHistory && (
          <div className="flex justify-center mt-10">
            <div className="animate-pulse text-indigo-500">Loading your conversation...</div>
          </div>
        )}

        {!isFetchingHistory && messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p>👋 Hi there! I'm here to help you find your path.</p>
            <p className="text-sm">Tell me a bit about yourself to get started.</p>
          </div>
        )}

        {messages.map((m) => {
          // Parse paths if they exist
          const pathsRegex = /===PATHS_JSON=== (.*?) ===END_PATHS_JSON===/
          const match = m.content.match(pathsRegex)
          
          // NEW: Create a sanitized display string by splitting at the delimiter
          // This prevents raw JSON from "leaking" into the UI while streaming
          const displayContent = m.content.split('===PATHS_JSON===')[0].trim()
          
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
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
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
                        className="bg-white/80 backdrop-blur-sm border border-indigo-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-left-4 duration-300"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-indigo-900 font-bold text-sm">{path.title}</h4>
                              {path.estimated_salary && (
                                <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-[10px] font-bold">
                                  {path.estimated_salary}
                                </span>
                              )}
                            </div>

                            {path.real_world_titles && path.real_world_titles.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {path.real_world_titles.map((title, tIdx) => (
                                  <span key={tIdx} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
                                    {title}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="text-gray-600 text-xs leading-relaxed">{path.description}</p>
                          </div>
                          <button
                            onClick={() => handleSavePath(path, idx, m.id)}
                            disabled={isSaved}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isSaved 
                                ? 'bg-green-50 text-green-600 cursor-default' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95'
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
            <div className="bg-gray-200 text-gray-500 rounded-2xl px-4 py-2 text-sm animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Banner */}
      {activeGem && (
        <div className="mx-4 mb-2 p-3 bg-white/90 backdrop-blur border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Targeting Gem</p>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                {activeGem.emoji} {activeGem.concept}
              </h3>
            </div>
            <button onClick={clearActiveGem} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getSuggestions().map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area with Mode Selector */}
      <div className="bg-white border-t border-gray-100 p-4 flex flex-col gap-3">
        
        {/* NEW: Mode Selector UI */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">Goal:</span>
          
          <button 
            onClick={() => setMode('onboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              mode === 'onboard' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Assess
          </button>

          <button 
            onClick={() => setMode('absorb')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              mode === 'absorb' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Listen
          </button>
          
          <button 
            onClick={() => setMode('probe')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              mode === 'probe' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Ask
          </button>
          
          <button 
            onClick={() => setMode('advise')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              mode === 'advise' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Advise
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'onboard' ? "Answer the assessment..." :
              mode === 'absorb' ? "Hear my thoughts..." :
              mode === 'probe' ? "Ask me questions..." :
              "Give me advice..."
            }
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}