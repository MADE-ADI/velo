'use client'

import { useSession, signIn } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession()

  if (status === 'loading') {
    return null
  }

  return (
    <>
      {status === 'authenticated' ? children : null}
      <Dialog open={status === 'unauthenticated'}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              You need to sign in with Google to access this page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button onClick={() => signIn('google', { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/' })}>Sign in with Google</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
