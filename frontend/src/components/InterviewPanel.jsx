import React, { useEffect, useRef, useState } from 'react'
import { startSession, endSession, checkAnswer } from '../api/apiClient'

const QUESTIONS = [
  'Tell me about yourself.',
  'Why do you want this job?',
  'Describe a challenge you faced and how you overcame it.',
  'What are your greatest strengths?',
  'What is a weakness you are working to improve?',
  'Tell me about a time you worked in a team.',
  'Describe a situation where you showed leadership.',
  'How do you handle tight deadlines or pressure?',
  'Why should we hire you for this position?',
  'Where do you see yourself in five years?'
]

export default function InterviewPanel({ avatarUrl, sessionId, setSessionId, setFinalScores, setVisemes, audioRef }) {
  const [qIndex, setQIndex] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [correction, setCorrection] = useState('')
  const [scores, setScores] = useState(null)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const vadRafRef = useRef(0)
  const lastVoiceTsRef = useRef(0)
  const inputStreamRef = useRef(null)
  const vadConfigRef = useRef({ threshold: 0.01, silenceMs: 1200 })

  useEffect(() => {
    // auto-start session when avatar is set
    if (!sessionId && avatarUrl) {
      startSession(avatarUrl).then(res => setSessionId(res.session_id))
    }
  }, [avatarUrl])

  const playTTS = (tts) => {
    // Prefer server audio if present
    if (tts && tts.audio_b64) {
      const mime = tts.mime || 'audio/wav'
      const src = `data:${mime};base64,${tts.audio_b64}`
      const audio = new Audio(src)
      try {
        if (audioRef) audioRef.current = audio
      } catch (e) {}
      try {
        if (setVisemes) setVisemes(tts.visemes || [])
      } catch (e) {}
      audio.play().catch(() => {
        // Fallback to browser speech if playback fails
        if ('speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(tts.text || '')
          window.speechSynthesis.speak(utter)
        }
      })
      return
    }
    // No server audio: fallback to browser speech synthesis if available
    if ('speechSynthesis' in window && correction) {
      const utter = new SpeechSynthesisUtterance(correction)
      window.speechSynthesis.speak(utter)
    }
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    inputStreamRef.current = stream

    // Setup MediaRecorder
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []
      await submit(blob)
    }
    mediaRecorderRef.current = mr
    mr.start()
    setRecording(true)

    // Setup VAD using Web Audio API
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const audioCtx = new AudioCtx()
    audioCtxRef.current = audioCtx
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser
    source.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    lastVoiceTsRef.current = performance.now()

    const loop = () => {
      analyser.getFloatTimeDomainData(buf)
      // Compute RMS
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i]
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)
      const now = performance.now()
      if (rms > vadConfigRef.current.threshold) {
        lastVoiceTsRef.current = now
      }
      if (now - lastVoiceTsRef.current > vadConfigRef.current.silenceMs) {
        // Detected sustained silence, stop automatically
        stopRecording()
        return
      }
      vadRafRef.current = requestAnimationFrame(loop)
    }
    vadRafRef.current = requestAnimationFrame(loop)
  }

  const stopRecording = () => {
    try { mediaRecorderRef.current?.stop() } catch (e) {}
    setRecording(false)
    // Cleanup VAD
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current)
    vadRafRef.current = 0
    try { analyserRef.current?.disconnect() } catch (e) {}
    analyserRef.current = null
    try { audioCtxRef.current?.close() } catch (e) {}
    audioCtxRef.current = null
    // Stop mic tracks
    try { inputStreamRef.current?.getTracks()?.forEach(t => t.stop()) } catch (e) {}
    inputStreamRef.current = null
  }

  const submit = async (blob) => {
    const q = QUESTIONS[qIndex]
    const res = await checkAnswer(sessionId, q, blob)
    setTranscript(res.transcript)
    setCorrection(res.correction)
    setScores(res.scores)
    // Pass text as well for TTS fallback
    playTTS({ ...(res.tts||{}), text: res.correction })
    // TODO: drive avatar with res.tts.visemes
  }

  const nextQuestion = () => {
    setQIndex(i => Math.min(i + 1, QUESTIONS.length - 1))
    setTranscript('')
    setCorrection('')
    setScores(null)
    try { if (setVisemes) setVisemes([]) } catch (e) {}
    try { if (audioRef?.current) { audioRef.current.pause(); audioRef.current = null } } catch (e) {}
  }

  const finish = async () => {
    const res = await endSession(sessionId)
    setFinalScores(res.scores)
    try { if (setVisemes) setVisemes([]) } catch (e) {}
    try { if (audioRef?.current) { audioRef.current.pause(); audioRef.current = null } } catch (e) {}
  }

  // --- Diff helpers (word-level) ---
  const tokenize = (s) => (s || '').trim().split(/\s+/)
  const lcs = (a, b) => {
    const n = a.length, m = b.length
    const dp = Array.from({length: n+1}, () => Array(m+1).fill(0))
    for (let i=1;i<=n;i++) {
      for (let j=1;j<=m;j++) {
        if (a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1]+1
        else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])
      }
    }
    // reconstruct
    const ops = []
    let i=n, j=m
    while (i>0 && j>0) {
      if (a[i-1] === b[j-1]) { ops.push({type:'equal', a:a[i-1], b:b[j-1]}); i--; j--; }
      else if (dp[i-1][j] >= dp[i][j-1]) { ops.push({type:'del', a:a[i-1]}); i--; }
      else { ops.push({type:'ins', b:b[j-1]}); j--; }
    }
    while (i>0) { ops.push({type:'del', a:a[i-1]}); i--; }
    while (j>0) { ops.push({type:'ins', b:b[j-1]}); j--; }
    ops.reverse()
    return ops
  }

  const renderOriginalLine = (ops) => (
    <div>
      {ops.map((op, idx) => {
        if (op.type === 'equal' || op.type === 'ins') {
          const word = op.type === 'equal' ? op.a : ''
          return word ? <span key={idx}> {word}</span> : null
        }
        // deletions highlight (wrong in original)
        return <span key={idx} className="text-danger"> {op.a}</span>
      })}
    </div>
  )

  const renderCorrectedLine = (ops) => (
    <div>
      {ops.map((op, idx) => {
        if (op.type === 'equal' || op.type === 'del') {
          const word = op.type === 'equal' ? op.b : ''
          return word ? <span key={idx}> {word}</span> : null
        }
        // insertions highlight (corrections in final)
        return <span key={idx} className="text-success"> {op.b}</span>
      })}
    </div>
  )

  return (
    <div style={{marginTop:12}}>
      <div style={{padding:12, border:'1px solid #ddd', borderRadius:8}}>
        <div><b>Question {qIndex+1}/{QUESTIONS.length}:</b> {QUESTIONS[qIndex]}</div>
        <div className="d-flex align-items-center gap-2 mt-2">
          {!recording ? (
            <button className="btn btn-primary btn-lg rounded-pill" onClick={startRecording} disabled={!sessionId} aria-label="Start recording">
              <i className="bi bi-mic-fill me-2"></i>
              Start
            </button>
          ) : (
            <button className="btn btn-danger btn-lg rounded-pill" onClick={stopRecording} aria-label="Stop recording">
              <i className="bi bi-stop-fill me-2"></i>
              Stop
            </button>
          )}
          <button className="btn btn-outline-secondary" onClick={nextQuestion} aria-label="Next question">
            <i className="bi bi-skip-forward-fill me-1"></i>
            Next
          </button>
          <button className="btn btn-success" onClick={finish} aria-label="Finish interview">
            <i className="bi bi-flag-fill me-1"></i>
            Finish
          </button>
          {recording && (
            <span className="badge bg-danger ms-2">
              <span className="me-1">●</span> Recording
            </span>
          )}
        </div>
      </div>

      {transcript && (
        <div style={{marginTop:12}}>
          <b>Transcript</b>
          <div>{transcript}</div>
        </div>
      )}

      {correction && (
        <div style={{marginTop:12}}>
          <b>Correction</b>
          <div>{correction}</div>
        </div>
      )}

      {transcript && correction && (
        <div className="mt-3">
          <b>Highlights</b>
          {(() => {
            const ops = lcs(tokenize(transcript), tokenize(correction))
            return (
              <div className="mt-2">
                <div className="small text-muted">Original (errors in red)</div>
                <div className="p-2 border rounded mb-2 bg-light">
                  {renderOriginalLine(ops)}
                </div>
                <div className="small text-muted">Corrected (fixes in green)</div>
                <div className="p-2 border rounded">
                  {renderCorrectedLine(ops)}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {scores && (
        <div style={{marginTop:12}}>
          <b>Scores</b>
          <div>Grammar: {scores.grammar} | Pronunciation: {scores.pronunciation} | Semantic: {scores.semantic} | Fluency: {scores.fluency}</div>
        </div>
      )}
    </div>
  )}
