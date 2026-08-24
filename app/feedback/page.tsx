import { Metadata } from 'next'
import FeedbackForm from '@/components/FeedbackForm'

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Tell BhaavBrief what works, what doesn\'t, and what would make it more useful for your MCX trading or investing.',
  alternates: { canonical: 'https://bhaavbrief.in/feedback' },
  robots: { index: false, follow: true },
}

export default function FeedbackPage() {
  return <FeedbackForm />
}
