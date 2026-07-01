'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PhoneScannerOptions {
  onScan: (barcode: string) => void
}

// Module-level state to persist connection across tab navigation
let globalSessionId: string | null = null
let globalIsConnected = false
let globalChannel: RealtimeChannel | null = null
let globalOnScan: ((barcode: string) => void) | null = null

const listeners = new Set<() => void>()
function notify() { listeners.forEach(cb => cb()) }

export function usePhoneScanner({ onScan }: PhoneScannerOptions) {
  const [sessionId, setSessionId] = useState<string | null>(globalSessionId)
  const [isConnected, setIsConnected] = useState(globalIsConnected)

  // Keep the latest onScan reference globally
  useEffect(() => {
    globalOnScan = onScan
    return () => {
      if (globalOnScan === onScan) {
        globalOnScan = null
      }
    }
  }, [onScan])

  // Sync component state with global state
  useEffect(() => {
    const handler = () => {
      setSessionId(globalSessionId)
      setIsConnected(globalIsConnected)
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  const startSession = useCallback(() => {
    if (globalChannel) return // Already running

    const supabase = createClient()
    // Generate a random 6-char session code
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    globalSessionId = id
    notify()

    const channel = supabase.channel(`scan:${id}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'barcode' }, (payload: { payload?: { code?: string } }) => {
        const barcode = payload.payload?.code
        if (barcode && typeof barcode === 'string' && globalOnScan) {
          globalOnScan(barcode)
        }
      })
      .on('presence', { event: 'join' }, () => {
        globalIsConnected = true
        notify()
      })
      .on('presence', { event: 'leave' }, () => {
        globalIsConnected = false
        notify()
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'web' })
        }
      })

    globalChannel = channel
  }, [])

  const stopSession = useCallback(() => {
    if (globalChannel) {
      const supabase = createClient()
      supabase.removeChannel(globalChannel)
      globalChannel = null
    }
    globalSessionId = null
    globalIsConnected = false
    notify()
  }, [])

  return { sessionId, isConnected, startSession, stopSession }
}
