import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUserStore } from '../store/useStore'
import { localDateStr } from '../utils/dateUtils'

const PRESET_COLORS = [
  '#FF6B35', '#007AFF', '#34C759', '#FF9500', '#AF52DE',
  '#FF2D55', '#5AC8FA', '#FFCC00', '#FF3B30', '#1A936F'
]

const VacationView: React.FC = () => {
  const {
    totalVacation,
    usedVacation,
    setUsedVacation,
    name,
    teamMembers,
    addTeamMember,
    removeTeamMember,
    teamVacations,
    teamHalfDayVacations,
    setTeamVacationType,
  } = useUserStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [isEditingMyVacation, setIsEditingMyVacation] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const myMember = teamMembers.find(m => m.name === name)
  const myMemberId = myMember?.id

  const myFullDays = myMemberId
    ? Object.values(teamVacations).filter(ids => ids.includes(myMemberId)).length
    : null
  const myHalfDays = myMemberId
    ? Object.values(teamHalfDayVacations).filter(ids => ids.includes(myMemberId)).length
    : null

  const effectiveUsed = myMemberId !== undefined
    ? (myFullDays ?? 0) + (myHalfDays ?? 0) * 0.5
    : usedVacation

  const remaining = totalVacation - effectiveUsed
  const progress = totalVacation > 0 ? (effectiveUsed / totalVacation) * 100 : 0

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1
    return day > 0 && day <= daysInMonth ? day : null
  })

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const getMembersOnVacation = (dateStr: string) => {
    const fullIds = teamVacations[dateStr] || []
    const halfIds = teamHalfDayVacations[dateStr] || []
    const full = teamMembers.filter(m => fullIds.includes(m.id)).map(m => ({ member: m, type: 'full' as const }))
    const half = teamMembers.filter(m => halfIds.includes(m.id)).map(m => ({ member: m, type: 'half' as const }))
    return [...full, ...half]
  }

  const getVacType = (date: string, memberId: string): 'full' | 'half' | 'none' => {
    if ((teamVacations[date] || []).includes(memberId)) return 'full'
    if ((teamHalfDayVacations[date] || []).includes(memberId)) return 'half'
    return 'none'
  }

  const handleMemberVacClick = (date: string, memberId: string) => {
    const cur = getVacType(date, memberId)
    if (cur === 'none') setTeamVacationType(date, memberId, 'full')
    else if (cur === 'full') setTeamVacationType(date, memberId, 'half')
    else setTeamVacationType(date, memberId, 'none')
  }

  const monthVacationList = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .flatMap(day => {
      const dateStr = getDateStr(day)
      return getMembersOnVacation(dateStr).map(({ member, type }) => ({ day, dateStr, member, type }))
    })

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) return
    addTeamMember({
      name: newMemberName,
      vacationDays: 15,
      color: PRESET_COLORS[teamMembers.length % PRESET_COLORS.length],
    })
    setNewMemberName('')
    setShowAddMember(false)
  }

  const getMemberVacationStats = (memberId: string) => {
    const fullDates = Object.entries(teamVacations)
      .filter(([, ids]) => ids.includes(memberId))
      .map(([date]) => ({ date, type: 'full' as const }))
    const halfDates = Object.entries(teamHalfDayVacations)
      .filter(([, ids]) => ids.includes(memberId))
      .map(([date]) => ({ date, type: 'half' as const }))
    const allDates = [...fullDates, ...halfDates].sort((a, b) => a.date.localeCompare(b.date))
    const usedDays = fullDates.length + halfDates.length * 0.5
    return { allDates, usedDays }
  }

  const todayStr = localDateStr()

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="view-container vacation-view"
    >
      {/* 나의 연차 카드 */}
      <section className="glass-card my-vacation-card">
        <div className="vac-summary-header">
          <h3>{name}님 연차 현황</h3>
          <button className="vac-edit-btn" onClick={() => setIsEditingMyVacation(!isEditingMyVacation)}>
            {isEditingMyVacation ? '완료' : '설정'}
          </button>
        </div>
        <div className="vacation-stats">
          <div className="stat-item">
            <span className="label">총 연차</span>
            <span className="value">{totalVacation}일</span>
          </div>
          <div className="stat-item">
            <span className="label">사용 연차</span>
            {isEditingMyVacation && !myMemberId ? (
              <input
                type="number"
                step="0.5"
                value={usedVacation}
                onChange={(e) => setUsedVacation(parseFloat(e.target.value) || 0)}
                className="stat-input"
              />
            ) : isEditingMyVacation && myMemberId ? (
              <span className="value auto-calc">{effectiveUsed}일</span>
            ) : (
              <span className="value">{effectiveUsed}일</span>
            )}
          </div>
          <div className="stat-item primary">
            <span className="label">잔여 연차</span>
            <span className="value">{remaining}일</span>
          </div>
        </div>
        <div className="progress-bar-wrapper">
          <div className="progress-labels">
            <span>사용 {progress.toFixed(1)}%</span>
            <span>잔여 {remaining}일</span>
          </div>
          <div className="big-progress-bar">
            <motion.div
              className="big-progress"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </section>

      {/* 팀원별 연차 현황 */}
      {teamMembers.length > 0 && (
        <section className="glass-card member-stats-card">
          <h3>팀원별 연차 현황</h3>
          <div className="member-filter-row">
            {teamMembers.map(m => (
              <button
                key={m.id}
                className={`member-filter-chip ${selectedMember === m.id ? 'active' : ''}`}
                style={{ '--m-color': m.color } as React.CSSProperties}
                onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}
              >
                <span className="mfc-dot" style={{ background: m.color }} />
                {m.name}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedMember && (() => {
              const member = teamMembers.find(m => m.id === selectedMember)!
              const { allDates, usedDays } = getMemberVacationStats(selectedMember)
              const memberTotal = member.vacationDays || 15
              const memberRemaining = memberTotal - usedDays
              const memberProgress = memberTotal > 0 ? (usedDays / memberTotal) * 100 : 0
              return (
                <motion.div
                  key={selectedMember}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="member-detail-panel"
                >
                  <div className="member-detail-header">
                    <span className="member-detail-dot" style={{ background: member.color }} />
                    <span className="member-detail-name">{member.name}님 연차 현황</span>
                  </div>
                  <div className="vacation-stats">
                    <div className="stat-item">
                      <span className="label">총 연차</span>
                      <span className="value">{memberTotal}일</span>
                    </div>
                    <div className="stat-item">
                      <span className="label">사용 연차</span>
                      <span className="value">{usedDays}일</span>
                    </div>
                    <div className="stat-item primary">
                      <span className="label">잔여 연차</span>
                      <span className="value">{memberRemaining}일</span>
                    </div>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div className="progress-labels">
                      <span>사용 {memberProgress.toFixed(1)}%</span>
                      <span>잔여 {memberRemaining}일</span>
                    </div>
                    <div className="big-progress-bar">
                      <motion.div
                        className="big-progress"
                        style={{ background: member.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${memberProgress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  {allDates.length === 0 ? (
                    <p className="no-vac-text">등록된 연차가 없습니다.</p>
                  ) : (
                    <div className="member-date-chips">
                      {allDates.map(({ date, type }) => {
                        const parts = date.split('-')
                        const mo = parseInt(parts[1])
                        const dy = parseInt(parts[2])
                        return (
                          <div key={date + type} className="member-date-chip">
                            <span className="mdc-badge" style={{ background: type === 'half' ? '#5AC8FA' : member.color }}>
                              {mo}/{dy}
                            </span>
                            <span className="mdc-type">{type === 'half' ? '반차' : '연차'}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </section>
      )}

      {/* 팀원 연차 캘린더 */}
      <section className="glass-card team-calendar-card">
        <div className="vac-section-header">
          <h3>팀원 연차 캘린더</h3>
          <div className="calendar-nav">
            <button onClick={prevMonth} className="cal-nav-btn"><ChevronLeft size={18} /></button>
            <span className="month-label">{year}년 {month + 1}월</span>
            <button onClick={nextMonth} className="cal-nav-btn"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="team-calendar-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} className="cal-day-name">{d}</div>
          ))}
          {days.map((d, i) => {
            if (!d) return <div key={i} className="cal-cell empty" />
            const dateStr = getDateStr(d)
            const vacEntries = getMembersOnVacation(dateStr)
            const hasVacation = vacEntries.length > 0
            const isSelected = selectedDate === dateStr
            const isToday = dateStr === todayStr

            return (
              <div
                key={i}
                className={`cal-cell ${hasVacation ? 'has-vacation' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              >
                <span className="cal-day-num">{d}</span>
                {hasVacation && (
                  <div className="cal-vacation-names">
                    {vacEntries.slice(0, 2).map(({ member, type }) => (
                      <span key={member.id} className={`cal-member-name ${type === 'half' ? 'cal-half-name' : ''}`} style={{ color: member.color }}>
                        {type === 'half' ? '½' : ''}{member.name}
                      </span>
                    ))}
                    {vacEntries.length > 2 && (
                      <span className="cal-member-more">+{vacEntries.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="date-detail"
            >
              <div className="date-detail-header">
                <span className="date-detail-title">
                  {parseInt(selectedDate.split('-')[1])}월 {parseInt(selectedDate.split('-')[2])}일 연차 설정
                </span>
                <button className="close-detail-btn" onClick={() => setSelectedDate(null)}>
                  <X size={16} />
                </button>
              </div>
              {teamMembers.length === 0 ? (
                <p className="no-members-text">먼저 하단에서 팀원을 추가해주세요.</p>
              ) : (
                <>
                  <p className="vac-type-hint">클릭: 없음 → 연차 → 반차 → 없음</p>
                  <div className="member-toggle-list">
                    {teamMembers.map(member => {
                      const vacType = getVacType(selectedDate, member.id)
                      return (
                        <button
                          key={member.id}
                          className={`member-toggle-btn ${vacType === 'full' ? 'active' : ''} ${vacType === 'half' ? 'active half-day' : ''}`}
                          style={{ '--m-color': member.color } as React.CSSProperties}
                          onClick={() => handleMemberVacClick(selectedDate, member.id)}
                        >
                          <span className="member-toggle-dot" />
                          {member.name}
                          {vacType === 'full' && <span className="vacation-badge">연차</span>}
                          {vacType === 'half' && <span className="vacation-badge half-badge">반차</span>}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 이번 달 연차 목록 */}
      <section className="glass-card vacation-list-card">
        <div className="vac-section-header">
          <h3>{month + 1}월 연차 일정</h3>
          <button className="add-member-btn" onClick={() => setShowAddMember(!showAddMember)}>
            <UserPlus size={15} /> 팀원 추가
          </button>
        </div>

        <AnimatePresence>
          {showAddMember && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddMember}
              className="add-member-form"
            >
              <input
                type="text"
                placeholder="팀원 이름 입력"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="form-save-btn">추가</button>
              <button type="button" className="form-cancel-btn" onClick={() => setShowAddMember(false)}>
                <X size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {monthVacationList.length === 0 ? (
          <div className="empty-vacation-list">
            <p>이번 달 등록된 연차가 없습니다.</p>
            <p>달력에서 날짜를 클릭하여 연차를 추가하세요.</p>
          </div>
        ) : (
          <div className="vacation-event-list">
            {monthVacationList.map(({ day, dateStr, member, type }) => (
              <div key={`${dateStr}-${member.id}-${type}`} className="vacation-event-item">
                <div className={`event-date-badge ${type === 'half' ? 'half-date-badge' : ''}`}>
                  <span className="event-month">{month + 1}월</span>
                  <span className="event-day">{day}일</span>
                </div>
                <div className="event-member-info">
                  <span className="event-dot" style={{ background: member.color }} />
                  <span className="event-name">{member.name}</span>
                  <span className={`event-tag ${type === 'half' ? 'event-half-tag' : ''}`}>
                    {type === 'half' ? '반차' : '연차'}
                  </span>
                </div>
                <button
                  className="event-remove-btn"
                  onClick={() => setTeamVacationType(dateStr, member.id, 'none')}
                  title="삭제"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {teamMembers.length > 0 && (
          <div className="team-chip-list">
            {teamMembers.map(m => (
              <div key={m.id} className="team-chip">
                <span className="chip-dot" style={{ background: m.color }} />
                <span>{m.name}</span>
                <button className="chip-remove-btn" onClick={() => removeTeamMember(m.id)} title="팀원 삭제">
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .vacation-view { display: flex; flex-direction: column; gap: 20px; }

        /* 나의 연차 */
        .my-vacation-card { display: flex; flex-direction: column; gap: 16px; }
        .vac-summary-header { display: flex; justify-content: space-between; align-items: center; }
        .vac-edit-btn { color: var(--primary); font-weight: 600; font-size: 0.9rem; }
        .vacation-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stat-item {
          background: rgba(0,0,0,0.03);
          padding: 14px 16px;
          border-radius: var(--radius-md);
          display: flex; flex-direction: column; gap: 4px;
        }
        .stat-item.primary {
          background: rgba(0,122,255,0.1);
          border: 1px solid rgba(0,122,255,0.2);
        }
        .stat-item.primary .value { color: var(--primary); }
        .stat-item .label { font-size: 0.8rem; color: var(--text-sub); }
        .stat-item .value { font-size: 1.25rem; font-weight: 700; }
        .stat-input {
          width: 100%; border: 1px solid var(--border); border-radius: 4px;
          padding: 4px 8px; font-size: 1.1rem; font-weight: 700;
          background: var(--bg-white); color: var(--text-main);
        }
        .progress-bar-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .progress-labels {
          display: flex; justify-content: space-between;
          font-size: 0.82rem; color: var(--text-sub);
        }
        .big-progress-bar {
          height: 10px; background: var(--border); border-radius: 5px; overflow: hidden;
        }
        .big-progress { height: 100%; background: var(--primary); border-radius: 5px; }

        /* 팀원별 연차 현황 */
        .member-stats-card { display: flex; flex-direction: column; gap: 14px; }
        .member-filter-row {
          display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 8px;
          padding-bottom: 4px; scrollbar-width: none;
        }
        .member-filter-row::-webkit-scrollbar { display: none; }
        .member-filter-chip {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid var(--border); background: var(--bg-white);
          font-size: 0.85rem; font-weight: 600; color: var(--text-sub);
          cursor: pointer; transition: all 0.2s;
        }
        .member-filter-chip.active {
          border-color: var(--m-color, var(--primary));
          background: color-mix(in srgb, var(--m-color, var(--primary)) 12%, transparent);
          color: var(--text-main);
        }
        .mfc-dot { width: 8px; height: 8px; border-radius: 50%; display: block; flex-shrink: 0; }
        .member-detail-panel {
          overflow: hidden; border-radius: var(--radius-md);
          border: 1px solid var(--border); padding: 16px;
          background: rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 14px;
        }
        .member-detail-header { display: flex; align-items: center; gap: 8px; }
        .member-detail-dot { width: 10px; height: 10px; border-radius: 50%; display: block; flex-shrink: 0; }
        .member-detail-name { font-weight: 700; font-size: 1rem; }
        .no-vac-text { font-size: 0.85rem; color: var(--text-sub); text-align: center; padding: 8px 0; }
        .member-date-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .member-date-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px 4px 4px;
          background: rgba(0,0,0,0.04); border-radius: 20px;
        }
        .mdc-badge {
          color: white; font-size: 0.75rem; font-weight: 700;
          padding: 3px 8px; border-radius: 14px; white-space: nowrap;
        }
        .mdc-type { font-size: 0.78rem; font-weight: 600; color: var(--text-sub); }

        /* 캘린더 */
        .team-calendar-card { display: flex; flex-direction: column; gap: 16px; }
        .vac-section-header { display: flex; justify-content: space-between; align-items: center; }
        .calendar-nav { display: flex; align-items: center; gap: 8px; }
        .month-label { font-weight: 700; font-size: 0.95rem; min-width: 80px; text-align: center; }
        .cal-nav-btn {
          color: var(--text-sub); padding: 4px; border-radius: 4px;
          display: flex; align-items: center; transition: all 0.2s;
        }
        .cal-nav-btn:hover { background: rgba(0,0,0,0.06); color: var(--text-main); }
        .team-calendar-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;
        }
        .cal-day-name {
          text-align: center; font-size: 0.7rem; font-weight: 600;
          color: var(--text-sub); padding: 6px 0;
        }
        .cal-cell {
          min-height: 56px; display: flex; flex-direction: column;
          align-items: center; padding: 5px 2px;
          border-radius: 8px; cursor: pointer;
          transition: all 0.2s; position: relative;
          border: 2px solid transparent; gap: 3px;
        }
        .cal-cell.empty { cursor: default; }
        .cal-cell:not(.empty):hover { background: rgba(0,122,255,0.07); }
        .cal-day-num { font-size: 0.82rem; font-weight: 500; line-height: 1; }
        .cal-cell.is-today { background: rgba(0,122,255,0.06); }
        .cal-cell.is-today .cal-day-num { color: var(--primary); font-weight: 700; }
        .cal-cell.has-vacation { border-color: #FF9500 !important; background: rgba(255,149,0,0.04); }
        .cal-cell.is-selected {
          background: var(--primary) !important;
          border-color: var(--primary) !important;
        }
        .cal-cell.is-selected .cal-day-num { color: white; }
        .cal-cell.is-selected .cal-member-name { color: rgba(255,255,255,0.9) !important; }
        .cal-cell.is-selected .cal-member-more { color: rgba(255,255,255,0.7); }
        .cal-vacation-names {
          display: flex; flex-direction: column;
          align-items: center; gap: 1px; width: 100%;
        }
        .cal-member-name {
          font-size: 0.62rem; font-weight: 700;
          line-height: 1.2; text-align: center;
          max-width: 100%; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
          padding: 0 2px;
        }
        .cal-member-more {
          font-size: 0.58rem; color: var(--text-sub); font-weight: 600;
        }

        /* 날짜 상세 패널 */
        .date-detail {
          overflow: hidden; background: rgba(255,149,0,0.04);
          border-radius: var(--radius-md); border: 1px solid rgba(255,149,0,0.25);
          padding: 14px 16px; margin-top: 4px;
        }
        .date-detail-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
        }
        .date-detail-title { font-weight: 700; color: #FF9500; font-size: 0.95rem; }
        .close-detail-btn { color: var(--text-sub); display: flex; align-items: center; }
        .member-toggle-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .member-toggle-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 20px;
          border: 1.5px solid var(--border); background: var(--bg-white);
          font-size: 0.85rem; font-weight: 600; color: var(--text-sub);
          transition: all 0.2s; cursor: pointer;
        }
        .member-toggle-btn.active {
          border-color: #FF9500; background: rgba(255,149,0,0.08); color: var(--text-main);
        }
        .member-toggle-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--m-color, var(--border)); display: block;
        }
        .vacation-badge {
          font-size: 0.7rem; background: #FF9500; color: white;
          padding: 1px 6px; border-radius: 8px; margin-left: 2px;
        }
        .half-badge { background: #5AC8FA; }
        .member-toggle-btn.half-day {
          border-color: #5AC8FA !important; background: rgba(90, 200, 250, 0.08) !important;
        }
        .vac-type-hint {
          font-size: 0.75rem; color: var(--text-sub); margin-bottom: 4px;
        }
        .cal-half-name { opacity: 0.75; }
        .no-members-text { font-size: 0.85rem; color: var(--text-sub); }

        /* 연차 목록 */
        .vacation-list-card { display: flex; flex-direction: column; gap: 16px; }
        .add-member-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--primary); color: white;
          padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
        }
        .add-member-form {
          display: flex; gap: 8px; overflow: hidden; padding-bottom: 4px;
        }
        .add-member-form input {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-white); color: var(--text-main);
        }
        .form-save-btn {
          background: var(--primary); color: white; padding: 0 16px;
          border-radius: var(--radius-sm); font-weight: 600;
        }
        .form-cancel-btn { color: var(--text-sub); padding: 8px; display: flex; align-items: center; }
        .empty-vacation-list {
          text-align: center; color: var(--text-sub); font-size: 0.88rem;
          padding: 32px 0; border: 1px dashed var(--border);
          border-radius: var(--radius-md); line-height: 2.2;
        }
        .vacation-event-list { display: flex; flex-direction: column; gap: 8px; }
        .vacation-event-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 14px;
          background: rgba(255,149,0,0.05); border: 1px solid rgba(255,149,0,0.18);
          border-radius: var(--radius-md);
        }
        .event-date-badge {
          display: flex; flex-direction: column; align-items: center;
          min-width: 44px; background: #FF9500; color: white;
          border-radius: 8px; padding: 4px 6px;
        }
        .event-month { font-size: 0.65rem; font-weight: 600; opacity: 0.85; }
        .event-day { font-size: 1rem; font-weight: 800; line-height: 1.2; }
        .event-member-info { display: flex; align-items: center; gap: 8px; flex: 1; }
        .event-dot { width: 10px; height: 10px; border-radius: 50%; display: block; flex-shrink: 0; }
        .event-name { font-weight: 700; font-size: 0.95rem; }
        .event-tag {
          font-size: 0.75rem; color: var(--text-sub);
          background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 8px;
        }
        .event-half-tag { background: rgba(90, 200, 250, 0.15); color: #5AC8FA; }
        .half-date-badge { background: #5AC8FA !important; }
        .event-remove-btn {
          color: var(--text-sub); padding: 4px; display: flex;
          align-items: center; transition: color 0.2s;
        }
        .event-remove-btn:hover { color: var(--danger); }

        /* 팀원 칩 */
        .team-chip-list {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding-top: 12px; border-top: 1px dashed var(--border);
        }
        .team-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px; background: rgba(0,0,0,0.03);
          border-radius: 16px; font-size: 0.82rem; font-weight: 600; color: var(--text-sub);
        }
        .chip-dot { width: 8px; height: 8px; border-radius: 50%; display: block; }
        .chip-remove-btn {
          color: var(--text-sub); display: flex; align-items: center;
          margin-left: 2px; opacity: 0.6; transition: opacity 0.2s;
        }
        .chip-remove-btn:hover { opacity: 1; color: var(--danger); }
      `}</style>
    </motion.div>
  )
}

export default VacationView
