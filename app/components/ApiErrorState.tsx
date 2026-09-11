'use client'

interface Props {
  message?: string
  requestId?: string
  onRetry?: () => void
  offline?: boolean
}

export default function ApiErrorState({ message, requestId, onRetry, offline }: Props) {
  return (
    <div style={{
      background: '#FFF2F2', border: '0.5px solid rgba(255,59,48,.15)',
      borderRadius: 12, padding: '16px 20px',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{offline ? '📡' : '⚠️'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#D70015', marginBottom: 4 }}>
            {offline ? 'You appear to be offline' : 'Something went wrong'}
          </div>
          <div style={{ fontSize: 13, color: '#6E6E73', lineHeight: 1.5 }}>
            {offline
              ? 'Check your connection and try again — your work is saved.'
              : (message || 'An unexpected error occurred. Your input is preserved.')}
          </div>
          {requestId && (
            <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 6, fontFamily: 'monospace' }}>
              ID: {requestId}
            </div>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              flexShrink: 0, background: 'transparent', border: '1px solid rgba(215,0,21,.3)',
              borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 500,
              color: '#D70015', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
