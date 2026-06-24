'use client'

export function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        background: 'transparent',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '6px 14px',
        fontSize: '13px',
        cursor: 'pointer',
        color: '#374151',
      }}
    >
      Logout
    </button>
  )
}
