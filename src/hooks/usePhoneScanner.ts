'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PhoneScannerOptions {
  onScan: (barcode: string) => void
}

export function usePhoneScanner({ onScan }: PhoneScannerOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const startSession = useCallback(() => {
    const supabase = createClient()
    // Generate a random 6-char session code
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    setSessionId(id)

    const channel = supabase.channel(`scan:${id}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'barcode' }, (payload: { payload?: { code?: string } }) => {
        const barcode = payload.payload?.code
        if (barcode && typeof barcode === 'string') {
          onScan(barcode)
        }
      })
      .on('presence', { event: 'join' }, () => {
        setIsConnected(true)
      })
      .on('presence', { event: 'leave' }, () => {
        setIsConnected(false)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'web' })
        }
      })

    channelRef.current = channel
  }, [onScan])

  const stopSession = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setSessionId(null)
    setIsConnected(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  return { sessionId, isConnected, startSession, stopSession }
}
