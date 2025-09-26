import React from 'react'

export default function ScoreReport({ scores }) {
  if (!scores) return null
  const keys = ['grammar','pronunciation','semantic','fluency','final']
  return (
    <div style={{marginTop:16, padding:12, border:'1px solid #ddd', borderRadius:8}}>
      <h3>Final Scores</h3>
      <ul>
        {keys.map(k => (
          <li key={k}><b>{k}</b>: {scores[k]}</li>
        ))}
      </ul>
    </div>
  )
}
