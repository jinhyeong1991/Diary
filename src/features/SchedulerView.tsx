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
      <section className="glass-card scheduler-header">
        <DayNav date={selectedDate} onChange={setSelectedDate} />
        <div className="sched-summary">
          <div className="sched-summary-text">
            <strong>{totalCount === 0 ? '등록된 일정 없음' : `${completedCount} / ${totalCount} 완료`}</strong>
            <span>{totalCount === 0 ? '아래에서 시간과 할 일을 추가하세요' : progress === 100 ? '오늘 할 일을 모두 끝냈어요 🎉' : `남은 일 ${totalCount - completedCount}개`}</span>
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
                    {item.completed ? <CheckCircle2 size={22} color="var(--primary)" /> : <Circle size={22} />}
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
        .date-picker-container {
          flex: 1;
        }
        .schedule-date-input {
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-white);
          color: var(--text-main);
          font-size: 1.1rem;
          font-weight: 600;
        }
        .progress-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .circular-progress-container {
          position: relative;
          width: 80px;
          height: 80px;
        }
        .circular-progress {
          transform: rotate(-90deg);
        }
        .bg-circle {
          fill: none;
          stroke: var(--border);
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
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .add-schedule-card {
          padding: 12px 16px;
        }
        .schedule-form .input-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .time-select {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-sub);
          background: rgba(0, 0, 0, 0.03);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
        }
        .time-select select {
          border: none;
          background: transparent;
          font-weight: 600;
          font-family: inherit;
          color: var(--text-main);
          outline: none;
        }
        .task-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 1rem;
          padding: 8px 0;
          outline: none;
          color: var(--text-main);
        }
        .add-btn {
          background: var(--primary);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
        }
        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .timeline-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .time-label {
          min-width: 50px;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-sub);
          padding-top: 20px;
        }
        .item-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .item-content:hover {
          transform: translateX(4px);
        }
        .timeline-item.completed .task-text {
          text-decoration: line-through;
          color: var(--text-sub);
        }
        .task-text {
          flex: 1;
          font-weight: 500;
        }
        .check-icon {
          display: flex;
          align-items: center;
          color: var(--text-sub);
        }
        .delete-item-btn {
          color: var(--text-sub);
          opacity: 0;
          transition: opacity 0.2s;
          padding: 4px;
        }
        .item-content:hover .delete-item-btn {
          opacity: 1;
        }
        .delete-item-btn:hover {
          color: var(--danger);
        }
        .empty-timeline {
          text-align: center;
          padding: 40px;
          color: var(--text-sub);
        }
      `}</style>
    </motion.div>
  )
}

export default SchedulerView
