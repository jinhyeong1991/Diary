import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, ChevronLeft, ChevronRight, Mail, ExternalLink, Sparkles, Settings2, KeyRound, Eye, EyeOff, ClipboardPaste } from 'lucide-react'
import { useUserStore } from '../store/useStore'
import type { FortuneProfile, FortuneResult } from '../store/useStore'
import { fetchWeather, describeWeather, dustGrade, weatherTip } from '../lib/weather'
import type { WeatherData } from '../lib/weather'
import { fetchFortune, zodiacAnimal, starSign, ageOf } from '../lib/gemini'
import { localDateStr } from '../utils/dateUtils'
import { isGmailEnabled, getStoredToken, wasConnected, connectGmail, disconnectGmail, fetchUnread, threadUrl } from '../lib/gmail'
import type { MailItem } from '../lib/gmail'

type Page = 'main' | 'fortune' | 'setup'

const TodayView: React.FC = () => {
  const [page, setPage] = useState<Page>('main')
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="view-container today-view"
    >
      {page === 'main' && <TodayMain onOpenFortune={() => setPage('fortune')} onSetup={() => setPage('setup')} />}
      {page === 'fortune' && <FortunePage onBack={() => setPage('main')} onSetup={() => setPage('setup')} />}
      {page === 'setup' && <FortuneSetup onDone={() => setPage('fortune')} onBack={() => setPage('main')} />}
      <TodayStyle />
    </motion.div>
  )
}

/* ───────── 오늘 메인: 날씨 · 운세 미리보기 · 메일 ───────── */
const TodayMain: React.FC<{ onOpenFortune: () => void; onSetup: () => void }> = ({ onOpenFortune, onSetup }) => {
  const today = new Date()
  const label = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
  return (
    <>
      <div className="retro-view-banner">
        <div className="retro-view-banner-left">
          <img src="./retro/runner.png" alt="" className="retro-sprite" style={{ width: '36px', height: '36px' }} />
          <div>
            <div className="retro-view-banner-title">TODAY · 오늘</div>
            <div className="retro-view-banner-sub">{label} · 날씨와 운세를 확인하세요</div>
          </div>
        </div>
        <img src="./retro/star-block.png" alt="" className="retro-sprite" style={{ width: '28px', height: '28px' }} />
      </div>
      <WeatherCard />
      <FortunePreview onOpen={onOpenFortune} onSetup={onSetup} />
      <MailCard />
    </>
  )
}

const WeatherCard: React.FC = () => {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true); setError('')
    fetchWeather().then(setData).catch(e => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const now = data ? describeWeather(data.code, data.isDay) : null
  const pm10 = data ? dustGrade(data.pm10, 'pm10') : null
  const pm25 = data ? dustGrade(data.pm25, 'pm25') : null

  return (
    <section className="glass-card weather-card">
      <div className="section-title">
        <h3>🌤️ 오늘의 날씨</h3>
        <button className="today-icon-btn" onClick={load} disabled={loading} aria-label="날씨 새로고침">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>
      {error && <p className="today-muted">{error}</p>}
      {!data && !error && <p className="today-muted">날씨를 불러오는 중...</p>}
      {data && now && (
        <>
          <div className="weather-now">
            <span className="weather-icon">{now.icon}</span>
            <div className="weather-temp">
              <strong>{data.temp}°</strong>
              <span>{now.label} · 체감 {data.feelsLike}°</span>
            </div>
            <div className="weather-range">
              <span className="weather-place">📍 {data.place}</span>
              <span>최고 {data.max}° / 최저 {data.min}°</span>
              <span>강수 확률 {data.rainChance}%</span>
            </div>
          </div>
          <div className="weather-hourly">
            {data.hourly.map((h, i) => {
              const w = describeWeather(h.code, h.hour >= 6 && h.hour < 19)
              return (
                <div key={i} className="weather-hour">
                  <span className="weather-hour-time">{i === 0 ? '지금' : `${h.hour}시`}</span>
                  <span className="weather-hour-icon">{w.icon}</span>
                  <span className="weather-hour-temp">{h.temp}°</span>
                  <span className="weather-hour-rain">{h.rainChance > 0 ? `${h.rainChance}%` : ''}</span>
                </div>
              )
            })}
          </div>
          <div className="weather-dust">
            {pm10 && <span className={`dust-chip dust-${pm10.level}`}>미세먼지 {pm10.label}</span>}
            {pm25 && <span className={`dust-chip dust-${pm25.level}`}>초미세먼지 {pm25.label}</span>}
          </div>
          <p className="weather-tip">{weatherTip(data)}</p>
        </>
      )}
    </section>
  )
}

