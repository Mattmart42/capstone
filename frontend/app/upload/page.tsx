import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import UploadForm from './upload-form'

export default async function UploadPage() {
  // 1. Check if user is logged in
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // 2. If not, kick them to login
  if (error || !user) {
    redirect('/login')
  }

  // 3. If yes, show the upload form
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Upload Your Resume</h1>
        <p className="mb-6 text-gray-500">
          Upload your PDF resume to generate your Ikigai profile.
        </p>
        
        {/* Pass the user ID so we can name the file correctly */}
        <UploadForm userId={user.id} />
      </div>
    </div>
  )
}