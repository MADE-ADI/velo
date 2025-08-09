'use client'

import { signOut, useSession } from 'next-auth/react'
import { Button, type ButtonProps } from '@/components/ui/button'

type Props = ButtonProps & { children?: React.ReactNode }

export function SignOutButton({ children = 'Logout', ...props }: Props) {
  const { status } = useSession()
  if (status !== 'authenticated') return null

  const onClick = () =>
    signOut({ callbackUrl: typeof window !== 'undefined' ? window.location.origin : '/' })

  return (
    <Button onClick={onClick} {...props}>
      {children}
    </Button>
  )
}
