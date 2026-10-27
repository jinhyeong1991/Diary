import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, CheckCircle2, Circle, Trash2, Clock } from 'lucide-react'
import { useScheduleStore } from '../store/useStore'
import { localDateStr } from '../utils/dateUtils'
import DayNav from '../components/DayNav'

const SchedulerView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(() => localDateStr())

  // 자정이 지나면 오늘 날짜로 자동 갱신
  useEffect(() => {
    let last = localDateStr()
    const timer = setInterval(() => {
      const now = localDateStr()
      if (now !== last) { last = now; setSelectedDate(now) }
    }, 30000)
    return () => clearInterval(timer)
  }, [])
  const { schedules, addSchedule, toggleSchedule, deleteSchedule } = useScheduleStore()
  const [newTask, setNewTask] = useState('')
  const [newTime, setNewTime] = useState(new Date().getHours())

  const daySchedules = schedules[selectedDate] || []
  const completedCount = daySchedules.filter(s => s.completed).length
  const totalCount = daySchedules.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return
    addSchedule(selectedDate, {
      time: newTime,
      task: newTask,
      completed: false
    })
    setNewTask('')
  }

  // Sort by time
  const sortedSchedules = [...daySchedules].sort((a, b) => a.time - b.time)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="view-container"
    >
      <div className="retro-view-banner">
        <div className="retro-view-banner-left">
          <img src="./retro/robot.png" alt="" className="retro-sprite" style={{ width: '36px', height: '36px' }} />
          <div>
            <div className="retro-view-banner-title">DAILY QUEST LOG · 시간별 일정</div>
            <div className="retro-view-banner-sub">오늘의 퀘스트를 클리어하고 경험치(XP)를 채우세요!</div>
          </div>
        </div>
        <img src="./retro/slime.png" alt="" className="retro-sprite" style={{ width: '30px', height: '30px' }} />
      </div>

      <section className="glass-card scheduler-header">
        <DayNav date={selectedDate} onChange={setSelectedDate} />
        <div className="sched-summary">
          <div className="sched-summary-text">
            <strong>{totalCount === 0 ? '등록된 퀘스트 없음' : `${completedCount} / ${totalCount} 퀘스트 완료`}</strong>
            <span>{totalCount === 0 ? '아래에서 시간과 할 일을 추가하세요' : progress === 100 ? 'STAGE CLEAR! 오늘 할 일을 모두 끝냈어요 🎉' : `남은 퀘스트 ${totalCount - completedCount}개`}</span>
            <div className="sched-bar"><div style={{ width: `${progress}%` }} /></div>
          </div>
          <span className="pill">{progress.toFixed(0)}%</span>
        </div>
      </section>

      <section className="glass-card add-schedule-card">
        <form onSubmit={handleAdd} className="schedule-form">
          <div className="input-row">
            <div className="time-select">
              <Clock size={18} />
              <select value={newTime} onChange={(e) => setNewTime(parseInt(e.target.value))}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <input 
              type="text" 
              placeholder="할 일 입력"
              enterKeyHint="done"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="task-input"
            />
            <button type="submit" className="add-btn" aria-label="일정 추가"><Plus size={20} /></button>
          </div>
        </form>
      </section>

      <section className="timeline-section">
        {sortedSchedules.length === 0 ? (
          <div className="glass-card empty-timeline">
            <img src="./retro/star-block.png" alt="" className="retro-sprite" style={{ width: '40px', height: '40px', marginBottom: '8px' }} />
            <p>이 날 등록된 일정이 없습니다.<br />위 입력칸에 할 일을 적고 + 를 눌러 추가하세요.</p>
          </div>
        ) : (
          <div className="timeline-list">
            {sortedSchedules.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`timeline-item ${item.completed ? 'completed' : ''}`}
              >
                <div className="time-label">{item.time.toString().padStart(2, '0')}:00</div>
                <div className="item-content glass-card" onClick={() => toggleSchedule(selectedDate, item.id)}>
                  <div className="check-icon">
                    {item.completed ? <CheckCircle2 size={22} color="var(--secondary)" /> : <Circle size={22} />}
                  </div>
                  <span className="task-text">{item.task}</span>
                  <button
                    className="delete-item-btn"
                    aria-label="일정 삭제"
                    onClick={(e) => { e.stopPropagation(); deleteSchedule(selectedDate, item.id); }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .scheduler-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .add-schedule-card {
          padding: 12px 14px;
        }
        .schedule-form .input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .time-select {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-main);
          background: var(--surface-2);
          padding: 0 10px;
          height: 44px;
          border-radius: var(--radius-sm);
          border: 2px solid var(--card-border);
        }
        .time-select select {
          border: none;
          background: transparent;
          font-family: var(--font-pixel);
          font-weight: 700;
          color: var(--text-main);
          outline: none;
        }
        .task-input {
          flex: 1;
          min-width: 0;
          height: 44px;
          border: 2px solid var(--card-border);
          background: var(--surface-2);
          font-size: 16px;
          padding: 0 12px;
          border-radius: var(--radius-sm);
          outline: none;
          color: var(--text-main);
        }
        .add-btn {
          background: var(--accent-gold);
          color: #181818;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          border: 2px solid var(--card-border);
          box-shadow: var(--pixel-shadow-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .timeline-item {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .time-label {
          min-width: 48px;
          font-family: var(--font-pixel);
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-main);
        }
        .item-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          cursor: pointer;
        }
        .timeline-item.completed .task-text {
          text-decoration: line-through;
          color: var(--text-sub);
        }
        .task-text {
          flex: 1;
          font-weight: 600;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .check-icon {
          display: flex;
          align-items: center;
          color: var(--text-sub);
          flex-shrink: 0;
        }
        .delete-item-btn {
          color: var(--text-sub);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .delete-item-btn:hover {
          color: var(--danger);
        }
        .empty-timeline {
          text-align: center;
          padding: 32px 16px;
          color: var(--text-sub);
        }
      `}</style>
    </motion.div>
  )
}

export default SchedulerView
