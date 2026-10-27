import React, { useState } from 'react'
import { Cloud, LogOut, Mail } from 'lucide-react'
import { useCloudStore, sendLoginEmail, verifyLoginCode, signOut } from '../sync/cloudSync'
import { isCloudEnabled } from '../lib/supabase'

// compact = 로그인된 상태에서 계정 정보 + 로그아웃만 보여줌
const AuthPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { session, status, lastSyncedAt, errorMsg } = useCloudStore()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!isCloudEnabled) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setMsg('')
    try {
      await sendLoginEmail(email.trim())
      setSent(true)
      setMsg('메일을 보냈습니다. 메일의 링크를 누르거나, 받은 코드를 아래에 입력하세요.')
    } catch (err) {
      setMsg('전송 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally { setBusy(false) }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true); setMsg('')
    try {
      await verifyLoginCode(email.trim(), code.trim())
    } catch (err) {
      setMsg('코드 확인 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally { setBusy(false) }
  }

  if (session) {
    const label =
      status === 'not-member' ? '⛔ 아직 초대되지 않은 계정입니다. 관리자에게 이메일 추가를 요청하세요.'
      : status === 'syncing' ? '⏳ 동기화 중...'
      : status === 'error' ? `⚠️ 동기화 오류: ${errorMsg}`
      : `✓ 실시간 동기화 ON${lastSyncedAt ? ` · ${lastSyncedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ''}`
    return (
      <section className="auth-card">
        <div className="auth-row">
          <Cloud size={18} color="var(--primary)" />
          <span className="auth-email">{session.user.email}</span>
          <button className="auth-ghost" onClick={() => signOut()}><LogOut size={14} /> 로그아웃</button>
        </div>
        <p className={`auth-status ${status === 'not-member' || status === 'error' ? 'bad' : ''}`}>{label}</p>
        <AuthStyle />
      </section>
    )
  }

  if (compact) return null

  return (
    <section className="auth-card">
      <h3><Cloud size={18} color="var(--primary)" /> 로그인하고 PC·모바일 동기화</h3>
      <p className="auth-desc">로그인하면 일정·메모·연차가 모든 기기에 실시간으로 맞춰지고, 팀 일정을 볼 수 있습니다.</p>
      <form onSubmit={handleSend} className="auth-form">
        <input type="email" placeholder="회사 이메일" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <button type="submit" disabled={busy}><Mail size={16} /> {sent ? '다시 보내기' : '로그인 메일 받기'}</button>
      </form>
      {sent && (
        <form onSubmit={handleVerify} className="auth-form">
          <input inputMode="numeric" placeholder="메일로 받은 코드" value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" />
          <button type="submit" disabled={busy}>확인</button>
        </form>
      )}
      {msg && <p className="auth-desc">{msg}</p>}
      <AuthStyle />
    </section>
  )
}

const AuthStyle: React.FC = () => (
  <style>{`
    .auth-card {
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
    }
    .auth-card h3 { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .auth-desc { color: var(--text-sub); font-size: 0.9rem; margin-bottom: 10px; line-height: 1.5; }
    .auth-form { display: flex; gap: 8px; margin-bottom: 10px; }
    .auth-form input {
      flex: 1; min-width: 0; padding: 10px 12px; border: 1px solid var(--border);
      border-radius: var(--radius-sm); background: transparent; color: var(--text-main);
      font-size: 16px; /* iOS 확대 방지 */
    }
    .auth-form button {
      display: flex; align-items: center; gap: 6px; padding: 0 14px; white-space: nowrap;
      background: var(--primary); color: white; border-radius: var(--radius-sm); font-weight: 600;
    }
    .auth-form button:disabled { opacity: 0.6; }
    .auth-row { display: flex; align-items: center; gap: 8px; }
    .auth-email { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .auth-ghost { margin-left: auto; display: flex; align-items: center; gap: 4px; color: var(--text-sub); font-size: 0.85rem; white-space: nowrap; }
    .auth-status { margin-top: 8px; font-size: 0.85rem; color: var(--success); }
    .auth-status.bad { color: var(--danger); }
  `}</style>
)

export default AuthPanel
