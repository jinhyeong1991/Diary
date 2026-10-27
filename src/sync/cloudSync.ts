import { create } from 'zustand'
import type { Session, RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useUserStore, useScheduleStore, useMemoStore } from '../store/useStore'

// fileBackup.ts 의 STORAGE_KEYS 와 같은 값 (순환 import 를 피하려고 따로 둠)
const STORAGE_KEYS = ['user-storage', 'schedule-storage', 'memo-storage'] as const
type StorageKey = typeof STORAGE_KEYS[number]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STORES: Record<StorageKey, any> = {
  'user-storage': useUserStore,
  'schedule-storage': useScheduleStore,
  'memo-storage': useMemoStore,
}

const META_KEY = 'pulse-sync-meta'
const DEVICE_KEY = 'pulse-device-id'
const UPLOAD_DELAY = 700

// 기기별 동기화 기록: syncedAt = 마지막으로 서버와 맞춘 시각, dirty = 아직 안 올린 변경 있음
type Meta = Partial<Record<StorageKey, { syncedAt?: string; dirty?: boolean }>>

function readMeta(): Meta {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') } catch { return {} }
}
function writeMeta(meta: Meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)) } catch { /* ignore */ }
}
function patchMeta(key: StorageKey, patch: { syncedAt?: string; dirty?: boolean }) {
  const meta = readMeta()
  meta[key] = { ...meta[key], ...patch }
  writeMeta(meta)
}

// 백업 파일 불러오기처럼 스토어를 거치지 않고 localStorage 를 바꿀 때 호출
export function markAllDirty() {
  const meta = readMeta()
  STORAGE_KEYS.forEach(k => { meta[k] = { ...meta[k], dirty: true } })
  writeMeta(meta)
}

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export type SyncStatus = 'off' | 'signed-out' | 'not-member' | 'syncing' | 'synced' | 'error'

interface CloudState {
  session: Session | null
  status: SyncStatus
  lastSyncedAt: Date | null
  errorMsg: string
}

export const useCloudStore = create<CloudState>(() => ({
  session: null,
  status: supabase ? 'signed-out' : 'off',
  lastSyncedAt: null,
  errorMsg: '',
}))

let applying = false
let channel: RealtimeChannel | null = null
let unsubscribers: Array<() => void> = []
const timers: Partial<Record<StorageKey, ReturnType<typeof setTimeout>>> = {}

async function applyRemote(key: StorageKey, data: unknown, updatedAt: string) {
  applying = true
  try {
    localStorage.setItem(key, JSON.stringify(data))
    await STORES[key].persist.rehydrate()
    patchMeta(key, { syncedAt: updatedAt, dirty: false })
  } finally {
    applying = false
  }
}

async function upload(key: StorageKey) {
  const session = useCloudStore.getState().session
  if (!supabase || !session) return
  const raw = localStorage.getItem(key)
  if (!raw) return
  useCloudStore.setState({ status: 'syncing' })
  const { data, error } = await supabase
    .from('user_data')
    .upsert({ user_id: session.user.id, key, data: JSON.parse(raw), device_id: deviceId() })
    .select('updated_at')
    .single()
  if (error) {
    useCloudStore.setState({ status: 'error', errorMsg: error.message })
    return
  }
  patchMeta(key, { syncedAt: data.updated_at, dirty: false })
  useCloudStore.setState({ status: 'synced', lastSyncedAt: new Date(), errorMsg: '' })
  if (key === 'user-storage') syncProfile()
}

function scheduleUpload(key: StorageKey) {
  if (timers[key]) clearTimeout(timers[key])
  timers[key] = setTimeout(() => { delete timers[key]; upload(key) }, UPLOAD_DELAY)
}

async function syncProfile() {
  const session = useCloudStore.getState().session
  if (!supabase || !session) return
  const { name } = useUserStore.getState()
  await supabase.from('profiles').upsert({
    id: session.user.id,
    email: session.user.email,
    name,
  })
}

