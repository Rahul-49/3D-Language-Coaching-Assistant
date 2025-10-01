import React, { useEffect, useRef, useState } from 'react'
import { startSession, endSession, checkAnswer, tts } from '../api/apiClient'

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
  const [allowNext, setAllowNext] = useState(false)
  const [advanceCountdown, setAdvanceCountdown] = useState(0)
  const [recording, setRecording] = useState(false)
  const [preferredVoice, setPreferredVoice] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const vadRafRef = useRef(0)
  const lastVoiceTsRef = useRef(0)
  const inputStreamRef = useRef(null)
  const vadConfigRef = useRef({ threshold: 0.01, silenceMs: 1200 })
  const advanceTimerRef = useRef(null)
  const advanceIntervalRef = useRef(null)
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)

  const USE_DUMMY_VISEMES = false

  const makeDummyVisemes = (text = '') => {
    try {
      const words = Math.max(1, String(text).trim().split(/\s+/).length)
      const duration = Math.max(0.8, Math.min(6.0, (words / 160) * 60))
      const labels = ['A','B','C','D','E','F']
      const step = 0.08
      const vis = []
      let t = 0, i = 0
      while (t < duration) {
        const start = t
        const end = Math.min(duration, t + step)
        vis.push({ start, end, value: labels[i % labels.length] })
        t += step
        i++
      }
      return vis
    } catch { return [] }
  }

  const cancelBrowserSpeech = () => {
    try { window.speechSynthesis?.cancel() } catch (e) {}
  }

  const pickFemaleBrowserVoice = () => {
    try {
      if (!('speechSynthesis' in window)) return null
      const voices = window.speechSynthesis.getVoices?.() || []
      const hints = ['female','Jenny','Aria','Zira','Salli','Kimberly','Ava','Amy','Emma','Google US English','en-US']
      for (const hint of hints) {
        const v = voices.find(v => (v.name||'').toLowerCase().includes(hint.toLowerCase()))
        if (v) return v
      }
      const en = voices.find(v => (v.lang||'').toLowerCase().startsWith('en'))
      return en || voices[0] || null
    } catch { return null }
  }

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const assign = () => {
      try {
        const v = pickFemaleBrowserVoice()
        if (v) setPreferredVoice(v)
      } catch (e) {}
    }
    assign()
    try {
      window.speechSynthesis.addEventListener('voiceschanged', assign)
      return () => window.speechSynthesis.removeEventListener('voiceschanged', assign)
    } catch (e) {}
  }, [])

  const playNextInQueue = () => {
    if (isPlayingRef.current) return
    const item = audioQueueRef.current.shift()
    if (!item) return
    isPlayingRef.current = true
    try { if (audioRef?.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null } } catch (e) {}
    try {
      const has = (Array.isArray(item.visemes) && item.visemes.length)
      const v = has ? item.visemes : (USE_DUMMY_VISEMES ? makeDummyVisemes(item.text || '') : [])
      setVisemes?.(v)
    } catch (e) {}
    audioRef.current = item.audio
    const onEnded = () => {
      try { item.audio.removeEventListener('ended', onEnded) } catch (e) {}
      try { item.audio.removeEventListener('pause', onEnded) } catch (e) {}
      isPlayingRef.current = false
      setTimeout(() => { try { setVisemes?.([]) } catch (e) {} }, 150)
      playNextInQueue()
    }
    const onPlay = () => { cancelBrowserSpeech() }
    try {
      item.audio.addEventListener('ended', onEnded)
      item.audio.addEventListener('pause', onEnded)
      item.audio.addEventListener('play', onPlay)
    } catch (e) {}
    item.audio.play().catch((err) => {
      if ('speechSynthesis' in window) {
        cancelBrowserSpeech()
        const utter = new SpeechSynthesisUtterance(item.text || '')
        const v = preferredVoice || pickFemaleBrowserVoice(); if (v) utter.voice = v
        window.speechSynthesis.speak(utter)
      }
      isPlayingRef.current = false
      setTimeout(() => { try { setVisemes?.([]) } catch (e) {} }, 150)
      playNextInQueue()
    })
  }

  useEffect(() => {
    if (!sessionId && avatarUrl) {
      startSession(avatarUrl).then(res => setSessionId(res.session_id))
    }
  }, [avatarUrl])

  useEffect(() => {
    return () => {
      try { if (advanceIntervalRef.current) clearInterval(advanceIntervalRef.current) } catch (e) {}
      try { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current) } catch (e) {}
      advanceIntervalRef.current = null
      advanceTimerRef.current = null
      try { if (audioRef?.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null } } catch (e) {}
      audioQueueRef.current = []
      isPlayingRef.current = false
    }
  }, [])

  const playTTS = (tts) => {
    cancelBrowserSpeech()
    if (tts && tts.audio_b64) {
      const mime = tts.mime || 'audio/wav'
      const src = `data:${mime};base64,${tts.audio_b64}`
      const audio = new Audio(src)
      const item = { audio, visemes: tts.visemes || [], text: tts.text || '' }
      audioQueueRef.current.push(item)
      playNextInQueue()
      return
    }
    try {
      if (setVisemes) {
        let list = tts?.visemes || []
        if ((!Array.isArray(list) || list.length === 0) && USE_DUMMY_VISEMES) {
          list = makeDummyVisemes(tts?.text || correction)
        }
        setVisemes(list)
      }
    } catch (e) {}
    if ('speechSynthesis' in window && (tts?.text || correction)) {
      cancelBrowserSpeech()
      const utter = new SpeechSynthesisUtterance(tts?.text || correction)
      const v = preferredVoice || pickFemaleBrowserVoice(); if (v) utter.voice = v
      window.speechSynthesis.speak(utter)
    }
  }

  const speakQuestion = async (text) => {
    try {
      const res = await tts(text, avatarUrl)
      playTTS({ ...(res||{}), text })
    } catch (err) {
      if ('speechSynthesis' in window) {
        cancelBrowserSpeech()
        const utter = new SpeechSynthesisUtterance(text)
        const v = preferredVoice || pickFemaleBrowserVoice(); if (v) utter.voice = v
        utter.rate = 1
        utter.pitch = 1
        window.speechSynthesis.speak(utter)
      }
    }
  }

  useEffect(() => {
    const q = QUESTIONS[qIndex]
    if (q) speakQuestion(q)
  }, [qIndex])

  const startRecording = async () => {
    try { if (audioRef?.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null } } catch (e) {}
    audioQueueRef.current = []
    isPlayingRef.current = false
    cancelBrowserSpeech()

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    inputStreamRef.current = stream

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
    if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current)
    vadRafRef.current = 0
    try { analyserRef.current?.disconnect() } catch (e) {}
    analyserRef.current = null
    try { audioCtxRef.current?.close() } catch (e) {}
    audioCtxRef.current = null
    try { inputStreamRef.current?.getTracks()?.forEach(t => t.stop()) } catch (e) {}
    inputStreamRef.current = null
  }

  const submit = async (blob) => {
    const q = QUESTIONS[qIndex]
    const res = await checkAnswer(sessionId, q, blob)
    setTranscript(res.transcript)
    setCorrection(res.correction)
    setScores(res.scores)
    try {
      if (res?.tts?.audio_b64) {
        playTTS({ ...(res.tts||{}), text: res.correction })
      } else if (res?.correction) {
        const ttsRes = await tts(res.correction, avatarUrl)
        playTTS({ ...(ttsRes||{}), text: res.correction })
      }
    } catch (e) {
      try {
        if ('speechSynthesis' in window && res?.correction) {
          cancelBrowserSpeech()
          const utter = new SpeechSynthesisUtterance(res.correction)
          const v = preferredVoice || pickFemaleBrowserVoice(); if (v) utter.voice = v
          window.speechSynthesis.speak(utter)
        }
      } catch (e2) {}
    }
    try {
      const s = res.scores || {}
      const vals = [s.grammar, s.pronunciation, s.semantic, s.fluency].filter(v => typeof v === 'number')
      const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0
      const ok = avg >= 0.7
      if (ok) {
        setAllowNext(false)
        setAdvanceCountdown(10)
        try { window.speechSynthesis?.cancel() } catch (e) {}
        try {
          const praiseText = 'Great job! Review your scores. Next question will start shortly.'
          tts(praiseText, avatarUrl).then((ttsRes) => {
            playTTS({ ...(ttsRes||{}), text: praiseText })
          }).catch(() => {
            if ('speechSynthesis' in window) {
              cancelBrowserSpeech()
              const praise = new SpeechSynthesisUtterance(praiseText)
              const v = pickFemaleBrowserVoice(); if (v) praise.voice = v
              window.speechSynthesis.speak(praise)
            }
          })
        } catch (e) {}
        if (advanceIntervalRef.current) clearInterval(advanceIntervalRef.current)
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
        advanceIntervalRef.current = setInterval(() => {
          setAdvanceCountdown((c) => {
            if (c <= 1) {
              clearInterval(advanceIntervalRef.current)
              advanceIntervalRef.current = null
              return 0
            }
            return c - 1
          })
        }, 1000)
        if (qIndex < QUESTIONS.length - 1) {
          advanceTimerRef.current = setTimeout(() => {
            advanceTimerRef.current = null
            nextQuestion()
          }, 10000)
        }
      } else {
        setAllowNext(false)
        setAdvanceCountdown(0)
        if (advanceIntervalRef.current) { clearInterval(advanceIntervalRef.current); advanceIntervalRef.current = null }
        if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null }
      }
    } catch (e) {}
  }

  const nextQuestion = () => {
    setQIndex(i => Math.min(i + 1, QUESTIONS.length - 1))
    setTranscript('')
    setCorrection('')
    setScores(null)
    setAllowNext(false)
    setAdvanceCountdown(0)
    if (advanceIntervalRef.current) { clearInterval(advanceIntervalRef.current); advanceIntervalRef.current = null }
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null }
    try { if (setVisemes) setVisemes([]) } catch (e) {}
    try { if (audioRef?.current) { audioRef.current.pause(); audioRef.current.src=''; audioRef.current = null } } catch (e) {}
    audioQueueRef.current = []
    isPlayingRef.current = false
  }

  const finish = async () => {
    const res = await endSession(sessionId)
    setFinalScores(res.scores)
    try { if (setVisemes) setVisemes([]) } catch (e) {}
    try { if (audioRef?.current) { audioRef.current.pause(); audioRef.current.src=''; audioRef.current = null } } catch (e) {}
    audioQueueRef.current = []
    isPlayingRef.current = false
  }

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
    <div className="lh-lg">
      {ops.map((op, idx) => {
        if (op.type === 'equal' || op.type === 'ins') {
          const word = op.type === 'equal' ? op.a : ''
          return word ? <span key={idx} className="text-light"> {word}</span> : null
        }
        return <span key={idx} className="text-danger bg-danger bg-opacity-25 px-1 rounded"> {op.a}</span>
      })}
    </div>
  )

  const renderCorrectedLine = (ops) => (
    <div className="lh-lg">
      {ops.map((op, idx) => {
        if (op.type === 'equal' || op.type === 'del') {
          const word = op.type === 'equal' ? op.b : ''
          return word ? <span key={idx} className="text-light"> {word}</span> : null
        }
        return <span key={idx} className="text-success bg-success bg-opacity-25 px-1 rounded"> {op.b}</span>
      })}
    </div>
  )

  const progress = ((qIndex + 1) / QUESTIONS.length) * 100
  const s = scores || {}
  const vals = [s.grammar, s.pronunciation, s.semantic, s.fluency].filter(v => typeof v === 'number')
  const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : 0
  const ok = avg >= 0.7

  return (
    <div>
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
          color: white;
        }
        .btn-gradient:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .btn-red-gradient {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: none;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-red-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.5);
          color: white;
        }
        .btn-green-gradient {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-green-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
          color: white;
        }
        .btn-outline-custom {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-outline-custom:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }
        .btn-outline-custom:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .progress-gradient {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        .question-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(244, 114, 182, 0.2) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
        }
        .question-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 150px;
          height: 150px;
          background: rgba(102, 126, 234, 0.3);
          border-radius: 50%;
          filter: blur(60px);
        }
        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .metric-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }
        .metric-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .gradient-text-purple {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-blue {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-pink {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .status-success {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-error {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
      `}</style>

      <div className="mb-4">
        {/* Progress Bar */}
        <div className="glass-card rounded-pill overflow-hidden" style={{ height: '8px' }}>
          <div 
            className="progress-gradient h-100 transition-all" 
            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="question-card rounded-4 p-4 mb-4 position-relative">
        <div className="position-relative">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                   style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                {qIndex + 1}
              </div>
              <span className="text-white-50 small">Question {qIndex + 1} of {QUESTIONS.length}</span>
            </div>
            {recording && (
              <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" 
                   style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div className="rounded-circle bg-danger pulse-dot" style={{ width: '8px', height: '8px' }}></div>
                <span className="small fw-semibold text-danger">Recording</span>
              </div>
            )}
          </div>
          <p className="fs-5 fw-medium text-white mb-0 lh-lg">{QUESTIONS[qIndex]}</p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        {!recording ? (
          <button 
            className="btn btn-gradient rounded-pill px-4 py-2 d-flex align-items-center gap-2"
            onClick={startRecording} 
            disabled={!sessionId}
          >
            <i className="bi bi-mic-fill"></i>
            <span>Start Recording</span>
          </button>
        ) : (
          <button 
            className="btn btn-red-gradient rounded-pill px-4 py-2 d-flex align-items-center gap-2"
            onClick={stopRecording}
          >
            <i className="bi bi-stop-fill"></i>
            <span>Stop Recording</span>
          </button>
        )}
        
        <button 
          className="btn btn-outline-custom rounded-pill px-4 py-2 d-flex align-items-center gap-2"
          onClick={nextQuestion} 
          disabled={!allowNext || recording}
          title={!allowNext ? 'Answer satisfactorily to unlock Next' : 'Next question'}
        >
          <i className="bi bi-skip-forward-fill"></i>
          <span>Next</span>
        </button>
        
        <button 
          className="btn btn-green-gradient rounded-pill px-4 py-2 d-flex align-items-center gap-2"
          onClick={finish}
        >
          <i className="bi bi-flag-fill"></i>
          <span>Finish</span>
        </button>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="glass-card rounded-4 p-4 mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-lightning-charge-fill text-info"></i>
            <h5 className="mb-0 fw-semibold">Your Response</h5>
          </div>
          <p className="text-light lh-lg mb-0">{transcript}</p>
        </div>
      )}

      {/* Correction */}
      {correction && (
        <div className="glass-card rounded-4 p-4 mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-check-circle-fill text-success"></i>
            <h5 className="mb-0 fw-semibold">AI Correction</h5>
          </div>
          <p className="text-light lh-lg mb-0">{correction}</p>
        </div>
      )}

      {/* Highlights */}
      {transcript && correction && (
        <div className="glass-card rounded-4 p-4 mb-4">
          <div className="d-flex align-items-center gap-2 mb-4">
            <i className="bi bi-graph-up-arrow text-primary"></i>
            <h5 className="mb-0 fw-semibold">Detailed Analysis</h5>
          </div>
          {(() => {
            const ops = lcs(tokenize(transcript), tokenize(correction))
            return (
              <div>
                <div className="mb-3">
                  <div className="small text-white-50 mb-2">Original (errors in red)</div>
                  <div className="p-3 rounded-3" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {renderOriginalLine(ops)}
                  </div>
                </div>
                <div>
                  <div className="small text-white-50 mb-2">Corrected (fixes in green)</div>
                  <div className="p-3 rounded-3" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {renderCorrectedLine(ops)}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Scores */}
      {scores && (
        <div className="glass-card rounded-3 p-3" 
             style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(244, 114, 182, 0.15) 100%)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <h6 className="fw-semibold mb-3">Performance Metrics</h6>
          <div className="row g-2 mb-3">
            {[
              { label: 'Grammar', value: scores.grammar, gradientClass: 'gradient-text-purple', icon: 'bi-pencil-fill', gradient: '#8b5cf6, #6366f1', bgGradient: 'rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05)' },
              { label: 'Pronunciation', value: scores.pronunciation, gradientClass: 'gradient-text-blue', icon: 'bi-soundwave', gradient: '#06b6d4, #3b82f6', bgGradient: 'rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.05)' },
              { label: 'Semantic', value: scores.semantic, gradientClass: 'gradient-text-pink', icon: 'bi-brain', gradient: '#ec4899, #f97316', bgGradient: 'rgba(236, 72, 153, 0.1), rgba(249, 115, 22, 0.05)' },
              { label: 'Fluency', value: scores.fluency, gradientClass: 'gradient-text-green', icon: 'bi-arrow-repeat', gradient: '#10b981, #14b8a6', bgGradient: 'rgba(16, 185, 129, 0.1), rgba(20, 184, 166, 0.05)' }
            ].map((metric, idx) => (
              <div key={idx} className="col-6">
                <div className="metric-card rounded-3 p-2 position-relative" style={{ background: `linear-gradient(135deg, ${metric.bgGradient})`, border: '1px solid rgba(255, 255, 255, 0.15)', transition: 'all 0.3s ease' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${metric.gradient})`, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' }}>
                      <i className={`bi ${metric.icon} text-white`} style={{ fontSize: '1rem' }}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="text-white-50 fw-medium" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>{metric.label}</div>
                      <div className="d-flex align-items-baseline gap-1">
                        <div className={`${metric.gradientClass} fw-bold`} style={{ fontSize: '1.4rem', lineHeight: 1 }}>
                          {typeof metric.value === 'number' ? Math.round(metric.value) : 'N/A'}
                        </div>
                        {typeof metric.value === 'number' && <span className="text-white-50 fw-medium" style={{ fontSize: '0.75rem' }}>%</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Status Message */}
          <div className={`d-flex align-items-center gap-3 p-3 rounded-3 ${ok ? 'status-success' : 'status-error'}`}>
            <i className={`bi ${ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} fs-5`}></i>
            <div className="flex-grow-1">
              <p className={`mb-0 fw-medium ${ok ? 'text-success' : 'text-danger'}`}>
                {ok ? (
                  advanceCountdown > 0
                    ? `Excellent work! Moving to next question in ${advanceCountdown}s...`
                    : 'Great job! You can proceed to the next question.'
                ) : (
                  `Score below 0.70. Please retry to unlock Next.`
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}