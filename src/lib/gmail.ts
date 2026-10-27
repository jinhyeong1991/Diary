// Gmail 안 읽은 메일: 구글 로그인 팝업(Google Identity Services)으로 읽기 전용 토큰을 받아 브라우저에서 바로 조회
// 토큰은 이 탭(sessionStorage)에만 1시간 보관하고 서버나 다른 기기로 보내지 않음

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
export const isGmailEnabled = !!GOOGLE_CLIENT_ID

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const TOKEN_KEY = 'pulse-gmail-token'
const CONNECTED_KEY = 'pulse-gmail-connected' // 한 번이라도 연결했는지 (버튼 문구용)
const API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface MailItem {
  id: string
  threadId: string
  from: string
  subject: string
  snippet: string
  date: Date
}

interface StoredToken { token: string; expiresAt: number }

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { google?: any }
}

let scriptPromise: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error('구글 로그인 스크립트를 불러오지 못했습니다.')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export function getStoredToken(): string | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null') as StoredToken | null
    return t && t.expiresAt > Date.now() + 60_000 ? t.token : null
  } catch { return null }
}

export function wasConnected(): boolean {
  try { return localStorage.getItem(CONNECTED_KEY) === '1' } catch { return false }
}

// 반드시 버튼 클릭 안에서 호출 (팝업 차단 방지)
export async function connectGmail(): Promise<string> {
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      prompt: wasConnected() ? '' : 'consent',
      callback: (res: any) => {
        if (res.error || !res.access_token) return reject(new Error(res.error_description || res.error || '구글 연결이 취소되었습니다.'))
        const stored: StoredToken = { token: res.access_token, expiresAt: Date.now() + Number(res.expires_in || 3600) * 1000 }
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify(stored))
          localStorage.setItem(CONNECTED_KEY, '1')
        } catch { /* ignore */ }
        resolve(res.access_token)
      },
      error_callback: (err: any) => reject(new Error(err?.type === 'popup_closed' ? '구글 로그인 창이 닫혔습니다.' : '구글 로그인 창을 열지 못했습니다. 팝업 차단을 확인해 주세요.')),
    })
    client.requestAccessToken()
  })
}

export async function disconnectGmail() {
  const token = getStoredToken()
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CONNECTED_KEY)
  } catch { /* ignore */ }
  if (token) {
    await loadGis().catch(() => null)
    window.google?.accounts?.oauth2?.revoke(token, () => {})
  }
}

async function gmailGet(token: string, path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
    throw new Error('EXPIRED')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message || `Gmail 오류 (HTTP ${res.status})`)
  }
  return res.json()
}

// "홍길동 <a@b.com>" → "홍길동"
function senderName(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*<.+>\s*$/)
  return (m ? m[1] : from).trim()
}

export async function fetchUnread(token: string, max = 10): Promise<{ total: number; items: MailItem[] }> {
  const [label, list] = await Promise.all([
    gmailGet(token, '/labels/INBOX'),
    gmailGet(token, `/messages?q=${encodeURIComponent('is:unread in:inbox')}&maxResults=${max}`),
  ])
  const ids: { id: string }[] = list.messages ?? []
  const items = await Promise.all(ids.map(async ({ id }) => {
    const m = await gmailGet(token, `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`)
    const header = (name: string) => (m.payload?.headers ?? []).find((h: any) => h.name === name)?.value ?? ''
    return {
      id,
      threadId: m.threadId,
      from: senderName(header('From')),
      subject: header('Subject') || '(제목 없음)',
      snippet: decodeEntities(m.snippet ?? ''),
      date: new Date(Number(m.internalDate)),
    }
  }))
  return { total: label.messagesUnread ?? items.length, items }
}

function decodeEntities(s: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}

export function threadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${threadId}`
}