const FortunePreview: React.FC<{ onOpen: () => void; onSetup: () => void }> = ({ onOpen, onSetup }) => {
  const { fortuneProfile, geminiApiKey, fortunes } = useUserStore()
  const today = fortunes[localDateStr()]
  const ready = !!fortuneProfile && !!geminiApiKey
  return (
    <section className="glass-card fortune-preview" onClick={ready ? onOpen : onSetup} role="button" tabIndex={0}>
      <div className="section-title">
        <h3>🔮 오늘의 운세</h3>
        <ChevronRight size={18} color="var(--text-sub)" />
      </div>
      {!ready && <p className="today-muted">처음 한 번만 이름·성별·생년월일을 설정하면 매일 운세를 볼 수 있어요.</p>}
      {ready && !today && <p className="today-muted">{fortuneProfile!.name}님의 오늘 운세가 준비됐어요. 눌러서 확인하세요!</p>}
      {ready && today && (
        <div className="fortune-mini">
          <ScoreRing score={today.total.score} size={64} />
          <div className="fortune-mini-text">
            <strong>{today.summary}</strong>
            <span>금전 {today.money.score} · 연애 {today.love.score} · 직장 {today.work.score}</span>
          </div>
        </div>
      )}
    </section>
  )
}

const MailCard: React.FC = () => (
  <section className="glass-card mail-card">
    <div className="section-title">
      <h3><Mail size={18} /> 메일</h3>
    </div>
    <div className="mail-links">
      <a className="mail-link mail-naver" href="https://mail.naver.com/" target="_blank" rel="noopener noreferrer">
        <span className="mail-badge">N</span>
        <span className="mail-name">네이버 메일</span>
        <ExternalLink size={14} />
      </a>
      <a className="mail-link mail-gmail" href="https://mail.google.com/mail/" target="_blank" rel="noopener noreferrer">
        <span className="mail-badge">G</span>
        <span className="mail-name">Gmail</span>
        <ExternalLink size={14} />
      </a>
    </div>
    <p className="today-muted">휴대폰에서는 설치된 메일 앱이나 브라우저로 열립니다.</p>
    {isGmailEnabled && <GmailInbox />}
  </section>
)

