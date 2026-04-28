import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SavedPaths from '@/components/saved-paths' 
import { checkOnboardingStatus } from '@/utils/onboarding'

export default async function PathsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const isComplete = await checkOnboardingStatus(user.id)
  if (!isComplete) {
    redirect('/onboarding')
  }

  return (
    <div className="h-full bg-200 overflow-y-auto">
      <SavedPaths userId={user.id} />
    </div>
  )
}