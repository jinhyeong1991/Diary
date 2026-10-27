import React, { useState } from 'react'
import { Cloud, LogOut, LogIn } from 'lucide-react'
import { useCloudStore, signInWithPassword, signUpWithPassword, signOut } from '../sync/cloudSync'
import { isCloudEnabled } from '../lib/supabase'

function authErrorMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  if (m.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않습니다. 처음이면 "처음 가입"을 눌러 주세요.'
  if (m.includes('Email not confirmed')) return '가입 확인 메일의 링크를 먼저 눌러 주세요.'
  if (m.includes('User already registered')) return '이미 가입된 이메일입니다. 로그인을 눌러 주세요.'
  if (m.includes('Password should be')) return '비밀번호는 6자 이상이어야 합니다.'
  if (m.toLowerCase().includes('rate limit')) return '메일 발송 한도를 넘었습니다. 1시간 뒤 다시 시도해 주세요.'
  return m
}

// compact = 로그인된 상태에서 계정 정보 + 로그아웃만 보여줌
const AuthPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { session, status, lastSyncedAt, errorMsg } = useCloudStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!isCloudEnabled) return null

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setBusy(true); setMsg('')
    try {
      await signInWithPassword(email.trim(), password)
    } catch (err) {
      setMsg(authErrorMsg(err))
    } finally { setBusy(false) }
  }

  const handleSignUp = async () => {
    if (!email.trim() || !password) { setMsg('이메일과 사용할 비밀번호를 입력해 주세요.'); return }
    setBusy(true); setMsg('')
    try {
      const loggedIn = await signUpWithPassword(email.trim(), password)
      if (!loggedIn) setMsg('확인 메일을 보냈습니다. 메일의 링크를 한 번 누른 뒤, 여기서 로그인해 주세요.')
    } catch (err) {
      setMsg(authErrorMsg(err))
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
      <form onSubmit={handleSignIn} className="auth-form auth-form-col">
        <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <input type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        <div className="auth-btns">
          <button type="submit" disabled={busy}><LogIn size={16} /> 로그인</button>
          <button type="button" className="auth-secondary" disabled={busy} onClick={handleSignUp}>처음 가입</button>
        </div>
      </form>
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
    .auth-form-col { flex-direction: column; }
    .auth-form-col input { flex: none; }
    .auth-btns { display: flex; gap: 8px; }
    .auth-btns button { flex: 1; justify-content: center; height: 42px; }
    .auth-form .auth-secondary { background: transparent; color: var(--primary); border: 1px solid var(--primary); }
    .auth-row { display: flex; align-items: center; gap: 8px; }
    .auth-email { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .auth-ghost { margin-left: auto; display: flex; align-items: center; gap: 4px; color: var(--text-sub); font-size: 0.85rem; white-space: nowrap; }
    .auth-status { margin-top: 8px; font-size: 0.85rem; color: var(--success); }
    .auth-status.bad { color: var(--danger); }
  `}</style>
)

export default AuthPanel