// Gmail 안 읽은 메일 목록 (구글 로그인 후 1시간 동안 유지, 지나면 '다시 연결')
const GmailInbox: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [data, setData] = useState<{ total: number; items: MailItem[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (t: string) => {
    setLoading(true); setError('')
    try { setData(await fetchUnread(t)) }
    catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      if (m === 'EXPIRED') { setToken(null); setData(null) } else setError(m)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (token) load(token) }, [token, load])

  const connect = async () => {
    setError('')
    try { setToken(await connectGmail()) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  const disconnect = async () => { await disconnectGmail(); setToken(null); setData(null) }

  const timeLabel = (d: Date) => {
    const today = new Date()
    return d.toDateString() === today.toDateString()
      ? d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  }

  return (
    <div className="gmail-box">
      {!token ? (
        <button className="gmail-connect" onClick={connect}>
          <span className="mail-badge">G</span>
          {wasConnected() ? 'Gmail 다시 연결하고 안 읽은 메일 보기' : 'Gmail 연결하고 안 읽은 메일 보기'}
        </button>
      ) : (
        <>
          <div className="gmail-head">
            <strong>📬 Gmail 안 읽은 메일 {data ? `${data.total}개` : ''}</strong>
            <button className="today-icon-btn" onClick={() => load(token)} disabled={loading} aria-label="메일 새로고침">
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>
          {!data && loading && <p className="today-muted">메일을 불러오는 중...</p>}
          {data && data.items.length === 0 && <p className="today-muted">안 읽은 메일이 없어요. 🎉</p>}
          {data && data.items.length > 0 && (
            <ul className="gmail-list">
              {data.items.map(m => (
                <li key={m.id}>
                  <a href={threadUrl(m.threadId)} target="_blank" rel="noopener noreferrer" className="gmail-item">
                    <div className="gmail-item-top">
                      <span className="gmail-from">{m.from}</span>
                      <span className="gmail-time">{timeLabel(m.date)}</span>
                    </div>
                    <span className="gmail-subject">{m.subject}</span>
                    <span className="gmail-snippet">{m.snippet}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {data && data.total > data.items.length && (
            <p className="today-muted">최근 {data.items.length}개만 보여요. 나머지는 Gmail에서 확인하세요.</p>
          )}
          <button className="gmail-disconnect" onClick={disconnect}>Gmail 연결 끊기</button>
        </>
      )}
      {error && <p className="fortune-error-text">{error}</p>}
    </div>
  )
}

/* ───────── 운세 상세 ───────── */
const FORTUNE_ITEMS: { key: keyof Pick<FortuneResult, 'total' | 'money' | 'love' | 'work' | 'health' | 'relationship'>; label: string; icon: string }[] = [
  { key: 'total', label: '총운', icon: '⭐' },
  { key: 'money', label: '금전운', icon: '💰' },
  { key: 'love', label: '연애운', icon: '💕' },
  { key: 'work', label: '직장·학업운', icon: '💼' },
  { key: 'health', label: '건강운', icon: '💪' },
  { key: 'relationship', label: '대인관계운', icon: '🤝' },
]

const FortunePage: React.FC<{ onBack: () => void; onSetup: () => void }> = ({ onBack, onSetup }) => {
  const { fortuneProfile, geminiApiKey, fortunes, saveFortune } = useUserStore()
  const date = localDateStr()
  const result = fortunes[date]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!fortuneProfile || !geminiApiKey) return onSetup()
    setLoading(true); setError('')
    try { saveFortune(await fetchFortune(geminiApiKey, fortuneProfile, date)) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }

  // 오늘 운세가 아직 없으면 바로 받아옴 (같은 날은 다시 부르지 않음 → 모든 기기에서 같은 결과)
  useEffect(() => { if (!result) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!fortuneProfile) return null
  return (
    <>
      <div className="today-subheader">
        <button className="today-back" onClick={onBack}><ChevronLeft size={18} /> 오늘</button>
        <button className="today-icon-btn" onClick={onSetup} aria-label="운세 정보 수정"><Settings2 size={18} /></button>
      </div>

      <section className="glass-card fortune-hero">
        <div className="fortune-who">
          <strong>{fortuneProfile.name}님의 오늘 운세</strong>
          <span>
            {date.replace(/-/g, '.')} · {zodiacAnimal(fortuneProfile.birthDate)} · {starSign(fortuneProfile.birthDate)} · 만 {ageOf(fortuneProfile.birthDate)}세
          </span>
        </div>
        {loading && <p className="today-muted"><Sparkles size={14} /> 운세를 보고 있어요...</p>}
        {error && (
          <div className="fortune-error">
            <p>{error}</p>
            <button className="today-primary" onClick={load}>다시 시도</button>
          </div>
        )}
        {result && (
          <div className="fortune-total">
            <ScoreRing score={result.total.score} size={96} />
            <p className="fortune-summary">{result.summary}</p>
          </div>
        )}
      </section>

      {result && (
        <>
          <section className="glass-card fortune-scores">
            {FORTUNE_ITEMS.slice(1).map(it => (
              <div key={it.key} className="fortune-bar-row">
                <span className="fortune-bar-label">{it.icon} {it.label}</span>
                <div className="fortune-bar"><div style={{ width: `${result[it.key].score}%` }} /></div>
                <span className="fortune-bar-score">{result[it.key].score}</span>
              </div>
            ))}
          </section>

          {FORTUNE_ITEMS.map(it => (
            <section key={it.key} className="glass-card fortune-detail">
              <div className="section-title">
                <h3>{it.icon} {it.label}</h3>
                <span className="pill">{result[it.key].score}점</span>
              </div>
              <p>{result[it.key].text}</p>
            </section>
          ))}

          <section className="glass-card fortune-lucky">
            <h3>🍀 오늘의 행운</h3>
            <div className="lucky-grid">
              <div><span>색</span><strong>{result.lucky.color}</strong></div>
              <div><span>숫자</span><strong>{result.lucky.number}</strong></div>
              <div><span>방향</span><strong>{result.lucky.direction}</strong></div>
              <div><span>물건</span><strong>{result.lucky.item}</strong></div>
              <div><span>시간</span><strong>{result.lucky.time}</strong></div>
            </div>
          </section>

          <section className="glass-card fortune-advice">
            <p>“{result.advice}”</p>
          </section>
          <p className="today-muted fortune-note">재미로 보는 운세예요. 같은 날에는 모든 기기에서 같은 결과가 보입니다.</p>
        </>
      )}
    </>
  )
}

/* ───────── 운세 정보 입력 (처음 1회) ───────── */
const FortuneSetup: React.FC<{ onDone: () => void; onBack: () => void }> = ({ onDone, onBack }) => {
  const { name, fortuneProfile, geminiApiKey, setFortuneProfile, setGeminiApiKey, fortunes } = useUserStore()
  const [form, setForm] = useState<FortuneProfile>(fortuneProfile ?? { name: name === '사용자' ? '' : name, gender: 'male', birthDate: '', birthTime: '', calendar: 'solar' })
  const [key, setKey] = useState(geminiApiKey)
  const [showKey, setShowKey] = useState(false)
  const [msg, setMsg] = useState('')

  const pasteKey = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text) { setMsg('클립보드가 비어 있어요. 키를 먼저 복사해 주세요.'); return }
      setKey(text); setMsg('')
    } catch {
      setMsg('붙여넣기 권한이 없어요. 입력칸을 길게 눌러 "붙여넣기"를 선택해 주세요.')
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.birthDate) { setMsg('이름과 생년월일을 입력해 주세요.'); return }
    if (!key.trim()) { setMsg('Google AI Studio API 키를 입력해 주세요.'); return }
    const changed = JSON.stringify(form) !== JSON.stringify(fortuneProfile)
    setFortuneProfile({ ...form, name: form.name.trim() })
    setGeminiApiKey(key.trim())
    // 정보가 바뀌면 오늘 운세를 새로 받도록 오늘 결과를 비움
    if (changed && fortunes[localDateStr()]) {
      const rest = { ...fortunes }; delete rest[localDateStr()]
      useUserStore.setState({ fortunes: rest })
    }
    onDone()
  }

  const set = <K extends keyof FortuneProfile>(k: K, v: FortuneProfile[K]) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="today-subheader">
        <button className="today-back" onClick={onBack}><ChevronLeft size={18} /> 오늘</button>
      </div>
      <section className="glass-card fortune-setup">
        <h3>🔮 운세 정보 설정</h3>
        <p className="today-muted">처음 한 번만 입력하면 됩니다. 나중에 운세 화면의 톱니바퀴에서 바꿀 수 있어요.</p>
        <form onSubmit={submit} className="setup-form">
          <label>이름
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="홍길동" />
          </label>
          <div className="setup-label">성별</div>
          <div className="seg">
            <button type="button" className={form.gender === 'male' ? 'on' : ''} onClick={() => set('gender', 'male')}>남성</button>
            <button type="button" className={form.gender === 'female' ? 'on' : ''} onClick={() => set('gender', 'female')}>여성</button>
          </div>
          <div className="setup-label">생년월일</div>
          <BirthDatePicker value={form.birthDate} onChange={v => set('birthDate', v)} />
          <div className="seg">
            <button type="button" className={form.calendar === 'solar' ? 'on' : ''} onClick={() => set('calendar', 'solar')}>양력</button>
            <button type="button" className={form.calendar === 'lunar' ? 'on' : ''} onClick={() => set('calendar', 'lunar')}>음력</button>
          </div>
          <div className="setup-label">태어난 시간 <small>(모르면 '모름')</small></div>
          <BirthTimePicker value={form.birthTime} onChange={v => set('birthTime', v)} />

          <div className="setup-key">
            <div className="setup-label"><KeyRound size={14} /> Google AI Studio API 키</div>
            {/* type=password 는 일부 휴대폰 키보드가 붙여넣기를 막아서 text + 가림 처리 */}
            <div className="key-row">
              <input
                type="text" value={key} onChange={e => setKey(e.target.value.trim())}
                className={showKey ? '' : 'masked'} placeholder="AIza로 시작하는 키"
                autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              />
              <button type="button" className="key-btn" onClick={() => setShowKey(s => !s)} aria-label={showKey ? '키 숨기기' : '키 보기'}>
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="button" className="key-paste" onClick={pasteKey}><ClipboardPaste size={16} /> 복사한 키 붙여넣기</button>
            <p className="today-muted">
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a> 에서 무료로 만들 수 있어요.
              키는 내 계정에만 저장되고 팀원은 볼 수 없습니다.
            </p>
          </div>

          {msg && <p className="fortune-error-text">{msg}</p>}
          <button type="submit" className="today-primary">저장하고 운세 보기</button>
        </form>
      </section>
    </>
  )
}

/* ───────── 생년월일·시간 선택 (휴대폰 기본 달력은 연도 고르기가 불편하고 일부 기기에서 안 열려서 드롭다운 사용) ───────── */
const pad = (n: number) => String(n).padStart(2, '0')

const BirthDatePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [y, m, d] = value ? value.split('-').map(Number) : [0, 0, 0]
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: thisYear - 1929 }, (_, i) => thisYear - i)
  const [partial, setPartial] = useState<[number, number, number]>([y, m, d])
  const [py, pm, pd] = value ? [y, m, d] : partial
  const daysIn = py && pm ? new Date(py, pm, 0).getDate() : 31
  // 세 칸이 다 골라져야 값이 생김. 일이 그 달 범위를 넘으면 말일로 맞춤
  const update = (ny: number, nm: number, nd: number) => {
    setPartial([ny, nm, nd])
    if (ny && nm && nd) onChange(`${ny}-${pad(nm)}-${pad(Math.min(nd, new Date(ny, nm, 0).getDate()))}`)
    else onChange('')
  }
  return (
    <div className="picker-row">
      <select value={py || ''} onChange={e => update(Number(e.target.value), pm, pd)} aria-label="태어난 해">
        <option value="">년</option>
        {years.map(v => <option key={v} value={v}>{v}년</option>)}
      </select>
      <select value={pm || ''} onChange={e => update(py, Number(e.target.value), pd)} aria-label="태어난 달">
        <option value="">월</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(v => <option key={v} value={v}>{v}월</option>)}
      </select>
      <select value={pd || ''} onChange={e => update(py, pm, Number(e.target.value))} aria-label="태어난 날">
        <option value="">일</option>
        {Array.from({ length: daysIn }, (_, i) => i + 1).map(v => <option key={v} value={v}>{v}일</option>)}
      </select>
    </div>
  )
}

const BirthTimePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [h, min] = value ? value.split(':').map(Number) : [-1, 0]
  const hourLabel = (v: number) => `${v < 12 ? '오전' : '오후'} ${v % 12 === 0 ? 12 : v % 12}시`
  return (
    <div className="picker-row">
      <select value={h} onChange={e => { const nh = Number(e.target.value); onChange(nh < 0 ? '' : `${pad(nh)}:${pad(min)}`) }} aria-label="태어난 시">
        <option value={-1}>모름</option>
        {Array.from({ length: 24 }, (_, i) => i).map(v => <option key={v} value={v}>{hourLabel(v)}</option>)}
      </select>
      <select value={min} disabled={h < 0} onChange={e => onChange(`${pad(h)}:${pad(Number(e.target.value))}`)} aria-label="태어난 분">
        {Array.from({ length: 12 }, (_, i) => i * 5).map(v => <option key={v} value={v}>{v}분</option>)}
      </select>
    </div>
  )
}

/* ───────── 점수 원형 게이지 ───────── */
const ScoreRing: React.FC<{ score: number; size: number }> = ({ score, size }) => {
  const r = size / 2 - 6
  const c = 2 * Math.PI * r
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="score-ring-bg" />
        <circle
          cx={size / 2} cy={size / 2} r={r} className="score-ring-fg"
          strokeDasharray={c} strokeDashoffset={c - (Math.max(0, Math.min(100, score)) / 100) * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span style={{ fontSize: size / 3.6 }}>{score}</span>
    </div>
  )
}

