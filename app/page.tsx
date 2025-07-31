"use client"

import dynamic from 'next/dynamic'
import { Loader2 } from "lucide-react"

// Dynamic import with SSR disabled to avoid window object issues
const VirtualAIAgentClient = dynamic(
  () => import('@/components/virtual-ai-agent-client'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-[#3533CD] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading AI Agent...</p>
      </div>
    </div>
  )
  }
)

export default function VirtualAIAgent() {
  return <VirtualAIAgentClient />
}
