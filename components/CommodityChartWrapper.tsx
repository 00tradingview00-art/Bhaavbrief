'use client'
import dynamic from 'next/dynamic'

const CommodityChart = dynamic(() => import('./CommodityChart'), { ssr: false })

interface Props {
  commodity: string
  color:     string
  unit:      string
}

export default function CommodityChartWrapper(props: Props) {
  return <CommodityChart {...props} />
}
