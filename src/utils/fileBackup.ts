import { markAllDirty } from '../sync/cloudSync'

export const STORAGE_KEYS =['user-storage', 'schedule-storage', 'memo-storage'] as const

const DB_NAME = 'pulse-file-db'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'backup'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FSHandle = any

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveHandle(handle: FSHandle): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadHandle(): Promise<FSHandle | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function clearHandle(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(HANDLE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* ignore */ }
}

export function collectData(): Record<string, unknown> {
  const data: Record<string, unknown> = { _savedAt: new Date().toISOString() }
  STORAGE_KEYS.forEach(key => {
    const raw = localStorage.getItem(key)
    if (raw) data[key] = JSON.parse(raw)
  })
  return data
}

export function applyData(data: Record<string, unknown>): void {
  STORAGE_KEYS.forEach(key => {
    if (data[key]) localStorage.setItem(key, JSON.stringify(data[key]))
  })
  // 새로고침 후 클라우드에 올라가도록 표시
  markAllDirty()
}

export function isLocalStorageEmpty(): boolean {
  return STORAGE_KEYS.every(key => !localStorage.getItem(key))
}

export async function queryPermission(handle: FSHandle): Promise<PermissionState> {
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

export async function requestPermission(handle: FSHandle): Promise<boolean> {
  try {
    const result = await handle.requestPermission({ mode: 'readwrite' })
    return result === 'granted'
  } catch {
    return false
  }
}

export async function writeToFile(handle: FSHandle): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(collectData(), null, 2))
  await writable.close()
}

export async function readFromFile(handle: FSHandle): Promise<Record<string, unknown>> {
  const file = await handle.getFile()
  return JSON.parse(await file.text())
}

export function isFileAPISupported(): boolean {
  return 'showSaveFilePicker' in window
}

export async function pickNewFile(): Promise<FSHandle | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (window as any).showSaveFilePicker({
      suggestedName: 'my-local-pulse-backup.json',
      types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }],
    })
  } catch {
    return null
  }
}

// D:\My-Local-Pulse\save 경로로 저장 (Vite 로컬 서버 전용)
export async function saveToLocalDir(): Promise<{ ok: boolean; filename?: string }> {
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectData(), null, 2),
    })
    if (!res.ok) return { ok: false }
    return await res.json() as { ok: boolean; filename?: string }
  } catch {
    return { ok: false }
  }
}

// 로컬 서버 저장 시도 → 실패 시 브라우저 다운로드 fallback
export async function downloadSmart(): Promise<void> {
  const result = await saveToLocalDir()
  if (!result.ok) downloadFallback()
}

export function downloadFallback(): void {
  const blob = new Blob([JSON.stringify(collectData(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  const date = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
  a.download = `${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromJsonFile(): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { resolve(null); return }
      try {
        const text = await file.text()
        resolve(JSON.parse(text))
      } catch { resolve(null) }
    }
    // cancel 이벤트가 없는 브라우저 대비 - body focus로 감지
    const cleanup = () => { setTimeout(() => resolve(null), 500); window.removeEventListener('focus', cleanup) }
    window.addEventListener('focus', cleanup, { once: true })
    input.click()
  })
}
