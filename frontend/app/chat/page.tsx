import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatContainer from '@/components/chat-container'
import { checkOnboardingStatus } from '@/utils/onboarding'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const isComplete = await checkOnboardingStatus(user.id)
  if (!isComplete) {
    redirect('/onboarding')
  }

  return <ChatContainer userId={user.id} />
}
