'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/components/chat-interface'

export default function OnboardingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      
      // Check if onboarding is complete by looking at history
      try {
        const historyResponse = await fetch(`http://localhost:8000/chat/history/${user.id}`)
        if (historyResponse.ok) {
          const { messages } = await historyResponse.json()
          const isComplete = messages.some((m: any) => 
            m.role === 'assistant' && m.content.includes('===ONBOARDING_COMPLETE===')
          )
          
          if (isComplete) {
            router.push('/chat')
            return
          }
        }
      } catch (e) {
        console.error("Error checking onboarding status:", e)
      }

      setIsLoading(false)
    }
    getUser()
  }, [supabase, router])

  if (isLoading || !userId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-200">
        <div className="animate-pulse text-primary font-serif text-xl">Preparing your journey...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-200 p-4 lg:p-10 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-4xl h-full bg-surface rounded-3xl overflow-hidden shadow-2xl border border-white/20">
        <ChatInterface 
          userId={userId} 
          activeGem={null} 
          clearActiveGem={() => {}} 
          onboardingMode={true}
          onOnboardingComplete={() => router.push('/chat')}
        />
      </div>
    </div>
  )
}
