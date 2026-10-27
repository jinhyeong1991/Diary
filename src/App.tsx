import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  StickyNote, 
  Settings as SettingsIcon, 
  Home,
  Moon,
  Sun,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  Users,
  Cloud,
  CloudOff
} from 'lucide-react'
import { useUserStore, useScheduleStore, useMemoStore } from './store/useStore'
import {
  loadHandle, saveHandle, clearHandle,
  queryPermission, requestPermission,
  writeToFile, readFromFile,
  applyData, isLocalStorageEmpty,
  pickNewFile, downloadFallback, saveToLocalDir, importFromJsonFile,
  isFileAPISupported, STORAGE_KEYS,
} from './utils/fileBackup'
import LoadingClock from './components/LoadingClock'
import VacationView from './features/VacationView'
import SchedulerView from './features/SchedulerView'
import SettingsView from './features/SettingsView'
import TeamView from './features/TeamView'
import { initCloudSync, useCloudStore } from './sync/cloudSync'
import { isCloudEnabled } from './lib/supabase'
import { getHolidayName, isKoreanHoliday } from './utils/koreanHolidays'
import { localDateStr } from './utils/dateUtils'

// 자정이 지나면 날짜를 오늘로 자동 갱신하는 훅
function useTodayDate(): string {
  const [today, setToday] = useState(() => localDateStr())
  useEffect(() => {
    let last = localDateStr()
    const timer = setInterval(() => {
      const now = localDateStr()
      if (now !== last) { last = now; setToday(now) }
    }, 30000)
    return () => clearInterval(timer)
  }, [])
  return today
}

// Types
type ViewType = 'home' | 'vacation' | 'scheduler' | 'memo' | 'team' | 'settings'

