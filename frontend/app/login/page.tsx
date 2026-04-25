'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/')
      }
    }
    checkUser()
  }, [supabase, router])

  const handleSignUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) setMessage(error.message)
    else setMessage('Check your email for the confirmation link!')
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
        setMessage(error.message)
    } else {
        router.push('/') // Redirect to home on success
        router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex h-full items-top justify-center bg-200 p-4 overflow-hidden">
      <div className="w-full max-w-md space-y-8 rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-text font-serif">
            Sign in to IkigAI
          </h2>
          <p className="mt-2 text-sm text-secondary-text">Create an account or sign in to continue</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md bg-100 p-2 text-text focus:border-primary focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md bg-100 p-2 text-text focus:border-primary focus:ring-primary"
            />
          </div>

          {message && <p className="text-sm text-danger">{message}</p>}

          <div className="flex gap-4">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 rounded-md bg-100 px-4 py-2 text-text hover:bg-400 disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}