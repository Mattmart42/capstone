import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/chat-interface'
import IkigaiDashboard from '@/components/ikigai-dashboard-1' // Import the new component

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 lg:p-8">
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-start justify-center">
        
        {/* Left Side: The Chat */}
        <div className="w-full lg:w-3/5 flex justify-center">
          <ChatInterface userId={user.id} />
        </div>

        {/* Right Side: The Dashboard */}
        <div className="w-full lg:w-2/5 flex justify-center">
          <IkigaiDashboard userId={user.id} />
        </div>

      </div>
    </div>
  )
}