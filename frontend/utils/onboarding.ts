import { createClient } from '@/utils/supabase/server'

export async function checkOnboardingStatus(userId: string) {
  const supabase = await createClient()
  
  try {
    const historyResponse = await fetch(`http://localhost:8000/chat/history/${userId}`)
    if (historyResponse.ok) {
      const { messages } = await historyResponse.json()
      const isComplete = messages.some((m: any) => 
        m.role === 'assistant' && m.content.includes('===ONBOARDING_COMPLETE===')
      )
      
      if (isComplete) {
        return true
      }
    }
    
    // Fallback: check if nodes exist if history check fails or is negative
    const { data: profile } = await supabase
      .from('profiles')
      .select('ikigai_nodes')
      .eq('id', userId)
      .single()
    
    if (profile?.ikigai_nodes && profile.ikigai_nodes.length > 0) {
      return true
    }
  } catch (e) {
    console.error("Error checking onboarding status:", e)
  }

  return false
}
