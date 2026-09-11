'use client'
import { useEffect, useRef } from 'react'
import type { FunnelStep } from '@/app/lib/funnel'

export default function FunnelBeacon({ step }: { step: FunnelStep }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    fetch('/api/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step }),
    }).catch(() => {})
  }, [step])
  return null
}
