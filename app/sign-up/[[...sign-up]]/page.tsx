import { SignUp } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up — BhaavBrief',
  robots: { index: false },
}

export default function SignUpPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <SignUp />
    </div>
  )
}
