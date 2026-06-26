'use client'

import { useEffect, useRef, useCallback } from 'react'

interface ScannerOptions {
  onScan: (barcode: string) => void
  minLength?: number      // minimum barcode length (default 3)
  maxGap?: number        // max ms between keystrokes (default 50)
  enabled?: boolean      // toggle scanner on/off
}

export function useHardwareScanner({
  onScan,
  minLength = 3,
  maxGap = 50,
  enabled = true,
}: ScannerOptions) {
  const buffer = useRef('')
  const lastKeyTime = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const processBuffer = useCallback(() => {
    const code = buffer.current.trim()
    buffer.current = ''
    if (code.length >= minLength) {
      onScan(code)
    }
  }, [onScan, minLength])

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input manually
      // Scanner fires keys much faster than human typing
      const target = e.target as HTMLElement
      const isTextInput = (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )

      // Allow scanner in inputs ONLY if it is the 
      // dedicated barcode input field
      // (identified by data-scanner-input attribute)
      if (isTextInput && 
        !target.hasAttribute('data-scanner-input')) {
        return
      }

      const now = Date.now()
      const gap = now - lastKeyTime.current
      lastKeyTime.current = now

      // If gap too large — new scan starting, reset buffer
      if (gap > maxGap && buffer.current.length > 0) {
        buffer.current = ''
      }

      if (e.key === 'Enter') {
        // Enter = end of scan
        if (timerRef.current) clearTimeout(timerRef.current)
        processBuffer()
        e.preventDefault()
        return
      }

      // Only collect printable characters
      if (e.key.length === 1) {
        buffer.current += e.key
      }

      // Auto-process after 100ms of no new chars 
      // (fallback if scanner doesn't send Enter)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (buffer.current.length >= minLength) {
          processBuffer()
        } else {
          buffer.current = ''
        }
      }, 100)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, maxGap, minLength, processBuffer])
}
