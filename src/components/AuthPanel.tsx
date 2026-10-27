import React, { useState } from 'react'
import { Cloud, LogOut, LogIn, UserPlus } from 'lucide-react'
import { useCloudStore, signInWithPassword, signUpWithPassword, signOut, displayId } from '../sync/cloudSync'
import { isCloudEnabled } from '../lib/supabase'

function authErrorMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  if (m.includes('Invalid login credentials')) return '아이디 또는 비밀번호가 맞지 않습니다. 처음이면 위의 "처음 가입" 탭을 눌러 가입해 주세요.'
  if (m.includes('Email not confirmed')) return '가입 확인이 아직 안 됐습니다. (이메일로 가입했다면 확인 메일의 링크를 눌러 주세요.)'
  if (m.includes('User already registered')) return '이미 가입된 아이디입니다. 위의 "로그인" 탭에서 로그인해 주세요.'
  if (m.toLowerCase().includes('invalid format') || m.toLowerCase().includes('email address')) return '사용할 수 없는 아이디입니다. 다른 아이디를 입력해 주세요.'
  if (m.includes('Password should be')) return '비밀번호는 6자 이상이어야 합니다.'
  if (m.toLowerCase().includes('rate limit')) return '메일 발송 한도를 넘었습니다. 1시간 뒤 다시 시도해 주세요.'
  return m
}

// compact = 로그인된 상태에서 계정 정보 + 로그아웃만 보여줌
const AuthPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { session, status, lastSyncedAt, errorMsg } = useCloudStore()
  // 모드를 나눠서 키보드 엔터(이동) 키도 현재 모드대로 동작하게 함
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!isCloudEnabled) return null

  const switchMode = (m: 'login' | 'signup') => { setMode(m); setMsg(''); setPassword2('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setMsg('아이디와 비밀번호를 입력해 주세요.'); return }
    if (/\s/.test(email.trim())) { setMsg('아이디에는 띄어쓰기를 쓸 수 없습니다.'); return }
    if (mode === 'signup' && password !== password2) { setMsg('비밀번호 확인이 일치하지 않습니다.'); return }
    setBusy(true); setMsg('')
    try {
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password)
      } else {
        const loggedIn = await signUpWithPassword(email.trim(), password)
        if (!loggedIn) {
          setMode('login')
          setMsg('✉️ 확인 메일을 보냈습니다. 메일의 링크를 한 번 누른 뒤, 여기서 로그인해 주세요.')
        }
      }
    } catch (err) {
      setMsg(authErrorMsg(err))
    } finally { setBusy(false) }
  }

  if (session) {
    const label =
      status === 'not-member' ? '⛔ 아직 초대되지 않은 계정입니다. 관리자에게 아이디 추가를 요청하세요.'
      : status === 'syncing' ? '⏳ 동기화 중...'
      : status === 'error' ? `⚠️ 동기화 오류: ${errorMsg}`
      : `✓ 실시간 동기화 ON${lastSyncedAt ? ` · ${lastSyncedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ''}`
    return (
      <section className="auth-card">
        <div className="auth-row">
          <img src="./retro/star-block.png" alt="" className="retro-sprite" style={{ width: '22px', height: '22px' }} />
          <span className="auth-email">{displayId(session.user.email)}</span>
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
      <h3>
        <img src="./retro/star-block.png" alt="" className="retro-sprite" style={{ width: '22px', height: '22px' }} />
        <Cloud size={18} color="var(--primary)" /> 로그인하고 PC·모바일 동기화
      </h3>
      <p className="auth-desc">로그인하면 일정·메모·연차가 모든 기기에 실시간으로 맞춰지고, 팀 일정을 볼 수 있습니다.</p>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>로그인</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>처음 가입</button>
      </div>
      <form onSubmit={handleSubmit} className="auth-form auth-form-col">
        <input type="text" placeholder="아이디 (또는 이메일)" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <input type="password" placeholder={mode === 'signup' ? '사용할 비밀번호 (6자 이상)' : '비밀번호'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        {mode === 'signup' && (
          <input type="password" placeholder="비밀번호 확인" value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
        )}
        <button type="submit" className="auth-submit" disabled={busy}>
          {mode === 'login' ? <><LogIn size={16} /> 로그인</> : <><UserPlus size={16} /> 가입하기</>}
        </button>
      </form>
      {msg && <p className="auth-desc">{msg}</p>}
      <AuthStyle />
    </section>
  )
}

const AuthStyle: React.FC = () => (
  <style>{`
    .auth-card {
      background: var(--card-bg);
      border: 3px solid var(--card-border);
      border-radius: var(--radius-card);
      box-shadow: var(--card-shadow);
      padding: 16px;
    }
    .auth-card h3 { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .auth-desc { color: var(--text-sub); font-size: 0.88rem; margin-bottom: 10px; line-height: 1.5; }
    .auth-form { display: flex; gap: 8px; margin-bottom: 10px; }
    .auth-form input {
      flex: 1; min-width: 0; padding: 10px 12px; min-height: 44px;
      border: 2px solid var(--card-border);
      border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-main);
      font-size: 16px;
    }
    .auth-form button {
      display: flex; align-items: center; gap: 6px; padding: 0 14px; white-space: nowrap;
      font-family: var(--font-pixel);
      background: var(--accent-gold); color: #181818;
      border: 2px solid var(--card-border); box-shadow: var(--pixel-shadow-sm);
      border-radius: var(--radius-sm); font-weight: 700;
    }
    .auth-form button:disabled { opacity: 0.6; }
    .auth-form-col { flex-direction: column; }
    .auth-form-col input { flex: none; }
    .auth-form .auth-submit { justify-content: center; height: 44px; }
    .auth-tabs {
      display: flex; gap: 6px; background: var(--surface-2);
      border: 2px solid var(--card-border);
      border-radius: var(--radius-sm); padding: 4px; margin-bottom: 10px;
    }
    .auth-tabs button {
      flex: 1; height: 38px; border-radius: var(--radius-sm);
      font-family: var(--font-pixel);
      color: var(--text-sub); font-weight: 700; font-size: 0.88rem;
    }
    .auth-tabs button.on {
      background: var(--accent-gold); color: #181818;
      border: 2px solid var(--card-border); box-shadow: var(--pixel-shadow-sm);
    }
    .auth-row { display: flex; align-items: center; gap: 8px; }
    .auth-email { font-family: var(--font-pixel); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .auth-ghost {
      margin-left: auto; display: flex; align-items: center; gap: 4px;
      min-height: 36px; padding: 4px 10px;
      background: var(--surface-2); border: 2px solid var(--card-border); border-radius: var(--radius-sm);
      color: var(--text-main); font-size: 0.82rem; font-weight: 700; white-space: nowrap;
    }
    .auth-status { margin-top: 8px; font-size: 0.85rem; font-weight: 700; color: var(--success); }
    .auth-status.bad { color: var(--danger); }
  `}</style>
)

export default AuthPanel
