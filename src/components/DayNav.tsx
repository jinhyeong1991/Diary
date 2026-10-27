import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { localDateStr } from '../utils/dateUtils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

// ‹ 10월 27일 (월) › + 오늘 버튼. 가운데 날짜를 누르면 달력(네이티브 date picker)이 열림
const DayNav: React.FC<{ date: string; onChange: (date: string) => void }> = ({ date, onChange }) => {
  const d = new Date(date + 'T00:00:00')
  const isToday = date === localDateStr()
  const weekday = d.getDay()

  return (
    <div className="day-nav">
      <button type="button" className="day-nav-arrow" onClick={() => onChange(shiftDate(date, -1))} aria-label="이전 날">
        <ChevronLeft size={20} />
      </button>
      <label className="day-nav-label">
        <span className={weekday === 0 ? 'sun' : weekday === 6 ? 'sat' : ''}>
          {d.getMonth() + 1}월 {d.getDate()}일 ({WEEKDAYS[weekday]})
        </span>
        <input
          type="date"
          value={date}
          onChange={e => e.target.value && onChange(e.target.value)}
          aria-label="날짜 선택"
        />
      </label>
      <button type="button" className="day-nav-arrow" onClick={() => onChange(shiftDate(date, 1))} aria-label="다음 날">
        <ChevronRight size={20} />
      </button>
      <button
        type="button"
        className={`day-nav-today ${isToday ? 'hidden' : ''}`}
        onClick={() => onChange(localDateStr())}
        tabIndex={isToday ? -1 : 0}
      >
        오늘
      </button>
    </div>
  )
}

export default DayNav
