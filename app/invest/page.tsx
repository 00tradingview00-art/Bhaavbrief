import InvestPage from '@/components/InvestPage'

export const metadata = {
  title: 'Invest in Commodities — ETFs, Stocks & Mutual Funds',
  description: 'How to invest in commodities from India. Gold ETFs, Silver ETFs, commodity mutual funds, mining stocks — Indian and global options accessible via Zerodha, Groww, Vested and INDmoney.',
  alternates: { canonical: 'https://bhaavbrief.in/invest' },
  openGraph: {
    title: 'Invest in Commodities from India | BhaavBrief',
    description: 'Gold ETFs, Silver ETFs, commodity mutual funds and mining stocks — Indian and global options. How to invest in commodities from India.',
    url: 'https://bhaavbrief.in/invest',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'Invest in Commodities | BhaavBrief', description: 'Gold ETFs, Silver ETFs, commodity MFs and mining stocks — accessible from India.', site: '@bhaavbrief' },
}

export default function Page() {
  return <InvestPage />
}
