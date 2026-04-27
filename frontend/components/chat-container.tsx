'use client'

import { useState } from 'react'
import ChatInterface from '@/components/chat-interface'
import IkigaiDashboard, { IkigaiNode } from '@/components/ikigai-dashboard'

export default function ChatContainer({ userId }: { userId: string }) {
  const [activeGem, setActiveGem] = useState<IkigaiNode | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'canvas'>('chat')

  const clearActiveGem = () => setActiveGem(null)

  return (
    <div className="h-full w-full flex flex-col bg-200 overflow-hidden md:p-3 px-3 py-2">

      {/* Mobile Tab Switcher - Fixed height, won't shrink */}
      <div className="lg:hidden flex-none mb-2 bg-100 rounded-xl p-1 gap-1 z-30 shadow-sm flex">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-primary text-white' : 'text-secondary-text hover:bg-100'}`}
        >
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('canvas')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'canvas' ? 'bg-primary text-white' : 'text-secondary-text hover:bg-100'}`}
        >
          Canvas
        </button>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden">
        
        {/* Left Side: The Chat (Fixed width sidebar on desktop, full height on mobile when active) */}
        <div className={`w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 h-full z-20 ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="h-full w-full flex flex-col bg-surface rounded-2xl overflow-hidden shadow-sm">
            <ChatInterface 
              userId={userId} 
              activeGem={activeGem} 
              clearActiveGem={clearActiveGem} 
            />
          </div>
        </div>

        {/* Right Side: The Dashboard (Fills all remaining space) */}
        <div className={`flex-1 relative h-full overflow-hidden bg-200 rounded-2xl lg:pl-3 ${activeTab === 'canvas' ? 'flex' : 'hidden lg:flex'}`}>
          <IkigaiDashboard 
            userId={userId} 
            onAskCoach={(node) => {
              setActiveGem(node);
              setActiveTab('chat');
            }}
          />
        </div>
      </div>
    </div>
  )
}