async function initialSync(userId: string) {
  if (!supabase) return
  const { data: rows, error } = await supabase
    .from('user_data')
    .select('key, data, updated_at')
    .eq('user_id', userId)
  if (error) throw error

  const meta = readMeta()
  for (const key of STORAGE_KEYS) {
    const remote = rows?.find(r => r.key === key)
    const hasLocal = !!localStorage.getItem(key)
    const m = meta[key]
    // 한 번도 동기화 안 한 기기에 데이터가 있으면 '안 올린 변경'으로 간주
    const localDirty = hasLocal && (m?.dirty || !m?.syncedAt)

    if (!remote) {
      if (hasLocal) await upload(key)
      continue
    }
    if (!localDirty) {
      await applyRemote(key, remote.data, remote.updated_at)
      continue
    }
    if (m?.syncedAt === remote.updated_at) {
      await upload(key) // 서버는 그대로고 이 기기만 바뀜
      continue
    }
    // 양쪽 다 바뀜 → 사용자에게 선택
    const label = key === 'memo-storage' ? '메모' : key === 'schedule-storage' ? '일정·연차' : '설정·팀원'
    const keepLocal = window.confirm(
      `[${label}] 이 기기와 서버의 데이터가 다릅니다.\n\n` +
      `확인 = 이 기기 데이터로 서버를 덮어쓰기\n취소 = 서버 데이터를 이 기기로 가져오기`
    )
    if (keepLocal) await upload(key)
    else await applyRemote(key, remote.data, remote.updated_at)
  }
}

function subscribeLocal() {
  unsubscribers = STORAGE_KEYS.map(key =>
    STORES[key].subscribe(() => {
      if (applying) return
      patchMeta(key, { dirty: true })
      scheduleUpload(key)
    })
  )
}

function subscribeRemote(userId: string) {
  if (!supabase) return
  channel = supabase
    .channel(`user_data:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
      payload => {
        const row = payload.new as { key: StorageKey; data: unknown; updated_at: string; device_id: string }
        if (!row?.key || row.device_id === deviceId()) return
        if (timers[row.key]) return // 이 기기에서 입력 중이면 곧 올라갈 내 데이터를 우선
        applyRemote(row.key, row.data, row.updated_at)
        useCloudStore.setState({ lastSyncedAt: new Date() })
      }
    )
    .subscribe()
}

function stopSync() {
  unsubscribers.forEach(u => u())
  unsubscribers = []
  if (channel && supabase) supabase.removeChannel(channel)
  channel = null
}

async function startSync(session: Session) {
  if (!supabase) return
  stopSync()
  useCloudStore.setState({ status: 'syncing', errorMsg: '' })

  const { data: allowed } = await supabase
    .from('team_allowlist')
    .select('email')
    .limit(1)
  if (!allowed || allowed.length === 0) {
    useCloudStore.setState({ status: 'not-member' })
    return
  }

  try {
    await initialSync(session.user.id)
    await syncProfile()
    subscribeLocal()
    subscribeRemote(session.user.id)
    useCloudStore.setState({ status: 'synced', lastSyncedAt: new Date() })
  } catch (e) {
    useCloudStore.setState({ status: 'error', errorMsg: e instanceof Error ? e.message : String(e) })
  }
}

let initialized = false
export function initCloudSync() {
  if (!supabase || initialized) return
  initialized = true
  let currentUserId: string | null = null

  supabase.auth.onAuthStateChange((_event, session) => {
    useCloudStore.setState({ session })
    if (!session) {
      currentUserId = null
      stopSync()
      useCloudStore.setState({ status: 'signed-out' })
      return
    }
    if (session.user.id === currentUserId) return // 토큰 갱신 등은 무시
    currentUserId = session.user.id
    // onAuthStateChange 콜백 안에서 바로 supabase 호출하면 교착될 수 있어 다음 틱으로 미룸
    setTimeout(() => startSync(session), 0)
  })

  // 다른 탭/앱에서 돌아왔을 때 놓친 변경 반영
  document.addEventListener('visibilitychange', () => {
    const { session, status } = useCloudStore.getState()
    if (document.visibilityState === 'visible' && session && status !== 'not-member') {
      initialSync(session.user.id).catch(() => { /* 다음 기회에 */ })
    }
  })
}

export async function sendLoginEmail(email: string) {
  if (!supabase) throw new Error('클라우드가 설정되지 않았습니다.')
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  if (error) throw error
}

export async function verifyLoginCode(email: string, token: string) {
  if (!supabase) throw new Error('클라우드가 설정되지 않았습니다.')
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
