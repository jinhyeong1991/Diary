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
        <section className="team-card">
          <h3>팀 일정</h3>
          <p className="team-muted">클라우드(Supabase)가 설정되지 않아 로컬 전용 모드로 실행 중입니다.</p>
        </section>
        <TeamStyle />
      </div>
    )
  }

  if (!session || status === 'not-member') {
    return (
      <div className="view-container team-view">
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="view-container team-view"
    >
      <section className="team-card team-date-bar">
        <button onClick={() => setDate(shiftDate(date, -1))} aria-label="이전 날"><ChevronLeft size={20} /></button>
        <div className="team-date-label">
          <strong>{Number(m)}월 {Number(d)}일</strong>
          {!isToday && <button className="team-today-btn" onClick={() => setDate(localDateStr())}>오늘</button>}
        </div>
        <button onClick={() => setDate(shiftDate(date, 1))} aria-label="다음 날"><ChevronRight size={20} /></button>
      </section>

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
                {p.id === session.user.id && <span className="team-me">나</span>}
                {leave && <span className={`team-leave ${leave === '반차' ? 'half' : ''}`}>{leave}</span>}
                <span className="team-count">{done}/{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="team-muted">{leave ? '휴가 중' : '등록된 일정 없음'}</p>
              ) : (
                <ul className="team-items">
                  {items.map(i => (
                    <li key={i.id} className={i.completed ? 'done' : ''}>
                      {i.completed ? <CheckCircle2 size={16} color="var(--primary)" /> : <Circle size={16} />}
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
                  <button onClick={() => handleRemove(a.email)} aria-label="삭제"><Trash2 size={14} /></button>
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
    .team-view { display: flex; flex-direction: column; gap: 16px; }
    .team-card {
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
    }
    .team-card h3 { margin-bottom: 8px; }
    .team-muted { color: var(--text-sub); font-size: 0.9rem; }
    .team-error { color: var(--danger); font-size: 0.9rem; }
    .team-date-bar { display: flex; align-items: center; justify-content: space-between; }
    .team-date-bar > button { color: var(--text-main); padding: 8px; border-radius: 50%; }
    .team-date-label { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; }
    .team-today-btn {
      font-size: 0.8rem; color: var(--primary); padding: 4px 10px;
      border-radius: 12px; background: rgba(0,122,255,0.1); font-weight: 600;
    }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .team-member-card { border-top: 4px solid var(--member-color, var(--primary)); }
    .team-member-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .team-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--member-color, var(--primary)); }
    .team-me { font-size: 0.75rem; color: var(--primary); font-weight: 700; }
    .team-leave { font-size: 0.75rem; color: white; background: #FF9500; padding: 2px 8px; border-radius: 10px; font-weight: 700; }
    .team-leave.half { background: #5AC8FA; }
    .team-count { margin-left: auto; font-size: 0.8rem; color: var(--text-sub); font-weight: 600; }
    .team-items { display: flex; flex-direction: column; gap: 8px; }
    .team-items li { display: flex; align-items: center; gap: 8px; font-size: 0.92rem; color: var(--text-main); }
    .team-items li.done span:last-child { text-decoration: line-through; color: var(--text-sub); }
    .team-time { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-sub); }
    .team-invite-form { display: flex; gap: 8px; margin: 12px 0; }
    .team-invite-form input {
      flex: 1; min-width: 0; padding: 10px 12px; border: 1px solid var(--border);
      border-radius: var(--radius-sm); background: transparent; color: var(--text-main); font-size: 16px;
    }
    .team-invite-form button {
      display: flex; align-items: center; gap: 4px; padding: 0 14px;
      background: var(--primary); color: white; border-radius: var(--radius-sm); font-weight: 600;
    }
    .team-allowlist { display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem; }
    .team-allowlist li { display: flex; justify-content: space-between; align-items: center; }
    .team-allowlist button { color: var(--danger); padding: 4px; }
    @media (max-width: 768px) {
      .team-grid { grid-template-columns: 1fr; }
    }
  `}</style>
)

export default TeamView
