'use client'

import { useState, useRef, useEffect } from 'react'

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default function ChatInterface({ userId }: { userId: string }) {
  // 1. We manage the state ourselves
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // 2. Optimistically add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }
    
    // Clear input and show loading state
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 3. Create a placeholder for the AI's response
      const aiMessageId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'assistant',
        content: ''
      }])

      // 4. Call the Backend Manually
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Network response was not ok')
      if (!response.body) throw new Error('No response body')

      // 5. Read the Stream (The "Typing" Effect)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let accumulatedText = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value, { stream: true })
        accumulatedText += chunkValue

        // Update the LAST message with the new chunk
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

  return (
    <div className="flex h-[80vh] flex-col w-full max-w-2xl mx-auto border rounded-xl shadow-xl bg-white overflow-hidden">
      
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
        {messages.length === 0 && (
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

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="I really enjoy working with..."
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
        </div>
      </form>
    </div>
  )
}