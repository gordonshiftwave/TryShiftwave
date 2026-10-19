import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  onerror: ((event: Event & { error?: string }) => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
}

type SpeechRecognitionResultEvent = Event & {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      0: { transcript: string }
    }
  }
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null && window.isSecureContext
}

export const speechVisitorNotes = {
  unsupported: "Voice search isn't available in this browser. Type a ZIP or city instead.",
  denied: 'Microphone permission is off. Type a ZIP or city instead.',
  noMic: 'No microphone found. Type a ZIP or city instead.',
  network: 'Voice search needs a connection. Type a ZIP or city instead.',
  noSpeech: "Didn't catch that. Tap the mic and try again.",
  failed: "Voice search didn't work. Type a ZIP or city instead.",
  listening: 'Listening. Your words appear in the search box. Tap the mic to stop.',
} as const

const UNSUPPORTED_MESSAGE = speechVisitorNotes.unsupported

function messageForError(code?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return speechVisitorNotes.denied
    case 'audio-capture':
      return speechVisitorNotes.noMic
    case 'network':
      return speechVisitorNotes.network
    case 'no-speech':
      return speechVisitorNotes.noSpeech
    case 'aborted':
      return ''
    default:
      return speechVisitorNotes.failed
  }
}

type UsePushToTalkArgs = {
  onTranscript: (value: string) => void
  onFinal: (value: string) => void
  disabled?: boolean
}

export function usePushToTalk({ onTranscript, onFinal, disabled = false }: UsePushToTalkArgs) {
  const [listening, setListening] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const listeningRef = useRef(false)
  const finalRef = useRef('')
  const liveRef = useRef('')
  const userStoppedRef = useRef(false)
  const sessionRef = useRef(0)
  const onTranscriptRef = useRef(onTranscript)
  const onFinalRef = useRef(onFinal)

  onTranscriptRef.current = onTranscript
  onFinalRef.current = onFinal

  const supported = speechRecognitionSupported()

  const stop = useCallback(() => {
    const rec = recognitionRef.current
    listeningRef.current = false
    setListening(false)
    if (!rec) return
    try {
      rec.stop()
    } catch {
      try {
        rec.abort()
      } catch {
        /* already stopped */
      }
    }
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    if (!supported) {
      setNote(UNSUPPORTED_MESSAGE)
      return
    }

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setNote(UNSUPPORTED_MESSAGE)
      return
    }

    const previous = recognitionRef.current
    recognitionRef.current = null
    try {
      previous?.abort()
    } catch {
      /* replace */
    }

    sessionRef.current += 1
    const session = sessionRef.current
    finalRef.current = ''
    liveRef.current = ''
    userStoppedRef.current = false
    setNote(speechVisitorNotes.listening)

    const rec = new Ctor()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => {
      if (session !== sessionRef.current) return
      listeningRef.current = true
      setListening(true)
    }

    rec.onresult = (event) => {
      if (session !== sessionRef.current) return
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) finalText += piece
        else interim += piece
      }
      const live = (finalText || interim).trim()
      if (live) {
        liveRef.current = live
        onTranscriptRef.current(live)
      }
      if (finalText.trim()) {
        finalRef.current = finalText.trim()
        stop()
      }
    }

    rec.onerror = (event) => {
      if (session !== sessionRef.current) return
      const message = messageForError(event.error)
      if (message) setNote(message)
      listeningRef.current = false
      setListening(false)
    }

    rec.onend = () => {
      if (session !== sessionRef.current) return
      const userStopped = userStoppedRef.current
      userStoppedRef.current = false
      listeningRef.current = false
      setListening(false)
      if (recognitionRef.current === rec) recognitionRef.current = null
      const finalText = (finalRef.current || liveRef.current).trim()
      finalRef.current = ''
      liveRef.current = ''
      if (finalText) {
        setNote(null)
        onFinalRef.current(finalText)
        return
      }
      if (!userStopped) {
        setNote((current) =>
          current && current.startsWith('Listening')
            ? speechVisitorNotes.noSpeech
            : current,
        )
      } else {
        setNote(null)
      }
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      setNote(UNSUPPORTED_MESSAGE)
      listeningRef.current = false
      setListening(false)
      if (recognitionRef.current === rec) recognitionRef.current = null
    }
  }, [disabled, stop, supported])

  const toggle = useCallback(() => {
    if (listeningRef.current) {
      userStoppedRef.current = true
      if (liveRef.current.trim()) finalRef.current = liveRef.current.trim()
      stop()
    } else {
      start()
    }
  }, [start, stop])

  /** Drop the session without searching — used when the user takes over by typing. */
  const cancel = useCallback(() => {
    sessionRef.current += 1
    finalRef.current = ''
    liveRef.current = ''
    userStoppedRef.current = true
    listeningRef.current = false
    setListening(false)
    setNote(null)
    const rec = recognitionRef.current
    recognitionRef.current = null
    try {
      rec?.abort()
    } catch {
      /* already stopped */
    }
  }, [])

  useEffect(() => {
    return () => {
      sessionRef.current += 1
      listeningRef.current = false
      const rec = recognitionRef.current
      recognitionRef.current = null
      try {
        rec?.abort()
      } catch {
        /* unmount */
      }
    }
  }, [])

  useEffect(() => {
    if (disabled && listeningRef.current) stop()
  }, [disabled, stop])

  return { listening, note, supported, toggle, stop, cancel }
}
