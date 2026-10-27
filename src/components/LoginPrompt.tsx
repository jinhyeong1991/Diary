import React, { useEffect } from 'react'
import { LogIn, X } from 'lucide-react'
import AuthPanel from './AuthPanel'
import { useCloudStore } from '../sync/cloudSync'

// 헤더의 로그인 버튼 (로그인 안 됐을 때만 표시)
export const LoginButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button className="login-pill" onClick={onClick}>
    <LogIn size={16} /> 로그인
    <LoginPromptStyle />
  </button>
)

// 화면 맨 위 안내 카드: 로그인 안 하면 이 기기에만 있는 빈 데이터가 보인다는 걸 알려줌
export const LoginBanner: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="login-banner">
    <div className="login-banner-text">
      <strong>로그인하면 내 기록이 보여요</strong>
      <span>연차·일정·메모를 PC와 휴대폰에서 똑같이 볼 수 있습니다.</span>
    </div>
    <button className="login-banner-btn" onClick={onLogin}><LogIn size={16} /> 로그인</button>
    <LoginPromptStyle />
  </div>
)

// 로그인 창 (로그인되면 자동으로 닫힘)
export const LoginSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const session = useCloudStore(s => s.session)
  useEffect(() => { if (open && session) onClose() }, [open, session, onClose])
  if (!open) return null
  return (
    <div className="login-sheet-backdrop" onClick={onClose}>
      <div className="login-sheet" role="dialog" aria-modal="true" aria-label="로그인" onClick={e => e.stopPropagation()}>
        <button className="login-sheet-close" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        <AuthPanel />
      </div>
      <LoginPromptStyle />
    </div>
  )
}

const LoginPromptStyle: React.FC = () => (
  <style>{`
    .login-pill {
      display: flex; align-items: center; gap: 6px;
      height: 36px; padding: 0 14px; border-radius: 18px;
      background: var(--primary); color: #fff;
      font-weight: 700; font-size: 0.875rem; white-space: nowrap; flex-shrink: 0;
    }
    .login-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; margin-bottom: 14px;
      border-radius: var(--radius-card, 16px);
      background: var(--primary-soft, rgba(0, 122, 255, 0.1));
      border: 1px solid var(--primary);
    }
    .login-banner-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .login-banner-text strong { color: var(--text-main); font-size: 0.95rem; }
    .login-banner-text span { color: var(--text-sub); font-size: 0.8125rem; line-height: 1.4; }
    .login-banner-btn {
      display: flex; align-items: center; gap: 6px; flex-shrink: 0;
      height: 40px; padding: 0 16px; border-radius: 12px;
      background: var(--primary); color: #fff; font-weight: 700; font-size: 0.9rem;
    }
    .login-sheet-backdrop {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0, 0, 0, 0.45);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .login-sheet { position: relative; width: 100%; max-width: 400px; }
    .login-sheet .auth-card { padding-top: 20px; }
    .login-sheet-close {
      position: absolute; top: 10px; right: 10px; z-index: 1;
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: var(--text-sub);
    }
    /* 좁은 휴대폰: 로그인 버튼 자리를 위해 헤더 시계는 숨김 */
    @media (max-width: 420px) {
      .header-actions:has(.login-pill) .clock-display { display: none; }
    }
    @media (max-width: 768px) {
      .login-sheet-backdrop { align-items: flex-end; padding: 0; }
      .login-sheet { max-width: none; }
      .login-sheet .auth-card { border-radius: 20px 20px 0 0; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
    }
  `}</style>
)
