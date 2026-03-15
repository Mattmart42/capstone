import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SavedPaths from '@/components/saved-paths' 

export default async function PathsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* We pass the userId prop to the component you just built! */}
      <SavedPaths userId={user.id} />
    </div>
  )
}