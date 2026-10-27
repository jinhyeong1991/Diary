import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, UserPlus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCloudStore, toAuthEmail, displayId } from '../sync/cloudSync'
import { localDateStr } from '../utils/dateUtils'
import AuthPanel from '../components/AuthPanel'

interface Profile { id: string; email: string | null; name: string; color: string }
interface ScheduleItem { id: string; time: number; task: string; completed: boolean }
interface SchedulePayload {
  state?: {
    schedules?: Record<string, ScheduleItem[]>
    personalLeave?: Record<string, boolean>
    personalHalfLeave?: Record<string, boolean>
  }
}
interface AllowRow { email: string; is_admin: boolean }

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

const TeamView: React.FC = () => {
  const { session, status } = useCloudStore()
  const [date, setDate] = useState(() => localDateStr())
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [schedulesByUser, setSchedulesByUser] = useState<Record<string, SchedulePayload>>({})
  const [allowlist, setAllowlist] = useState<AllowRow[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [loadError, setLoadError] = useState('')

  const myEmail = session?.user.email?.toLowerCase()
  const isAdmin = allowlist.some(a => a.email.toLowerCase() === myEmail && a.is_admin)
  const ready = !!supabase && !!session && status !== 'not-member'

  const load = useCallback(async () => {
    if (!supabase) return
    const [p, d, a] = await Promise.all([
      supabase.from('profiles').select('id, email, name, color'),
      supabase.from('user_data').select('user_id, data').eq('key', 'schedule-storage'),
      supabase.from('team_allowlist').select('email, is_admin').order('created_at'),
    ])
    const err = p.error || d.error || a.error
    if (err) { setLoadError(err.message); return }
    setLoadError('')
    setProfiles(p.data ?? [])
    setSchedulesByUser(Object.fromEntries((d.data ?? []).map(r => [r.user_id, r.data as SchedulePayload])))
    setAllowlist(a.data ?? [])
  }, [])

  useEffect(() => {
    if (!ready || !supabase) return
    load()
    const client = supabase
    const channel = client
      .channel('team-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: 'key=eq.schedule-storage' }, payload => {
        const row = payload.new as { user_id?: string; data?: SchedulePayload }
        if (row?.user_id) setSchedulesByUser(prev => ({ ...prev, [row.user_id!]: row.data ?? {} }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [ready, load])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !newEmail.trim()) return
    if (/\s/.test(newEmail.trim())) { alert('아이디에는 띄어쓰기를 쓸 수 없습니다.'); return }
    const email = toAuthEmail(newEmail)
    const { error } = await supabase.from('team_allowlist').insert({ email })
    if (error) { alert('추가 실패: ' + error.message); return }
    setNewEmail('')
    load()
  }

  const handleRemove = async (email: string) => {
    if (!supabase || email.toLowerCase() === myEmail) return
    if (!window.confirm(`${displayId(email)} 의 접근 권한을 삭제할까요?`)) return
    const { error } = await supabase.from('team_allowlist').delete().eq('email', email)
    if (error) { alert('삭제 실패: ' + error.message); return }
    load()
  }

  if (!supabase) {
    return (
      <div className="view-container team-view">
        <div className="retro-view-banner">
          <div className="retro-view-banner-left">
            <img src="./retro/runner.png" alt="" className="retro-sprite" style={{ width: '36px', height: '36px' }} />
            <div>
              <div className="retro-view-banner-title">MULTIPLAYER PARTY · 팀 보드</div>
              <div className="retro-view-banner-sub">로컬 전용 플레이 모드</div>
            </div>
          </div>
          <img src="./retro/ghost.png" alt="" className="retro-sprite" style={{ width: '30px', height: '30px' }} />
        </div>
        <section className="team-card">
          <h3>🎮 팀 일정</h3>
          <p className="team-muted">클라우드(Supabase)가 설정되지 않아 로컬 전용 모드로 실행 중입니다.</p>
        </section>
        <TeamStyle />
      </div>
    )
  }

  if (!session || status === 'not-member') {
    return (
      <div className="view-container team-view">
        <div className="retro-view-banner">
          <div className="retro-view-banner-left">
            <img src="./retro/runner.png" alt="" className="retro-sprite" style={{ width: '36px', height: '36px' }} />
            <div>
              <div className="retro-view-banner-title">MULTIPLAYER PARTY · 팀 보드</div>
              <div className="retro-view-banner-sub">로그인하여 파티원들과 실시간 동기화하세요</div>
            </div>
          </div>
          <img src="./retro/robot.png" alt="" className="retro-sprite" style={{ width: '34px', height: '34px' }} />
        </div>
        <AuthPanel />
        <TeamStyle />
      </div>
    )
  }

  const isToday = date === localDateStr()
  const [, m, d] = date.split('-')
  const sorted = [...profiles].sort((a, b) =>
    a.id === session.user.id ? -1 : b.id === session.user.id ? 1 : a.name.localeCompare(b.name, 'ko')
  )

  // 상단 요약: 휴가자, 전체 진행률
  const onLeave = sorted.filter(p => {
    const st = schedulesByUser[p.id]?.state
    return st?.personalLeave?.[date] || st?.personalHalfLeave?.[date]
  })
  const allItems = sorted.flatMap(p => schedulesByUser[p.id]?.state?.schedules?.[date] ?? [])
  const allDone = allItems.filter(i => i.completed).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="view-container team-view"
    >
      <div className="retro-view-banner">
        <div className="retro-view-banner-left">
          <img src="./retro/runner.png" alt="" className="retro-sprite" style={{ width: '36px', height: '36px' }} />
          <div>
            <div className="retro-view-banner-title">MULTIPLAYER PARTY · 팀 현황</div>
            <div className="retro-view-banner-sub">파티원들의 오늘 퀘스트와 휴가를 실시간 확인하세요</div>
          </div>
        </div>
        <img src="./retro/robot.png" alt="" className="retro-sprite" style={{ width: '34px', height: '34px' }} />
      </div>

      <section className="team-card team-date-bar">
        <button onClick={() => setDate(shiftDate(date, -1))} aria-label="이전 날"><ChevronLeft size={20} /></button>
        <div className="team-date-label">
          <strong>{Number(m)}월 {Number(d)}일</strong>
          {!isToday && <button className="team-today-btn" onClick={() => setDate(localDateStr())}>오늘</button>}
        </div>
        <button onClick={() => setDate(shiftDate(date, 1))} aria-label="다음 날"><ChevronRight size={20} /></button>
      </section>

      <section className="team-summary">
        <div className="team-summary-item">
          <span className="team-summary-num">{sorted.length}</span>
          <span className="team-summary-label">팀원</span>
        </div>
        <div className="team-summary-item">
          <span className="team-summary-num leave">{onLeave.length}</span>
          <span className="team-summary-label">휴가</span>
        </div>
        <div className="team-summary-item">
          <span className="team-summary-num">{allItems.length ? Math.round((allDone / allItems.length) * 100) : 0}%</span>
          <span className="team-summary-label">일정 완료</span>
        </div>
      </section>
      {onLeave.length > 0 && (
        <p className="team-muted team-leave-line">
          🌴 {onLeave.map(p => p.name || displayId(p.email)).join(', ')} 님이 휴가예요
        </p>
      )}

      {loadError && <p className="team-error">불러오기 실패: {loadError}</p>}

      <div className="team-grid">
        {sorted.length === 0 && <p className="team-muted">아직 로그인한 직원이 없습니다.</p>}
        {sorted.map(p => {
          const st = schedulesByUser[p.id]?.state
          const items = [...(st?.schedules?.[date] ?? [])].sort((a, b) => a.time - b.time)
          const leave = st?.personalLeave?.[date] ? '연차' : st?.personalHalfLeave?.[date] ? '반차' : null
          const done = items.filter(i => i.completed).length
          return (
            <section key={p.id} className="team-card team-member-card" style={{ '--member-color': p.color } as React.CSSProperties}>
              <div className="team-member-head">
                <span className="team-dot" />
                <strong>{p.name || displayId(p.email)}</strong>
                {p.id === session.user.id && <span className="team-me">1P (나)</span>}
                {leave && <span className={`team-leave ${leave === '반차' ? 'half' : ''}`}>{leave}</span>}
                <span className="team-count">{done}/{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="team-muted">{leave ? '휴가 중' : '등록된 일정 없음'}</p>
              ) : (
                <ul className="team-items">
                  {items.map(i => (
                    <li key={i.id} className={i.completed ? 'done' : ''}>
                      {i.completed ? <CheckCircle2 size={16} color="var(--secondary)" /> : <Circle size={16} />}
                      <span className="team-time">{String(i.time).padStart(2, '0')}:00</span>
                      <span>{i.task}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {isAdmin && (
        <section className="team-card">
          <h3>직원 초대 (관리자)</h3>
          <p className="team-muted">여기에 추가한 아이디(또는 이메일)만 가입·로그인 후 팀 일정을 볼 수 있습니다. 추가한 뒤 직원에게 그 아이디로 가입하라고 알려 주세요.</p>
          <form onSubmit={handleInvite} className="team-invite-form">
            <input type="text" placeholder="직원 아이디 (또는 이메일)" value={newEmail} onChange={e => setNewEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            <button type="submit"><UserPlus size={16} /> 추가</button>
          </form>
          <ul className="team-allowlist">
            {allowlist.map(a => (
              <li key={a.email}>
                <span>{displayId(a.email)}{a.is_admin && ' (관리자)'}</span>
                {a.email.toLowerCase() !== myEmail && (
                  <button onClick={() => handleRemove(a.email)} aria-label="삭제"><Trash2 size={16} /></button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AuthPanel compact />
      <TeamStyle />
    </motion.div>
  )
}

const TeamStyle: React.FC = () => (
  <style>{`
    .team-view { display: flex; flex-direction: column; gap: 14px; }
    .team-card {
      background: var(--card-bg);
      border: 3px solid var(--card-border);
      border-radius: var(--radius-card);
      box-shadow: var(--card-shadow);
      padding: 16px;
    }
    .team-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .team-summary-item {
      background: var(--card-bg);
      border: 3px solid var(--card-border);
      border-radius: var(--radius-card);
      box-shadow: var(--pixel-shadow-sm);
      padding: 12px 8px;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .team-summary-num { font-family: var(--font-pixel); font-size: 1.25rem; font-weight: 800; color: var(--text-main); }
    .team-summary-num.leave { color: var(--warning); }
    .team-summary-label { font-size: 0.75rem; color: var(--text-sub); font-weight: 700; }
    .team-leave-line { padding: 0 4px; }
    .team-card h3 { margin-bottom: 8px; }
    .team-muted { color: var(--text-sub); font-size: 0.9rem; }
    .team-error { color: var(--danger); font-size: 0.9rem; }
    .team-date-bar { display: flex; align-items: center; justify-content: space-between; }
    .team-date-bar > button {
      color: #181818; width: 42px; height: 42px; border-radius: var(--radius-sm);
      border: 2px solid var(--card-border); box-shadow: var(--pixel-shadow-sm);
      background: var(--accent-gold); display: flex; align-items: center; justify-content: center;
    }
    .team-date-label { font-family: var(--font-pixel); display: flex; align-items: center; gap: 10px; font-size: 1.05rem; }
    .team-today-btn {
      font-family: var(--font-pixel);
      font-size: 0.8rem; color: #FFFFFF; padding: 6px 12px; min-height: 36px;
      border-radius: var(--radius-sm); border: 2px solid var(--card-border);
      box-shadow: var(--pixel-shadow-sm);
      background: var(--secondary); font-weight: 700;
    }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .team-member-card { border-top: 6px solid var(--member-color, var(--primary)); }
    .team-member-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .team-dot { width: 10px; height: 10px; border-radius: 2px; background: var(--member-color, var(--primary)); }
    .team-me { font-family: var(--font-pixel); font-size: 0.72rem; color: var(--primary); font-weight: 700; }
    .team-leave { font-family: var(--font-pixel); font-size: 0.72rem; color: #181818; background: var(--warning); border: 1px solid #181818; padding: 2px 8px; border-radius: 3px; font-weight: 700; }
    .team-leave.half { background: var(--accent-cyan); }
    .team-count { margin-left: auto; font-family: var(--font-pixel); font-size: 0.8rem; color: var(--text-sub); font-weight: 700; }
    .team-items { display: flex; flex-direction: column; gap: 8px; }
    .team-items li { display: flex; align-items: center; gap: 8px; font-size: 0.92rem; color: var(--text-main); }
    .team-items li.done span:last-child { text-decoration: line-through; color: var(--text-sub); }
    .team-time { font-family: var(--font-pixel); font-size: 0.8rem; color: var(--text-sub); }
    .team-invite-form { display: flex; gap: 8px; margin: 12px 0; }
    .team-invite-form input {
      flex: 1; min-width: 0; padding: 10px 12px; border: 2px solid var(--card-border);
      border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-main); font-size: 16px;
    }
    .team-invite-form button {
      display: flex; align-items: center; gap: 4px; padding: 0 14px; min-height: 44px;
      background: var(--accent-gold); color: #181818; border: 2px solid var(--card-border);
      box-shadow: var(--pixel-shadow-sm); border-radius: var(--radius-sm); font-weight: 700;
    }
    .team-allowlist { display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem; }
    .team-allowlist li { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
    .team-allowlist button { color: var(--danger); width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; }
    @media (max-width: 768px) {
      .team-grid { grid-template-columns: 1fr; }
    }
  `}</style>
)

export default TeamView