const TodayStyle: React.FC = () => (
  <style>{`
    .today-muted { font-size: var(--fs-sm); color: var(--text-sub); line-height: 1.5; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .today-muted a { color: var(--primary); font-weight: 700; }
    .today-icon-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-sub); background: var(--surface-2); flex-shrink: 0; }
    .today-icon-btn .spin { animation: todaySpin 0.8s linear infinite; }
    @keyframes todaySpin { to { transform: rotate(360deg); } }
    .today-primary { height: 44px; padding: 0 18px; border-radius: 12px; background: var(--primary); color: #fff; font-weight: 700; font-size: var(--fs-base); }
    .today-subheader { display: flex; align-items: center; justify-content: space-between; }
    .today-back { display: flex; align-items: center; gap: 2px; height: 36px; padding: 0 10px 0 4px; border-radius: 10px; color: var(--text-main); font-weight: 700; background: var(--surface-2); }

    .weather-now { display: flex; align-items: center; gap: 12px; }
    .weather-icon { font-size: 2.75rem; line-height: 1; }
    .weather-temp { display: flex; flex-direction: column; min-width: 0; }
    .weather-temp strong { font-size: 2rem; line-height: 1.1; color: var(--text-main); }
    .weather-temp span { font-size: var(--fs-sm); color: var(--text-sub); }
    .weather-range { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; font-size: var(--fs-xs); color: var(--text-sub); text-align: right; }
    .weather-place { color: var(--text-main); font-weight: 700; }
    .weather-hourly { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 14px; padding: 10px 4px; background: var(--surface-2); border-radius: 12px; }
    .weather-hour { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: var(--fs-xs); }
    .weather-hour-time { color: var(--text-sub); }
    .weather-hour-icon { font-size: 1.25rem; }
    .weather-hour-temp { font-weight: 700; color: var(--text-main); }
    .weather-hour-rain { color: var(--primary); min-height: 1em; }
    .weather-dust { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
    .dust-chip { font-size: var(--fs-xs); font-weight: 700; padding: 4px 10px; border-radius: 999px; }
    .dust-0 { background: rgba(0, 122, 255, 0.12); color: #1a73e8; }
    .dust-1 { background: rgba(52, 199, 89, 0.15); color: #1e9e45; }
    .dust-2 { background: rgba(255, 149, 0, 0.15); color: #d97a00; }
    .dust-3 { background: rgba(255, 59, 48, 0.15); color: #e0352b; }
    .weather-tip { margin-top: 10px; font-size: var(--fs-sm); color: var(--text-main); }

    .fortune-preview { cursor: pointer; }
    .fortune-mini { display: flex; align-items: center; gap: 14px; }
    .fortune-mini-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .fortune-mini-text strong { color: var(--text-main); font-size: var(--fs-base); }
    .fortune-mini-text span { color: var(--text-sub); font-size: var(--fs-xs); }

    .mail-card h3 { display: flex; align-items: center; gap: 6px; }
    .mail-links { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    @media (max-width: 420px) { .mail-links { grid-template-columns: 1fr; } }
    .mail-link { display: flex; align-items: center; gap: 8px; height: 48px; padding: 0 12px; border-radius: 12px; background: var(--surface-2); color: var(--text-main); font-weight: 700; text-decoration: none; min-width: 0; }
    .mail-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mail-badge { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; flex-shrink: 0; }
    .mail-naver .mail-badge { background: #03C75A; }
    .mail-gmail .mail-badge, .gmail-connect .mail-badge { background: #EA4335; }
    .gmail-box { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border); display: flex; flex-direction: column; gap: 10px; }
    .gmail-connect { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-main); font-weight: 700; font-size: var(--fs-sm); text-align: left; }
    .gmail-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .gmail-head strong { font-size: var(--fs-base); color: var(--text-main); }
    .gmail-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .gmail-item { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); text-decoration: none; min-width: 0; }
    .gmail-item-top { display: flex; justify-content: space-between; gap: 8px; }
    .gmail-from { font-size: var(--fs-sm); font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .gmail-time { font-size: var(--fs-xs); color: var(--text-sub); flex-shrink: 0; }
    .gmail-subject { font-size: var(--fs-sm); color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gmail-snippet { font-size: var(--fs-xs); color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gmail-disconnect { align-self: flex-end; font-size: var(--fs-xs); color: var(--text-sub); text-decoration: underline; padding: 6px 2px; }

    .score-ring { position: relative; flex-shrink: 0; }
    .score-ring svg { display: block; }
    .score-ring-bg { fill: none; stroke: var(--surface-2); stroke-width: 8; }
    .score-ring-fg { fill: none; stroke: var(--primary); stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.8s ease; }
    .score-ring span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--text-main); }

    .fortune-who { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; }
    .fortune-who strong { font-size: var(--fs-lg); color: var(--text-main); }
    .fortune-who span { font-size: var(--fs-xs); color: var(--text-sub); }
    .fortune-total { display: flex; align-items: center; gap: 16px; }
    .fortune-summary { font-size: var(--fs-md); font-weight: 700; color: var(--text-main); line-height: 1.5; }
    .fortune-error p, .fortune-error-text { color: var(--danger); font-size: var(--fs-sm); margin-bottom: 8px; }
    .fortune-scores { display: flex; flex-direction: column; gap: 10px; }
    .fortune-bar-row { display: grid; grid-template-columns: 104px 1fr 30px; align-items: center; gap: 8px; }
    .fortune-bar-label { font-size: var(--fs-sm); color: var(--text-main); white-space: nowrap; }
    .fortune-bar { height: 10px; border-radius: 5px; background: var(--surface-2); overflow: hidden; }
    .fortune-bar > div { height: 100%; background: var(--primary); border-radius: 5px; transition: width 0.8s ease; }
    .fortune-bar-score { font-size: var(--fs-sm); font-weight: 800; text-align: right; color: var(--text-main); }
    .fortune-detail p { font-size: var(--fs-base); line-height: 1.7; color: var(--text-main); }
    .lucky-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; margin-top: 10px; }
    .lucky-grid > div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); min-width: 0; }
    .lucky-grid span { font-size: var(--fs-xs); color: var(--text-sub); }
    .lucky-grid strong { font-size: var(--fs-sm); color: var(--text-main); overflow-wrap: anywhere; }
    .fortune-advice p { font-size: var(--fs-md); font-weight: 700; text-align: center; color: var(--text-main); line-height: 1.6; }
    .fortune-note { justify-content: center; text-align: center; }

    .setup-form { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
    .setup-form label, .setup-label { display: flex; flex-direction: column; gap: 6px; font-size: var(--fs-sm); font-weight: 700; color: var(--text-main); }
    .setup-label { flex-direction: row; align-items: center; gap: 6px; }
    .setup-form small { font-weight: 400; color: var(--text-sub); }
    .picker-row { display: flex; gap: 6px; }
    .picker-row select { flex: 1; min-width: 0; height: 44px; padding: 0 8px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-main); font-size: 16px; font-family: inherit; }
    .picker-row select:disabled { opacity: 0.5; }
    .setup-form input { height: 44px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-main); font-size: 16px; width: 100%; }
    .setup-key { display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px dashed var(--border); }
    .key-row { display: flex; gap: 6px; }
    .key-row input { flex: 1; min-width: 0; }
    .key-row input.masked { -webkit-text-security: disc; }
    .key-btn { width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--surface-2); color: var(--text-sub); border: 1px solid var(--border); }
    .key-paste { display: flex; align-items: center; justify-content: center; gap: 6px; height: 44px; border-radius: 12px; border: 1px dashed var(--primary); color: var(--primary); font-weight: 700; font-size: var(--fs-sm); }
    .seg { display: flex; padding: 3px; border-radius: 12px; background: var(--surface-2); }
    .seg button { flex: 1; height: 38px; border-radius: 10px; font-weight: 700; color: var(--text-sub); }
    .seg button.on { background: var(--card-bg); color: var(--primary); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
  `}</style>
)

export default TodayView
