import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import UploadForm from './upload-form'
import { checkOnboardingStatus } from '@/utils/onboarding'

export default async function UploadPage() {
  // 1. Check if user is logged in
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // 2. If not, kick them to login
  if (error || !user) {
    redirect('/login')
  }

  const isComplete = await checkOnboardingStatus(user.id)
  if (!isComplete) {
    redirect('/onboarding')
  }

  // 3. If yes, show the upload form
  return (
    <div className="flex h-full flex-col items-center justify-top bg-200 p-4 overflow-hidden">
      <div className="w-full max-w-xl rounded-lg p-8">
        <h1 className="mb-2 text-2xl font-bold text-text font-serif">Upload Your Resume</h1>
        <p className="mb-6 text-secondary-text">
          Upload your PDF resume to start your profile.
        </p>
        
        {/* Pass the user ID so we can name the file correctly */}
        <UploadForm userId={user.id} />
      </div>
    </div>
  )
}