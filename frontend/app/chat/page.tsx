import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/chat-interface'

export default async function ChatPage() {
  // 1. Check if user is logged in
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <ChatInterface userId={user.id} />
    </div>
  )
}