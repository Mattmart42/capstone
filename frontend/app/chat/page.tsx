import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/chat-interface'
import IkigaiDashboard from '@/components/new-dash' 

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    // Full screen, edge-to-edge layout
    <div className="h-screen w-full flex flex-col lg:flex-row bg-slate-50 overflow-hidden">
      
      {/* Left Side: The Chat (Fixed width sidebar on desktop) */}
      <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 h-[50vh] lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <ChatInterface userId={user.id} />
      </div>

      {/* Right Side: The Dashboard (Fills all remaining space) */}
      <div className="flex-1 relative h-[50vh] lg:h-full overflow-hidden bg-slate-900">
        <IkigaiDashboard userId={user.id} />
      </div>

    </div>
  )
}