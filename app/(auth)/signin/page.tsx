'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use your Google account to continue.</p>
  <Button className="w-full" onClick={() => signIn('google', { callbackUrl: typeof window !== 'undefined' ? window.location.origin : '/' })}>Continue with Google</Button>
      </div>
    </div>
  )
}
