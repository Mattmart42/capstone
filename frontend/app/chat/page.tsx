import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatContainer from '@/components/chat-container'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return <ChatContainer userId={user.id} />
}
