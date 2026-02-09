'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function UploadForm({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage('Uploading to storage...')

    try {
      // 1. Upload to Supabase Storage (Keep this part)
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. NEW: Call your Python Backend
      setMessage('Analyzing resume...')
      
      const response = await fetch('http://127.0.0.1:8000/process-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          file_path: fileName, // The backend needs this path to find the file
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process resume')
      }

      setMessage(`Success! Found ${data.extracted_text_preview.length} characters of text.`)
      console.log("Server Response:", data)
      
    } catch (error: any) {
      console.error(error)
      setMessage(`Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">PDF only (MAX. 5MB)</p>
          </div>
          <input id="dropzone-file" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
        </label>
      </div>
      
      {file && <p className="text-sm text-green-600">Selected: {file.name}</p>}

      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Analyze Resume'}
      </button>

      {message && <p className="text-center text-sm font-medium text-gray-900">{message}</p>}
    </div>
  )
}