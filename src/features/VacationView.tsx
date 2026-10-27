import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUserStore } from '../store/useStore'
import { localDateStr } from '../utils/dateUtils'

const PRESET_COLORS = [
  '#E52521', '#00A800', '#FBD000', '#24B8A8', '#AF52DE',
  '#FF2D55', '#5C94FC', '#FF8A00', '#38E54D', '#C84C0C'
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
      {/* 레트로 상단 배너 */}
      <div className="retro-view-banner">
        <div className="retro-view-banner-left">
          <img src="./retro/runner.png" alt="" className="retro-sprite" style={{ width: '36px', height: '36px' }} />
          <div>
            <div className="retro-view-banner-title">1-UP REST STAGE · 연차 월드맵</div>
            <div className="retro-view-banner-sub">나의 휴식 코인과 팀원 연차 일정을 한눈에 관리하세요</div>
          </div>
        </div>
        <img src="./retro/star-block.png" alt="" className="retro-sprite" style={{ width: '28px', height: '28px' }} />
      </div>

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
                            <span className="mdc-badge" style={{ background: type === 'half' ? 'var(--accent-cyan)' : member.color }}>
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
            <button onClick={prevMonth} className="cal-nav-btn" aria-label="이전 달"><ChevronLeft size={18} /></button>
            <span className="month-label">{year}년 {month + 1}월</span>
            <button onClick={nextMonth} className="cal-nav-btn" aria-label="다음 달"><ChevronRight size={18} /></button>
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
                <button className="close-detail-btn" onClick={() => setSelectedDate(null)} aria-label="닫기">
                  <X size={18} />
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
              <button type="button" className="form-cancel-btn" onClick={() => setShowAddMember(false)} aria-label="취소">
                <X size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {monthVacationList.length === 0 ? (
          <div className="empty-vacation-list">
            <img src="./retro/ghost.png" alt="" className="retro-sprite" style={{ width: '36px', height: '36px', marginBottom: '6px' }} />
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
                  aria-label="삭제"
                >
                  <X size={16} />
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
                <button className="chip-remove-btn" onClick={() => removeTeamMember(m.id)} title="팀원 삭제" aria-label="팀원 삭제">
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .vacation-view { display: flex; flex-direction: column; gap: 16px; }

        /* 나의 연차 */
        .my-vacation-card { display: flex; flex-direction: column; gap: 14px; }
        .vac-summary-header { display: flex; justify-content: space-between; align-items: center; }
        .vac-edit-btn {
          font-family: var(--font-pixel);
          color: #181818;
          background: var(--accent-gold);
          border: 2px solid var(--card-border);
          box-shadow: var(--pixel-shadow-sm);
          padding: 6px 12px;
          min-height: 38px;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.85rem;
        }
        .vacation-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .stat-item {
          background: var(--surface-2);
          padding: 12px 10px;
          border-radius: var(--radius-sm);
          border: 2px solid var(--card-border);
          display: flex; flex-direction: column; gap: 4px;
        }
        .stat-item.primary {
          background: var(--gold-soft);
        }
        .stat-item.primary .value { color: var(--primary); }
        .stat-item .label { font-size: 0.78rem; color: var(--text-sub); font-weight: 600; }
        .stat-item .value { font-size: 1.15rem; font-weight: 800; }
        .stat-input {
          width: 100%; border: 2px solid var(--card-border); border-radius: 4px;
          padding: 4px 8px; font-size: 16px; font-weight: 700;
          background: var(--card-bg); color: var(--text-main);
        }
        .progress-bar-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .progress-labels {
          display: flex; justify-content: space-between;
          font-family: var(--font-pixel);
          font-size: 0.8rem; color: var(--text-sub);
        }

        /* 팀원별 연차 현황 */
        .member-stats-card { display: flex; flex-direction: column; gap: 14px; }
        .member-filter-row {
          display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 8px;
          padding-bottom: 4px; scrollbar-width: none;
        }
        .member-filter-row::-webkit-scrollbar { display: none; }
        .member-filter-chip {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          min-height: 40px;
          padding: 6px 14px; border-radius: var(--radius-sm);
          border: 2px solid var(--card-border); background: var(--surface-2);
          box-shadow: var(--pixel-shadow-sm);
          font-size: 0.85rem; font-weight: 700; color: var(--text-main);
          cursor: pointer;
        }
        .member-filter-chip.active {
          background: var(--gold-soft);
        }
        .mfc-dot { width: 8px; height: 8px; border-radius: 2px; display: block; flex-shrink: 0; }
        .member-detail-panel {
          overflow: hidden; border-radius: var(--radius-sm);
          border: 2px solid var(--card-border); padding: 14px;
          background: var(--surface-2); display: flex; flex-direction: column; gap: 12px;
        }
        .member-detail-header { display: flex; align-items: center; gap: 8px; }
        .member-detail-dot { width: 10px; height: 10px; border-radius: 2px; display: block; flex-shrink: 0; }
        .member-detail-name { font-family: var(--font-pixel); font-weight: 700; font-size: 0.95rem; }
        .no-vac-text { font-size: 0.85rem; color: var(--text-sub); text-align: center; padding: 8px 0; }
        .member-date-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .member-date-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px 4px 4px;
          background: var(--card-bg); border: 2px solid var(--card-border); border-radius: var(--radius-sm);
        }
        .mdc-badge {
          color: #181818; font-family: var(--font-pixel); font-size: 0.75rem; font-weight: 700;
          padding: 2px 8px; border-radius: 3px; border: 1px solid #181818; white-space: nowrap;
        }
        .mdc-type { font-size: 0.78rem; font-weight: 700; color: var(--text-sub); }

        /* 캘린더 */
        .team-calendar-card { display: flex; flex-direction: column; gap: 14px; }
        .vac-section-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .calendar-nav { display: flex; align-items: center; gap: 6px; }
        .month-label { font-family: var(--font-pixel); font-weight: 700; font-size: 0.9rem; min-width: 82px; text-align: center; }
        .cal-nav-btn {
          color: #181818; background: var(--accent-gold);
          border: 2px solid var(--card-border); box-shadow: var(--pixel-shadow-sm);
          width: 38px; height: 38px; border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
        }
        .team-calendar-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;
        }
        .cal-day-name {
          text-align: center; font-family: var(--font-pixel); font-size: 0.72rem; font-weight: 700;
          color: var(--text-sub); padding: 4px 0;
        }
        .cal-cell {
          min-height: 54px; display: flex; flex-direction: column;
          align-items: center; padding: 4px 2px;
          border-radius: var(--radius-sm); cursor: pointer;
          position: relative;
          border: 2px solid transparent; gap: 2px;
        }
        .cal-cell.empty { cursor: default; }
        .cal-cell:not(.empty):hover { background: var(--surface-2); border-color: var(--card-border); }
        .cal-day-num { font-family: var(--font-pixel); font-size: 0.8rem; font-weight: 600; line-height: 1; }
        .cal-cell.is-today { background: var(--surface-2); border: 2px dashed var(--primary); }
        .cal-cell.is-today .cal-day-num { color: var(--primary); font-weight: 800; }
        .cal-cell.has-vacation { border-color: var(--warning) !important; background: var(--gold-soft); }
        .cal-cell.is-selected {
          background: var(--accent-gold) !important;
          border-color: var(--card-border) !important;
          box-shadow: var(--pixel-shadow-sm);
        }
        .cal-cell.is-selected .cal-day-num { color: #181818; font-weight: 800; }
        .cal-cell.is-selected .cal-member-name { color: #181818 !important; }
        .cal-cell.is-selected .cal-member-more { color: #181818; }
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
          font-size: 0.58rem; color: var(--text-sub); font-weight: 700;
        }

        /* 날짜 상세 패널 */
        .date-detail {
          overflow: hidden; background: var(--surface-2);
          border-radius: var(--radius-sm); border: 2px solid var(--card-border);
          padding: 14px; margin-top: 4px;
        }
        .date-detail-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
        }
        .date-detail-title { font-family: var(--font-pixel); font-weight: 700; color: var(--primary); font-size: 0.92rem; }
        .close-detail-btn { color: var(--text-sub); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
        .member-toggle-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .member-toggle-btn {
          display: flex; align-items: center; gap: 6px;
          min-height: 40px;
          padding: 6px 12px; border-radius: var(--radius-sm);
          border: 2px solid var(--card-border); background: var(--card-bg);
          box-shadow: var(--pixel-shadow-sm);
          font-size: 0.85rem; font-weight: 700; color: var(--text-main);
          cursor: pointer;
        }
        .member-toggle-btn.active {
          background: var(--gold-soft);
        }
        .member-toggle-dot {
          width: 8px; height: 8px; border-radius: 2px;
          background: var(--m-color, var(--border)); display: block;
        }
        .vacation-badge {
          font-family: var(--font-pixel);
          font-size: 0.68rem; background: var(--warning); color: #181818;
          border: 1px solid #181818;
          padding: 1px 6px; border-radius: 3px; margin-left: 2px;
        }
        .half-badge { background: var(--accent-cyan); }
        .member-toggle-btn.half-day {
          background: var(--cyan-soft) !important;
        }
        .vac-type-hint {
          font-size: 0.75rem; color: var(--text-sub); margin-bottom: 6px;
        }
        .cal-half-name { opacity: 0.85; }
        .no-members-text { font-size: 0.85rem; color: var(--text-sub); }

        /* 연차 목록 */
        .vacation-list-card { display: flex; flex-direction: column; gap: 14px; }
        .add-member-btn {
          display: flex; align-items: center; gap: 6px;
          min-height: 40px;
          font-family: var(--font-pixel);
          background: var(--accent-gold); color: #181818;
          border: 2px solid var(--card-border); box-shadow: var(--pixel-shadow-sm);
          padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700;
        }
        .add-member-form {
          display: flex; gap: 8px; overflow: hidden; padding-bottom: 4px;
        }
        .add-member-form input {
          flex: 1; min-width: 0; padding: 8px 12px; border-radius: var(--radius-sm);
          border: 2px solid var(--card-border); background: var(--surface-2); color: var(--text-main);
          font-size: 16px;
        }
        .form-save-btn {
          background: var(--secondary); color: white; padding: 0 14px; min-height: 42px;
          border: 2px solid var(--card-border); box-shadow: var(--pixel-shadow-sm);
          border-radius: var(--radius-sm); font-weight: 700;
        }
        .form-cancel-btn { color: var(--text-sub); width: 40px; height: 42px; display: flex; align-items: center; justify-content: center; }
        .empty-vacation-list {
          text-align: center; color: var(--text-sub); font-size: 0.88rem;
          padding: 28px 12px; border: 2px dashed var(--border-soft);
          border-radius: var(--radius-sm); line-height: 1.8;
        }
        .vacation-event-list { display: flex; flex-direction: column; gap: 8px; }
        .vacation-event-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 12px;
          background: var(--surface-2); border: 2px solid var(--card-border);
          box-shadow: var(--pixel-shadow-sm);
          border-radius: var(--radius-sm);
        }
        .event-date-badge {
          display: flex; flex-direction: column; align-items: center;
          min-width: 46px; background: var(--warning); color: #181818;
          border: 2px solid #181818;
          border-radius: var(--radius-sm); padding: 4px 6px;
          font-family: var(--font-pixel);
        }
        .event-month { font-size: 0.65rem; font-weight: 700; }
        .event-day { font-size: 0.95rem; font-weight: 800; line-height: 1.2; }
        .event-member-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .event-dot { width: 10px; height: 10px; border-radius: 2px; display: block; flex-shrink: 0; }
        .event-name { font-weight: 700; font-size: 0.95rem; }
        .event-tag {
          font-family: var(--font-pixel);
          font-size: 0.72rem; color: var(--text-main);
          background: var(--card-bg); border: 1.5px solid var(--card-border);
          padding: 2px 8px; border-radius: 3px;
        }
        .event-half-tag { background: var(--cyan-soft); }
        .half-date-badge { background: var(--accent-cyan) !important; }
        .event-remove-btn {
          color: var(--text-sub); width: 38px; height: 38px; display: flex;
          align-items: center; justify-content: center;
        }
        .event-remove-btn:hover { color: var(--danger); }

        /* 팀원 칩 */
        .team-chip-list {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding-top: 12px; border-top: 2px dashed var(--border-soft);
        }
        .team-chip {
          display: flex; align-items: center; gap: 6px;
          min-height: 36px;
          padding: 4px 10px; background: var(--surface-2);
          border: 2px solid var(--card-border);
          border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; color: var(--text-main);
        }
        .chip-dot { width: 8px; height: 8px; border-radius: 2px; display: block; }
        .chip-remove-btn {
          color: var(--text-sub); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
          margin-left: 2px; opacity: 0.85;
        }
        .chip-remove-btn:hover { opacity: 1; color: var(--danger); }
      `}</style>
    </motion.div>
  )
}

export default VacationView
