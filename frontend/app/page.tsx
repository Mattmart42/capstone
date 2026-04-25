import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import FlowerIcon from '@/components/navbar'
import { checkOnboardingStatus } from '@/utils/onboarding'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const isComplete = await checkOnboardingStatus(user.id)
    if (!isComplete) {
      redirect('/onboarding')
    }
  }

  return (
    <main className="flex h-full flex-col items-center justify-center p-24 bg-200 text-text overflow-hidden">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="fixed left-0 top-0 flex w-full justify-center bg-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:bg-200 lg:p-4">
          <div className="relative">
            <FlowerIcon className="h-50 w-50 text-primary" />
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold font-serif tracking-tight">
              Ikig.<span className="text-primary group-hover:italic transition-all">AI</span>
            </span>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-surface lg:static lg:h-auto lg:w-auto lg:bg-none">
          <Link 
            href={user ? "/chat" : "/login"}
            className="rounded-full border border-transparent bg-primary px-8 py-3 text-base font-serif font-medium text-white hover:bg-primary-hover md:text-lg md:px-10"
          >
            {user ? "Go to Dashboard" : "Login / Sign Up"}
          </Link>
        </div>
      </div>

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-surface before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:lg:h-[360px] z-[-1]">
        <h1 className="text-6xl font-bold tracking-tight font-serif">
          Find Your <span className="text-primary">Ikigai</span>
        </h1>
      </div>
    </main>
  )
}