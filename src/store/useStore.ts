import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { localDateStr } from '../utils/dateUtils'

interface TeamMember {
  id: string
  name: string
  vacationDays: number
  color: string
}

interface UserState {
  name: string
  joinDate: string
  theme: 'light' | 'dark'
  totalVacation: number
  usedVacation: number
  teamMembers: TeamMember[]
  teamVacations: Record<string, string[]> // date -> member IDs (연차)
  teamHalfDayVacations: Record<string, string[]> // date -> member IDs (반차)
  setName: (name: string) => void
  setJoinDate: (date: string) => void
  setUsedVacation: (days: number) => void
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void
  removeTeamMember: (id: string) => void
  toggleTeamVacation: (date: string, memberId: string) => void
  setTeamVacationType: (date: string, memberId: string, type: 'full' | 'half' | 'none') => void
  toggleTheme: () => void
  calculateTotalVacation: () => number
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      name: '사용자',
      joinDate: localDateStr(),
      theme: 'light',
      totalVacation: 15,
      usedVacation: 0,
      teamMembers: [],
      teamVacations: {},
      teamHalfDayVacations: {},
      setName: (name) => set({ name }),
      setJoinDate: (joinDate) => set({ joinDate }),
      setUsedVacation: (usedVacation) => set({ usedVacation }),
      addTeamMember: (member) => set((state) => ({
        teamMembers: [...state.teamMembers, { ...member, id: Math.random().toString(36).substr(2, 9) }]
      })),
      removeTeamMember: (id) => set((state) => ({
        teamMembers: state.teamMembers.filter(m => m.id !== id)
      })),
      toggleTeamVacation: (date, memberId) => set((state) => {
        const currentVacations = state.teamVacations[date] || []
        const isCurrentlyOnVacation = currentVacations.includes(memberId)
        return {
          teamVacations: {
            ...state.teamVacations,
            [date]: isCurrentlyOnVacation
              ? currentVacations.filter(id => id !== memberId)
              : [...currentVacations, memberId]
          }
        }
      }),
      setTeamVacationType: (date, memberId, type) => set((state) => {
        const removeFrom = (rec: Record<string, string[]>) => ({
          ...rec,
          [date]: (rec[date] || []).filter(id => id !== memberId)
        })
        const addTo = (rec: Record<string, string[]>) => ({
          ...rec,
          [date]: [...(rec[date] || []), memberId]
        })
        let newFull = removeFrom(state.teamVacations)
        let newHalf = removeFrom(state.teamHalfDayVacations)
        if (type === 'full') newFull = addTo(newFull)
        if (type === 'half') newHalf = addTo(newHalf)
        return { teamVacations: newFull, teamHalfDayVacations: newHalf }
      }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      calculateTotalVacation: () => {
        const { joinDate } = get()
        const start = new Date(joinDate)
        const today = new Date()
        const diffYears = today.getFullYear() - start.getFullYear()
        
        if (diffYears < 1) return 11 // 1년 미만은 월차 개념 (단순화)
        let days = 15 + Math.floor((diffYears - 1) / 2)
        return Math.min(days, 25)
      }
    }),
    {
      name: 'user-storage',
    }
  )
)

interface ScheduleItem {
  id: string
  time: number // 0-23
  task: string
  completed: boolean
}

interface ScheduleState {
  schedules: Record<string, ScheduleItem[]> // date string (YYYY-MM-DD) -> items
  holidays: Record<string, boolean>
  personalLeave: Record<string, boolean> // 연차(full) 사용일
  personalHalfLeave: Record<string, boolean> // 반차(half) 사용일
  addSchedule: (date: string, item: Omit<ScheduleItem, 'id'>) => void
  toggleSchedule: (date: string, id: string) => void
  deleteSchedule: (date: string, id: string) => void
  editSchedule: (date: string, id: string, newTask: string) => void
  toggleHoliday: (date: string) => void
  togglePersonalLeave: (date: string) => void
  setPersonalLeaveType: (date: string, type: 'full' | 'half' | 'none') => void
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      schedules: {},
      holidays: {},
      personalLeave: {},
      personalHalfLeave: {},
      addSchedule: (date, item) => set((state) => {
        const dateSchedules = state.schedules[date] || []
        return {
          schedules: {
            ...state.schedules,
            [date]: [...dateSchedules, { ...item, id: Math.random().toString(36).substr(2, 9) }]
          }
        }
      }),
      toggleSchedule: (date, id) => set((state) => {
        const dateSchedules = state.schedules[date] || []
        return {
          schedules: {
            ...state.schedules,
            [date]: dateSchedules.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
          }
        }
      }),
      deleteSchedule: (date, id) => set((state) => {
        const dateSchedules = state.schedules[date] || []
        return {
          schedules: {
            ...state.schedules,
            [date]: dateSchedules.filter(s => s.id !== id)
          }
        }
      }),
      editSchedule: (date, id, newTask) => set((state) => {
        const dateSchedules = state.schedules[date] || []
        return {
          schedules: {
            ...state.schedules,
            [date]: dateSchedules.map(s => s.id === id ? { ...s, task: newTask } : s)
          }
        }
      }),
      toggleHoliday: (date) => set((state) => ({
        holidays: {
          ...state.holidays,
          [date]: !state.holidays[date]
        }
      })),
      togglePersonalLeave: (date) => set((state) => ({
        personalLeave: {
          ...state.personalLeave,
          [date]: !state.personalLeave[date]
        }
      })),
      setPersonalLeaveType: (date, type) => set((state) => ({
        personalLeave: { ...state.personalLeave, [date]: type === 'full' },
        personalHalfLeave: { ...state.personalHalfLeave, [date]: type === 'half' },
      }))
    }),
    {
      name: 'schedule-storage',
    }
  )
)

interface MemoState {
  memos: Record<string, string>
  ideaMemos: Record<string, string>
  setMemo: (date: string, content: string) => void
  setIdeaMemo: (date: string, content: string) => void
}

export const useMemoStore = create<MemoState>()(
  persist(
    (set) => ({
      memos: {},
      ideaMemos: {},
      setMemo: (date, content) => set((state) => ({
        memos: {
          ...state.memos,
          [date]: content
        }
      })),
      setIdeaMemo: (date, content) => set((state) => ({
        ideaMemos: {
          ...state.ideaMemos,
          [date]: content
        }
      })),
    }),
    {
      name: 'memo-storage',
    }
  )
)