const App: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<ViewType>('home')
  const [time, setTime] = useState(new Date())
  const { theme, toggleTheme, name } = useUserStore()
  const cloudStatus = useCloudStore(s => s.status)

  // 클라우드(Supabase) 로그인·실시간 동기화 시작 (설정 없으면 아무 것도 안 함)
  useEffect(() => { initCloudSync() }, [])

  // App initialization
  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme)

    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 2000)

    // Clock update
    const clockTimer = setInterval(() => setTime(new Date()), 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(clockTimer)
    }
  }, [theme])

  // 3시간마다 D:\My-Local-Pulse\save 에 자동 저장
  useEffect(() => {
    const interval = setInterval(() => {
      saveToLocalDir()
    }, 3 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formattedTime = time.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formattedDate = time.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="app-container">
      <AnimatePresence>
        {loading && <LoadingClock key="loading" />}
      </AnimatePresence>

      {!loading && (
        <>
          {/* Desktop Header */}
          <header className="desktop-header">
            <div className="header-left">
              <div className="logo" onClick={() => setActiveView('home')} style={{cursor: 'pointer'}}>
                <span className="pulse-dot"></span>
                My-Local-Pulse
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="desktop-nav">
              <button className={`desktop-nav-item ${activeView === 'home' ? 'active' : ''}`} onClick={() => setActiveView('home')}>홈</button>
              <button className={`desktop-nav-item ${activeView === 'vacation' ? 'active' : ''}`} onClick={() => setActiveView('vacation')}>연차</button>
              <button className={`desktop-nav-item ${activeView === 'scheduler' ? 'active' : ''}`} onClick={() => setActiveView('scheduler')}>일정</button>
              <button className={`desktop-nav-item ${activeView === 'memo' ? 'active' : ''}`} onClick={() => setActiveView('memo')}>메모</button>
              <button className={`desktop-nav-item ${activeView === 'team' ? 'active' : ''}`} onClick={() => setActiveView('team')}>팀</button>
              <button className={`desktop-nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>설정</button>
            </nav>

            <div className="header-actions">
              <div className="current-info">
                <span className="clock-display">{formattedTime}</span>
                <span className="date-display">{formattedDate}</span>
              </div>
              {isCloudEnabled && (
                <button
                  className={`cloud-indicator cloud-${cloudStatus}`}
                  onClick={() => setActiveView('team')}
                  title={cloudStatus === 'synced' ? '실시간 동기화 중' : cloudStatus === 'syncing' ? '동기화 중...' : cloudStatus === 'error' ? '동기화 오류' : '로그인하면 기기 간 동기화됩니다'}
                >
                  {cloudStatus === 'synced' || cloudStatus === 'syncing' ? <Cloud size={20} /> : <CloudOff size={20} />}
                </button>
              )}
              <button onClick={toggleTheme} className="theme-toggle">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <div className="user-profile">
                <span>{name}님</span>
              </div>
            </div>
          </header>

          <main className="main-content">
            <AnimatePresence mode="wait">
              {activeView === 'home' && <HomeView key="home" />}
              {activeView === 'vacation' && <VacationView key="vacation" />}
              {activeView === 'scheduler' && <SchedulerView key="scheduler" />}
              {activeView === 'memo' && <MemoView key="memo" />}
              {activeView === 'team' && <TeamView key="team" />}
              {activeView === 'settings' && <SettingsView key="settings" />}
            </AnimatePresence>
          </main>

          {/* Mobile Bottom Tab Bar */}
          <nav className="mobile-nav">
            <NavItem icon={<Home size={24} />} label="홈" active={activeView === 'home'} onClick={() => setActiveView('home')} />
            <NavItem icon={<Calendar size={24} />} label="연차" active={activeView === 'vacation'} onClick={() => setActiveView('vacation')} />
            <NavItem icon={<Clock size={24} />} label="일정" active={activeView === 'scheduler'} onClick={() => setActiveView('scheduler')} />
            <NavItem icon={<StickyNote size={24} />} label="메모" active={activeView === 'memo'} onClick={() => setActiveView('memo')} />
            <NavItem icon={<Users size={24} />} label="팀" active={activeView === 'team'} onClick={() => setActiveView('team')} />
            <NavItem icon={<SettingsIcon size={24} />} label="설정" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
          </nav>
        </>
      )}

      <style>{`
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Desktop Header */
        .desktop-header {
          height: var(--header-height);
          background-color: var(--glass-bg);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .current-info {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .clock-display {
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .date-display {
          font-size: 0.85rem;
          color: var(--text-sub);
          font-weight: 500;
        }

        .logo {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background-color: var(--primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .theme-toggle {
          color: var(--text-main);
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .theme-toggle:hover {
          background-color: var(--border);
        }

        .user-profile {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .cloud-indicator {
          padding: 8px;
          border-radius: 50%;
          color: var(--text-sub);
          display: flex;
        }
        .cloud-indicator.cloud-synced { color: var(--success); }
        .cloud-indicator.cloud-syncing { color: var(--primary); }
        .cloud-indicator.cloud-error,
        .cloud-indicator.cloud-not-member { color: var(--danger); }

        /* Main Content */
        .main-content {
          flex: 1;
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding-bottom: calc(var(--nav-height) + 24px); /* For mobile nav */
        }

        /* Mobile Nav */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: var(--nav-height);
          background-color: var(--glass-bg);
          backdrop-filter: blur(15px);
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 10px;
          z-index: 1000;
        }

        /* Desktop Nav */
        .desktop-nav {
          display: none;
          align-items: center;
          gap: 8px;
        }

        .desktop-nav-item {
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          color: var(--text-sub);
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .desktop-nav-item:hover {
          color: var(--text-main);
          background-color: rgba(0, 0, 0, 0.03);
        }

        .desktop-nav-item.active {
          color: var(--primary);
          background-color: rgba(0, 122, 255, 0.1);
        }

        .logo, .desktop-nav-item, .user-profile, .date-display {
          white-space: nowrap;
        }

        @media (max-width: 1100px) {
          .date-display { display: none; }
          .desktop-nav-item { padding: 8px 10px; }
        }

        @media (min-width: 769px) {
          .desktop-nav {
            display: flex;
          }
          .mobile-nav {
            display: none;
          }
          .main-content {
            padding-bottom: 24px;
          }
        }

        @media (max-width: 768px) {
          .desktop-header {
            padding: 0 16px;
          }
          .main-content {
            padding: 16px 16px calc(var(--nav-height) + env(safe-area-inset-bottom) + 16px);
          }
          .mobile-nav {
            height: calc(var(--nav-height) + env(safe-area-inset-bottom));
            padding-bottom: env(safe-area-inset-bottom);
          }
          .header-actions { gap: 4px; }
          .date-display, .user-profile { display: none; }
        }
      `}</style>
    </div>
  )
}

// Work Countdown Component
const WorkCountdown: React.FC = () => {
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentHours = time.getHours()
  const currentMinutes = time.getMinutes()
  const currentSeconds = time.getSeconds()
  
  const startHour = 9
  const endHour = 18
  
  const totalSeconds = (endHour - startHour) * 3600
  const nowSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds
  const startSeconds = startHour * 3600
  const endSeconds = endHour * 3600

  let timeLeftStr = ''
  let percent = 0
  let isWorking = false

  if (nowSeconds < startSeconds) {
    timeLeftStr = '출근 전입니다 ☕'
    percent = 0
  } else if (nowSeconds >= endSeconds) {
    timeLeftStr = '수고하셨습니다! 퇴근하세요 🎉'
    percent = 100
  } else {
    isWorking = true
    const remaining = endSeconds - nowSeconds
    const h = String(Math.floor(remaining / 3600)).padStart(2, '0')
    const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')
    const s = String(remaining % 60).padStart(2, '0')
    timeLeftStr = `${h}:${m}:${s}`
    
    const elapsed = nowSeconds - startSeconds
    percent = (elapsed / totalSeconds) * 100
  }

  return (
    <div className="glass-card stat-card">
      <h3>퇴근 타이머</h3>
      <div className="vacation-value" style={{ color: isWorking ? 'var(--primary)' : 'var(--text-main)' }}>
        {timeLeftStr}
      </div>
    </div>
  )
}

// Sub-components for views
const HomeView: React.FC = () => {
  const { totalVacation, usedVacation, name, teamMembers, teamVacations, teamHalfDayVacations, setTeamVacationType, addTeamMember, removeTeamMember } = useUserStore()
  const { schedules, addSchedule, toggleSchedule, deleteSchedule, editSchedule, holidays, toggleHoliday, personalLeave, personalHalfLeave, setPersonalLeaveType } = useScheduleStore()
  const { memos, setMemo, ideaMemos, setIdeaMemo } = useMemoStore()

  const [newTask, setNewTask] = useState('')
  const today = useTodayDate()
  const [selectedDate, setSelectedDate] = useState(today)

  // 자정이 지나면 선택 날짜를 오늘로 자동 갱신
  const prevTodayRef = useRef(today)
  useEffect(() => {
    if (prevTodayRef.current !== today) {
      prevTodayRef.current = today
      setSelectedDate(today)
    }
  }, [today])
  const [newMemberName, setNewMemberName] = useState('')
  const [showMemberInput, setShowMemberInput] = useState(false)
  
  const daySchedules = schedules[selectedDate] || []
  const completedCount = daySchedules.filter(s => s.completed).length
  const totalCount = daySchedules.length
  const scheduleProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  
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
  const vacationRemaining = totalVacation - effectiveUsed
  const vacationProgress = totalVacation > 0 ? (effectiveUsed / totalVacation) * 100 : 0

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return
    addSchedule(selectedDate, {
      time: new Date().getHours(),
      task: newTask,
      completed: false
    })
    setNewTask('')
  }

  const getTeamVacType = (date: string, memberId: string): 'full' | 'half' | 'none' => {
    if ((teamVacations[date] || []).includes(memberId)) return 'full'
    if ((teamHalfDayVacations[date] || []).includes(memberId)) return 'half'
    return 'none'
  }

  const handleMemberVacClick = (date: string, memberId: string) => {
    const cur = getTeamVacType(date, memberId)
    if (cur === 'none') setTeamVacationType(date, memberId, 'full')
    else if (cur === 'full') setTeamVacationType(date, memberId, 'half')
    else setTeamVacationType(date, memberId, 'none')
  }

  const getPersonalLeaveType = (date: string): 'full' | 'half' | 'none' => {
    if (personalLeave[date]) return 'full'
    if (personalHalfLeave[date]) return 'half'
    return 'none'
  }

  const handlePersonalLeaveClick = (date: string) => {
    const cur = getPersonalLeaveType(date)
    if (cur === 'none') setPersonalLeaveType(date, 'full')
    else if (cur === 'full') setPersonalLeaveType(date, 'half')
    else setPersonalLeaveType(date, 'none')
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) return
    addTeamMember({
      name: newMemberName,
      vacationDays: 15,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    })
    setNewMemberName('')
    setShowMemberInput(false)
  }

  // Circular Progress Helper
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (scheduleProgress / 100) * circumference

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="view-container home-view"
    >
      <section className="welcome-card glass-card">
        <h2>{name}님, 좋은 하루입니다! 👋</h2>
        <p>오늘의 펄스를 확인해보세요.</p>
      </section>

      <div className="home-main-grid">
        <div className="home-left-col">
          <div className="stat-row">
            <div className="glass-card stat-card">
              <h3>나의 남은 연차</h3>
              <div className="vacation-value">{vacationRemaining.toFixed(1)}<span>일</span></div>
            </div>
            <WorkCountdown />
          </div>

          <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ alignSelf: 'flex-start', width: '100%', marginBottom: '16px' }}>일정 진행률</h3>
            <div className="circular-progress-container" style={{ width: '70%', maxWidth: '350px', aspectRatio: '1/1' }}>
              <svg className="circular-progress" width="100%" height="100%" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                <circle cx="50" cy="50" r={radius} className="bg-circle" />
                <motion.circle 
                  cx="50" cy="50" r={radius} 
                  className="progress-circle"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="circular-text">
                <span className="percent">{scheduleProgress.toFixed(0)}%</span>
                <span className="count">{completedCount} / {totalCount}</span>
              </div>
            </div>
          </div>
          
          <div className="glass-card mini-calendar-card">
            <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
          </div>
        </div>

        <div className="home-right-col">
          <section className="glass-card today-schedule-card">
            <div className="card-header">
              <h3>
                {selectedDate === localDateStr()
                  ? '오늘의 일정'
                  : `${selectedDate.split('-')[1]}월 ${selectedDate.split('-')[2]}일 일정`}
              </h3>
              <span className="task-count">{totalCount}개</span>
            </div>
            
            <form onSubmit={handleQuickAdd} className="quick-add-form">
              <input 
                type="text" 
                placeholder="이 날짜에 할 일을 바로 추가하세요..." 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button type="submit"><Plus size={18} /></button>
            </form>

            <div className="home-task-list">
              {daySchedules.length === 0 ? (
                <div className="empty-tasks">등록된 일정이 없습니다. 일정을 추가해보세요!</div>
              ) : (
                daySchedules.map(task => (
                  <div key={task.id} className={`home-task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-content">
                      <button type="button" className="toggle-btn" onClick={() => toggleSchedule(selectedDate, task.id)}>
                        {task.completed ? <CheckCircle2 size={18} color="var(--primary)" /> : <Circle size={18} />}
                      </button>
                      <input 
                        type="text"
                        value={task.task}
                        onChange={(e) => editSchedule(selectedDate, task.id, e.target.value)}
                        className="task-edit-input"
                        placeholder="일정 내용"
                      />
                    </div>
                    <button type="button" className="delete-task-btn" onClick={() => deleteSchedule(selectedDate, task.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="card-header" style={{ marginTop: '24px', marginBottom: '8px' }}>
              <h3>📝 주요 메모 (일정용)</h3>
            </div>
            <textarea 
              value={memos[selectedDate] || ''}
              onChange={(e) => setMemo(selectedDate, e.target.value)}
              placeholder={`${selectedDate.split('-')[1]}월 ${selectedDate.split('-')[2]}일의 주요 업무나 일정을 메모해두세요.`}
              className="home-memo-textarea"
            />

            <div className="card-header" style={{ marginTop: '24px', marginBottom: '8px' }}>
              <h3>💡 아이디어 메모 (기타)</h3>
            </div>
            <textarea 
              value={ideaMemos[selectedDate] || ''}
              onChange={(e) => setIdeaMemo(selectedDate, e.target.value)}
              placeholder={`${selectedDate.split('-')[1]}월 ${selectedDate.split('-')[2]}일에 떠오른 아이디어나 기타 내용을 적어주세요. 날짜별로 저장됩니다.`}
              className="home-memo-textarea"
            />

            <div style={{ marginTop: '24px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isKoreanHoliday(selectedDate) && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 59, 48, 0.08)',
                  border: '1.5px solid var(--danger)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🎌 법정공휴일: {getHolidayName(selectedDate)}
                </div>
              )}
              {!isKoreanHoliday(selectedDate) && (
                <button
                  type="button"
                  onClick={() => toggleHoliday(selectedDate)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: holidays[selectedDate] ? 'var(--danger)' : 'rgba(255, 59, 48, 0.06)',
                    color: holidays[selectedDate] ? 'white' : 'var(--danger)',
                    border: `1.5px solid ${holidays[selectedDate] ? 'var(--danger)' : 'rgba(255,59,48,0.3)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    fontSize: '0.88rem'
                  }}
                >
                  {holidays[selectedDate] ? '🔴 추가 공휴일 지정 취소' : '🔴 추가 공휴일로 지정'}
                </button>
              )}
              {(() => {
                const leaveType = getPersonalLeaveType(selectedDate)
                const isFullLeave = leaveType === 'full'
                const isHalfLeave = leaveType === 'half'
                return (
                  <button
                    type="button"
                    onClick={() => handlePersonalLeaveClick(selectedDate)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: isFullLeave ? '#FF9500' : isHalfLeave ? '#5AC8FA' : 'rgba(255, 149, 0, 0.06)',
                      color: (isFullLeave || isHalfLeave) ? 'white' : '#FF9500',
                      border: `1.5px solid ${isFullLeave ? '#FF9500' : isHalfLeave ? '#5AC8FA' : 'rgba(255,149,0,0.3)'}`,
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      fontSize: '0.88rem'
                    }}
                  >
                    {isFullLeave ? '🌴 연차 지정됨 (클릭 → 반차)' : isHalfLeave ? '☀️ 반차 지정됨 (클릭 → 해제)' : '🌴 연차 / 반차 지정'}
                  </button>
                )
              })()}
            </div>

            <div className="card-header" style={{ marginTop: '24px' }}>
              <h3>연차 일정</h3>
              <button className="small-add-btn" onClick={() => setShowMemberInput(!showMemberInput)}>
                <Plus size={14} /> 팀원 추가
              </button>
            </div>
            
            <AnimatePresence>
              {showMemberInput && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddMember} 
                  className="quick-member-form"
                >
                  <input 
                    type="text" 
                    placeholder="팀원 이름 입력" 
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit">추가</button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="team-vacation-list">
              {teamMembers.length === 0 ? (
                <div className="empty-tasks" style={{ padding: '20px 0' }}>팀원을 추가하고 연차를 관리해보세요!</div>
              ) : (
                <div className="team-member-badges">
                  {teamMembers.map(member => {
                    const vacType = getTeamVacType(selectedDate, member.id)
                    return (
                      <div key={member.id} className="badge-wrapper">
                        <button
                          className={`member-badge ${vacType === 'full' ? 'on-vacation' : ''} ${vacType === 'half' ? 'on-half-vacation' : ''}`}
                          onClick={() => handleMemberVacClick(selectedDate, member.id)}
                          style={{ '--member-color': member.color } as React.CSSProperties}
                          title="클릭: 없음 → 연차 → 반차 → 없음"
                        >
                          <span className="badge-dot"></span>
                          {member.name}
                          {vacType === 'full' && <span className="badge-vac-tag">연차</span>}
                          {vacType === 'half' && <span className="badge-vac-tag half">반차</span>}
                        </button>
                        <button
                          type="button"
                          className="remove-badge-btn"
                          onClick={() => removeTeamMember(member.id)}
                          title="이 팀원 삭제하기"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="vacation-help-text">* 클릭할 때마다 없음 → 🟠 연차 → 🔵 반차 → 없음 순으로 변경됩니다.</div>
            </div>
          </section>
        </div>
      </div>

      <BackupBar />

      <style>{`
        .home-main-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .home-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .home-left-col, .home-right-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stat-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .vacation-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary);
          margin-top: 8px;
        }
        
        .vacation-value span {
          font-size: 0.9rem;
          color: var(--text-sub);
          margin-left: 4px;
        }

        .circular-progress-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .circular-progress {
          transform: rotate(-90deg);
        }

        .bg-circle {
          fill: none;
          stroke: rgba(0,0,0,0.04);
          stroke-width: 6;
        }

        .progress-circle {
          fill: none;
          stroke: var(--primary);
          stroke-width: 6;
          stroke-linecap: round;
        }

        .circular-text {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .circular-text .percent {
          font-size: 4rem;
          font-weight: 900;
          color: var(--text-main);
          line-height: 1;
          letter-spacing: -1px;
        }

        .circular-text .count {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-sub);
          margin-top: 8px;
        }

        .home-memo-textarea {
          width: 100%;
          min-height: 120px;
          margin-top: 8px;
          padding: 12px;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.01);
          color: var(--text-main);
          font-size: 0.95rem;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          transition: background 0.2s, border-color 0.2s;
        }

        .home-memo-textarea:focus {
          background: var(--bg-white);
          border-color: var(--primary);
        }

        .today-schedule-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 400px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .task-count {
          font-size: 0.8rem;
          background: var(--primary);
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .quick-add-form {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          background: rgba(0, 0, 0, 0.03);
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          transition: border-color 0.2s;
        }

        .quick-add-form:focus-within {
          border-color: var(--primary);
          background: var(--bg-white);
        }

        .quick-add-form input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.95rem;
          color: var(--text-main);
        }

        .quick-add-form button {
          color: var(--primary);
        }

        .home-task-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .home-task-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }

        .home-task-item:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        .task-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: var(--text-sub);
        }

        .task-edit-input {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text-main);
          font-size: 0.95rem;
          outline: none;
          padding: 4px 0;
          transition: border-bottom 0.2s;
          border-bottom: 1px solid transparent;
        }

        .task-edit-input:focus {
          border-bottom: 1px solid var(--primary);
        }

        .home-task-item.completed .task-edit-input {
          text-decoration: line-through;
          color: var(--text-sub);
        }

        .delete-task-btn {
          color: var(--text-sub);
          padding: 4px;
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
        }

        .home-task-item:hover .delete-task-btn {
          opacity: 1;
        }

        .delete-task-btn:hover {
          color: var(--danger);
        }

        .team-member-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .badge-wrapper {
          position: relative;
          display: inline-flex;
        }

        .member-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--bg-white);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-sub);
          transition: all 0.2s;
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border);
          transition: background 0.2s;
        }

        .member-badge.on-vacation {
          border-color: #FF9500;
          background: rgba(255, 149, 0, 0.08);
          color: var(--text-main);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .member-badge.on-vacation .badge-dot {
          background: #FF9500;
        }

        .member-badge.on-half-vacation {
          border-color: #5AC8FA;
          background: rgba(90, 200, 250, 0.08);
          color: var(--text-main);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .member-badge.on-half-vacation .badge-dot {
          background: #5AC8FA;
        }

        .badge-vac-tag {
          font-size: 0.68rem;
          background: #FF9500;
          color: white;
          padding: 1px 5px;
          border-radius: 6px;
          margin-left: 2px;
          font-weight: 700;
        }

        .badge-vac-tag.half {
          background: #5AC8FA;
        }

        .remove-badge-btn {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ff3b30;
          color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .remove-badge-btn:hover {
          transform: scale(1.1);
        }

        .badge-wrapper:hover .remove-badge-btn {
          opacity: 1;
        }

        .small-add-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--primary);
          background: rgba(0, 122, 255, 0.1);
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 600;
        }

        .quick-member-form {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .quick-member-form input {
          flex: 1;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-white);
          color: var(--text-main);
          font-size: 0.9rem;
        }

        .quick-member-form button {
          background: var(--primary);
          color: white;
          padding: 0 16px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .vacation-help-text {
          font-size: 0.75rem;
          color: var(--text-sub);
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed var(--border);
        }

        .empty-tasks {
          text-align: center;
          color: var(--text-sub);
          padding: 40px 0;
          font-size: 0.9rem;
        }

        .circular-progress-container {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto;
        }

        .circular-progress {
          transform: rotate(-90deg);
        }

        .bg-circle {
          fill: none;
          stroke: var(--border);
          stroke-width: 8;
        }

        .progress-circle {
          fill: none;
          stroke: var(--primary);
          stroke-width: 8;
          stroke-linecap: round;
        }

        .circular-text {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .circular-text .percent {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1;
        }

        .circular-text .count {
          font-size: 0.75rem;
          color: var(--text-sub);
          margin-top: 4px;
        }
      `}</style>
    </motion.div>
  )
}

// Backup Bar Component
type BackupStatus = 'checking' | 'no-file' | 'permission-needed' | 'connected' | 'saving' | 'saved' | 'restoring' | 'error' | 'downloading'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FSHandle = any

const BackupBar: React.FC = () => {
  const [status, setStatus] = useState<BackupStatus>('checking')
  const [handle, setHandle] = useState<FSHandle>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [fileName, setFileName] = useState('')
  const [, setTick] = useState(0)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const handleRef = useRef<FSHandle>(null)

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  const doSave = async (h: FSHandle) => {
    try {
      setStatus('saving')
      await writeToFile(h)
      setLastSaved(new Date())
      setStatus('saved')
      setTimeout(() => setStatus('connected'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('connected'), 3000)
    }
  }

  const startAutoSave = (h: FSHandle) => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    handleRef.current = h
    autoSaveRef.current = setInterval(() => {
      if (handleRef.current) doSave(handleRef.current)
    }, 20 * 60 * 1000)
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const h = await loadHandle()
      if (!mounted) return
      if (!h) { setStatus('no-file'); return }

      const perm = await queryPermission(h)
      if (!mounted) return

      if (perm === 'granted') {
        setHandle(h)
        setFileName(h.name)
        setStatus('connected')
        startAutoSave(h)
        if (isLocalStorageEmpty()) {
          try {
            const data = await readFromFile(h)
            applyData(data)
            window.location.reload()
          } catch { /* 파일이 비어있을 수 있음 */ }
        }
      } else if (perm === 'prompt') {
        setHandle(h)
        setFileName(h.name)
        setStatus('permission-needed')
      } else {
        await clearHandle()
        setStatus('no-file')
      }
    }
    init()
    return () => {
      mounted = false
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [])

  const handleConnect = async () => {
    const h = await pickNewFile()
    if (!h) return
    await saveHandle(h)
    await writeToFile(h)
    setHandle(h)
    handleRef.current = h
    setFileName(h.name)
    setLastSaved(new Date())
    setStatus('connected')
    startAutoSave(h)
  }

  const handleRequestPermission = async () => {
    if (!handle) return
    const granted = await requestPermission(handle)
    if (granted) {
      setStatus('connected')
      startAutoSave(handle)
    } else {
      await clearHandle()
      setHandle(null)
      setStatus('no-file')
    }
  }

  const handleManualSave = () => { if (handle) doSave(handle) }

  const [downloadMsg, setDownloadMsg] = useState('')

  const handleDownload = async () => {
    setDownloadMsg('저장 중...')
    const result = await saveToLocalDir()
    if (result.ok) {
      setDownloadMsg(`✓ save\\${result.filename} 저장 완료!`)
    } else {
      downloadFallback()
      setDownloadMsg('✓ 브라우저 다운로드 완료!')
    }
    setTimeout(() => setDownloadMsg(''), 4000)
  }

  const handleRestoreFromFile = async () => {
    if (!handle) return
    try {
      setStatus('restoring')
      const data = await readFromFile(handle)
      const hasData = STORAGE_KEYS.some(key => key in data)
      if (!hasData) throw new Error('empty')
      applyData(data)
      setTimeout(() => window.location.reload(), 500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('connected'), 3000)
    }
  }

  const handleImportJson = async () => {
    try {
      const data = await importFromJsonFile()
      if (!data) return
      const hasData = STORAGE_KEYS.some(key => key in data)
      if (!hasData) { alert('올바른 My-Local-Pulse 백업 파일을 선택해주세요.'); return }
      applyData(data)
      setTimeout(() => window.location.reload(), 300)
    } catch {
      alert('불러오기 실패: 파일을 확인해주세요.')
    }
  }

  const handleDisconnect = async () => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    await clearHandle()
    setHandle(null)
    handleRef.current = null
    setFileName('')
    setLastSaved(null)
    setStatus('no-file')
  }

  const timeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    return `${Math.floor(diff / 3600)}시간 전`
  }

  const isConnectedState = ['connected', 'saving', 'saved'].includes(status)

  const statusLabel = () => {
    if (status === 'checking') return '백업 상태 확인 중...'
    if (status === 'restoring') return '⏳ 복원 중...'
    if (status === 'error') return '⚠️ 실패. 파일을 확인해주세요.'
    if (status === 'permission-needed') return `🔒 ${fileName} — 접근 권한이 필요합니다`
    if (status === 'saving') return '⏳ 저장 중...'
    if (status === 'saved') return '✓ 저장 완료!'
    if (isConnectedState) return `✓ 자동저장 ON · ${fileName}${lastSaved ? ` · ${timeAgo(lastSaved)} 저장` : ''}`
    if (!isFileAPISupported()) return '💾 데이터 백업'
    return '📁 자동저장 꺼짐 — 파일 연결 시 20분마다 자동 저장'
  }

  return (
    <div className={`backup-bar ${isConnectedState ? 'bb-connected' : ''} ${status === 'error' ? 'bb-error' : ''}`}>
      <span className="backup-bar-label">
        {downloadMsg || statusLabel()}
      </span>

      <div className="backup-bar-btns">
        {/* 항상 표시: 다운로드 & 불러오기 */}
        <button onClick={handleDownload} className="backup-bar-btn" title="D:\My-Local-Pulse\save 폴더에 저장합니다">
          ⬇️ 다운로드
        </button>
        <button onClick={handleImportJson} className="backup-bar-btn" title="다른 기기에서 저장한 백업 파일을 불러옵니다">
          📂 불러오기
        </button>

        {/* 파일 자동저장 연결 (no-file 상태, File API 지원 시) */}
        {status === 'no-file' && isFileAPISupported() && (
          <button onClick={handleConnect} className="backup-bar-btn primary">자동저장 파일 연결</button>
        )}

        {/* 권한 필요 */}
        {status === 'permission-needed' && (
          <button onClick={handleRequestPermission} className="backup-bar-btn primary">권한 허용</button>
        )}

        {/* 연결된 상태 */}
        {isConnectedState && (
          <>
            <button onClick={handleManualSave} className="backup-bar-btn primary" disabled={status === 'saving'}>
              💾 지금 저장
            </button>
            <button onClick={handleRestoreFromFile} className="backup-bar-btn">파일 복원</button>
            <button onClick={handleDisconnect} className="backup-bar-btn danger">연결 해제</button>
          </>
        )}
      </div>

      <BackupBarStyle />
    </div>
  )
}

const BackupBarStyle: React.FC = () => (
  <style>{`
    .backup-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: rgba(0,0,0,0.03);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      gap: 12px;
      flex-wrap: nowrap;
      overflow-x: auto;
    }
    .backup-bar.bb-connected {
      background: rgba(52, 199, 89, 0.06);
      border-color: rgba(52, 199, 89, 0.3);
    }
    .backup-bar.bb-error {
      background: rgba(255, 59, 48, 0.05);
      border-color: rgba(255, 59, 48, 0.3);
    }
    .backup-bar.bb-error .backup-bar-label {
      color: var(--danger);
    }
    .backup-bar-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-sub);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .backup-bar.bb-connected .backup-bar-label {
      color: #34C759;
    }
    .backup-bar-btns {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
      margin-left: auto;
    }
    .backup-bar-btn {
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--bg-white);
      color: var(--text-sub);
      transition: all 0.2s;
      white-space: nowrap;
    }
    .backup-bar-btn:hover:not(:disabled) {
      background: rgba(0,0,0,0.05);
      color: var(--text-main);
    }
    .backup-bar-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .backup-bar-btn.primary {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
    .backup-bar-btn.primary:hover:not(:disabled) { opacity: 0.85; background: var(--primary); }
    .backup-bar-btn.danger { color: var(--danger); border-color: rgba(255,59,48,0.4); }
    .backup-bar-btn.danger:hover { background: rgba(255,59,48,0.08); }
  `}</style>
)

// Mini Calendar Component
interface MiniCalendarProps {
  selectedDate: string
  onDateSelect: (date: string) => void
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { memos, ideaMemos } = useMemoStore()
  const { schedules, holidays, personalLeave, personalHalfLeave } = useScheduleStore()
  const { teamVacations, teamHalfDayVacations, teamMembers } = useUserStore()
  const todayStr = localDateStr()

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

  return (
    <div className="mini-calendar">
      <div className="calendar-header">
        <button onClick={prevMonth} className="cal-nav-btn">&lt;</button>
        <span>{year}년 {month + 1}월</span>
        <button onClick={nextMonth} className="cal-nav-btn">&gt;</button>
      </div>
      <div className="calendar-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="day-name">{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={i} className="day-cell empty"></div>
          
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const hasMemo = (memos[dateStr]?.trim() !== '' && !!memos[dateStr]) ||
                         (ideaMemos[dateStr]?.trim() !== '' && !!ideaMemos[dateStr]) ||
                         (schedules[dateStr]?.length > 0)
          const isHoliday = isKoreanHoliday(dateStr) || holidays[dateStr]
          const isLeave = personalLeave[dateStr]
          const isHalfLeave = !isLeave && personalHalfLeave[dateStr]
          const hasTeamVacation = (teamVacations[dateStr] || []).some(id => teamMembers.find(m => m.id === id))
            || (teamHalfDayVacations[dateStr] || []).some(id => teamMembers.find(m => m.id === id))

          return (
            <div
              key={i}
              className={`day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasMemo ? 'has-memo' : ''} ${isHoliday ? 'is-holiday' : ''} ${isLeave ? 'is-personal-leave' : ''} ${isHalfLeave ? 'is-personal-half-leave' : ''} ${hasTeamVacation ? 'has-team-vacation' : ''}`}
              onClick={() => onDateSelect(dateStr)}
              title={isKoreanHoliday(dateStr) ? getHolidayName(dateStr) ?? undefined : undefined}
            >
              <span className="day-num">{d}</span>
              {hasMemo && <span className="memo-dot" />}
            </div>
          )
        })}
      </div>
      <style>{`
        .mini-calendar {
          width: 100%;
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--text-main);
        }
        .cal-nav-btn {
          color: var(--text-sub);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .cal-nav-btn:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text-main);
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .day-name {
          text-align: center;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-sub);
          padding: 4px 0;
        }
        .day-cell {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-size: 0.85rem;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          padding-bottom: 2px;
        }
        .day-num {
          line-height: 1;
        }
        .memo-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--primary);
          display: block;
          flex-shrink: 0;
        }
        .day-cell.selected .memo-dot {
          background: rgba(255, 255, 255, 0.85);
        }
        .day-cell.is-holiday .memo-dot {
          background: var(--danger);
        }
        .day-cell.is-holiday.selected .memo-dot,
        .day-cell.is-personal-leave.selected .memo-dot {
          background: rgba(255, 255, 255, 0.85);
        }
        .day-cell.is-personal-leave .memo-dot {
          background: #FF9500;
        }
        .day-cell:not(.empty):hover {
          background: rgba(0, 122, 255, 0.1);
          color: var(--primary);
        }
        .day-cell.today {
          border: 1px dashed var(--primary);
          color: var(--primary);
          font-weight: 700;
        }
        .day-cell.has-memo {
          border: 1.5px dashed var(--primary);
          font-weight: 700;
        }
        .day-cell.has-memo.today {
          border: 2px dashed var(--primary);
          color: var(--primary);
        }
        .day-cell.is-holiday {
          background: rgba(255, 59, 48, 0.1);
          border: 2px solid var(--danger);
          color: var(--danger);
          font-weight: 700;
        }
        .day-cell.is-holiday.selected {
          background: var(--danger) !important;
          border-color: var(--danger);
          color: white !important;
        }
        .day-cell.is-personal-leave {
          background: rgba(255, 149, 0, 0.12);
          border: 2px solid #FF9500;
          color: #FF9500;
          font-weight: 700;
        }
        .day-cell.is-personal-leave.selected {
          background: #FF9500 !important;
          border-color: #FF9500;
          color: white !important;
        }
        .day-cell.is-personal-half-leave {
          background: rgba(90, 200, 250, 0.12);
          border: 2px solid #5AC8FA;
          color: #5AC8FA;
          font-weight: 700;
        }
        .day-cell.is-personal-half-leave.selected {
          background: #5AC8FA !important;
          border-color: #5AC8FA;
          color: white !important;
        }
        .day-cell.has-team-vacation {
          border: 2px solid #FF9500;
        }
        .day-cell.has-team-vacation.selected {
          background: var(--primary) !important;
          border-color: var(--primary) !important;
        }
        .day-cell.selected {
          background: var(--primary) !important;
          color: white !important;
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}

const MemoView: React.FC = () => {
  const { memos, setMemo, ideaMemos, setIdeaMemo } = useMemoStore()
  const today = useTodayDate()
  const content = memos[today] || ''
  const ideaContent = ideaMemos[today] || ''
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="view-container memo-view-container"
    >
      <div className="glass-card memo-card">
        <h3>📝 주요 메모 ({today})</h3>
        <textarea 
          value={content}
          onChange={(e) => setMemo(today, e.target.value)}
          placeholder="여기에 자유롭게 주요 업무나 일정을 메모하세요. 자동으로 날짜별 저장됩니다."
          className="memo-textarea"
        />
      </div>

      <div className="glass-card memo-card" style={{ marginTop: '20px' }}>
        <h3>💡 아이디어 메모 (기타)</h3>
        <textarea 
          value={ideaContent}
          onChange={(e) => setIdeaMemo(today, e.target.value)}
          placeholder="오늘 떠오른 아이디어나 메모를 적어주세요. 내일이 되면 새로운 메모장으로 시작합니다."
          className="memo-textarea"
        />
      </div>
      <style>{`
        .memo-view-container {
          display: flex;
          flex-direction: column;
        }
        .memo-card {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .memo-textarea {
          flex: 1;
          margin-top: 16px;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-sm);
          padding: 16px;
          background: rgba(0,0,0,0.01);
          color: var(--text-main);
          font-size: 1.1rem;
          line-height: 1.6;
          resize: vertical;
          min-height: 200px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .memo-textarea:focus {
          border-color: var(--primary);
          background: var(--bg-white);
        }
      `}</style>
    </motion.div>
  )
}

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
    <div className="nav-icon">{icon}</div>
    <span className="nav-label">{label}</span>
    <style>{`
      .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: var(--text-sub);
        transition: color 0.2s, transform 0.2s;
        flex: 1;
      }
      .nav-item.active {
        color: var(--primary);
        transform: translateY(-4px);
      }
      .nav-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nav-label {
        font-size: 0.7rem;
        font-weight: 600;
      }
    `}</style>
  </button>
)

export default App
