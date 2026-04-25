'use client'

import { useState } from 'react'
import ChatInterface from '@/components/chat-interface'
import IkigaiDashboard, { IkigaiNode } from '@/components/ikigai-dashboard'

export default function ChatContainer({ userId }: { userId: string }) {
  const [activeGem, setActiveGem] = useState<IkigaiNode | null>(null)

  const clearActiveGem = () => setActiveGem(null)

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-200 overflow-hidden p-3">

      {/* Left Side: The Chat (Fixed width sidebar on desktop) */}
      <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 h-[50vh] lg:h-full z-20">
        <div className="h-full flex flex-col bg-surface rounded-2xl overflow-hidden">
          <ChatInterface 
            userId={userId} 
            activeGem={activeGem} 
            clearActiveGem={clearActiveGem} 
          />
        </div>
      </div>

      {/* Right Side: The Dashboard (Fills all remaining space) */}
      <div className="flex-1 relative h-[50vh] lg:h-full overflow-hidden bg-200 rounded-2xl pl-3">
        <IkigaiDashboard 
          userId={userId} 
          onAskCoach={(node) => setActiveGem(node)}
        />
      </div>
    </div>
  )
}
