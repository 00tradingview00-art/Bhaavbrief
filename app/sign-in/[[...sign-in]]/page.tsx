import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — BhaavBrief',
  robots: { index: false },
}

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <SignIn />
    </div>
  )
}
