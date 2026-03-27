'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

type AIMode = 'absorb' | 'probe' | 'advise'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`http://127.0.0.1:8000/chat/history/${userId}`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages)
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error)
      } finally {
        setIsFetchingHistory(false)
      }
    }

    fetchHistory()
  }, [userId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

      // UPDATED: Now we pass the 'mode' to the backend
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          mode: mode, // <--- INJECTING THE SELECTED MODE HERE
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

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        
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