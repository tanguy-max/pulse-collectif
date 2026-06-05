"use client"

import { useRef, useState, useEffect, useCallback } from "react"

const MAX_SECONDS = 60

type Props = {
  onClose: () => void
  // Appelé avec le blob brut — l'upload est géré par le parent
  onRecorded: (blob: Blob, duration: number) => void
}

type State = "idle" | "requesting" | "preview" | "recording" | "recorded"

export default function VideoRecorder({ onClose, onRecorded }: Props) {
  const [state, setState] = useState<State>("idle")
  const [error, setError] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobEvent["data"][]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef<HTMLVideoElement>(null)

  const startCamera = useCallback(async () => {
    setState("requesting")
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true })
      streamRef.current = stream
      setState("preview")
    } catch {
      setError("Accès caméra refusé. Vérifie les permissions de ton navigateur.")
      setState("idle")
    }
  }, [])

  useEffect(() => {
    if (state === "preview" && liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current
      liveVideoRef.current.play().catch(() => {})
    }
  }, [state])

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4"

    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      setRecordedBlob(blob)
      setBlobUrl(URL.createObjectURL(blob))
      setState("recorded")
      stopStream()
    }
    recorder.start(100)
    setState("recording")
    setElapsed(0)

    timerRef.current = setInterval(() => {
      setElapsed((s) => {
        if (s + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS }
        return s + 1
      })
    }, 1000)
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (state === "recorded" && blobUrl && playbackRef.current) {
      playbackRef.current.src = blobUrl
    }
  }, [state, blobUrl])

  function confirm() {
    if (!recordedBlob) return
    onRecorded(recordedBlob, elapsed)
  }

  function retry() {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null)
    setRecordedBlob(null)
    setElapsed(0)
    setState("idle")
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      stopStream()
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [])

  const remaining = MAX_SECONDS - elapsed
  const progress = (elapsed / MAX_SECONDS) * 100

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-t-3xl overflow-hidden">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-4 pb-6 pt-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Vidéo de la semaine</h3>
            <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
          </div>

          {/* Idle */}
          {state === "idle" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">📹</div>
              <div>
                <p className="font-medium text-gray-800">Enregistre un mot de la semaine</p>
                <p className="text-xs text-gray-400 mt-1">Max {MAX_SECONDS}s · Visible par l'équipe</p>
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg w-full">{error}</p>}
              <button onClick={startCamera} className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold">
                Ouvrir la caméra
              </button>
            </div>
          )}

          {/* Requesting */}
          {state === "requesting" && (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Accès caméra en cours…</p>
            </div>
          )}

          {/* Préview + recording */}
          {(state === "preview" || state === "recording") && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                <video ref={liveVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                {state === "recording" && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-red-400 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-white text-xs font-mono">{remaining}s</span>
                    </div>
                  </>
                )}
              </div>
              {state === "preview" && (
                <button onClick={startRecording} className="w-full py-3.5 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-white" />
                  Démarrer l'enregistrement
                </button>
              )}
              {state === "recording" && (
                <button onClick={stopRecording} className="w-full py-3.5 rounded-xl bg-gray-800 text-white font-semibold flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded bg-white" />
                  Arrêter ({remaining}s restantes)
                </button>
              )}
            </div>
          )}

          {/* Aperçu + confirmation */}
          {state === "recorded" && blobUrl && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <video ref={playbackRef} src={blobUrl} controls playsInline className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-center text-gray-400">Durée : {elapsed}s</p>
              <div className="flex gap-2">
                <button onClick={retry} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">
                  Recommencer
                </button>
                <button onClick={confirm} className="flex-1 py-3 rounded-xl bg-success text-white font-semibold">
                  Utiliser cette vidéo ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
