'use client'

interface Props {
  signals: string[]
  brief: string
  idea: string
  onOverride: () => void
}

export default function AgencyGate({ signals, onOverride }: Props) {
  return (
    <div style={{
      background: 'rgba(255,200,0,0.07)',
      border: '1px solid rgba(255,200,0,0.25)',
      borderRadius: 12,
      padding: '16px 20px',
      marginTop: 8,
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#FFD60A' }}>
        Looks like an agency-scale build
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
        Detected: {signals.join(', ')}. This brief may be better suited for a custom engagement.
      </p>
      <button
        onClick={onOverride}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          padding: '6px 14px',
          cursor: 'pointer',
        }}
      >
        Continue anyway →
      </button>
    </div>
  )
}
