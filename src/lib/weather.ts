// 날씨·미세먼지: Open-Meteo (무료, API 키 없음)
export interface WeatherData {
  place: string
  temp: number
  feelsLike: number
  code: number
  isDay: boolean
  max: number
  min: number
  rainChance: number
  hourly: { hour: number; temp: number; code: number; rainChance: number }[]
  pm10: number | null
  pm25: number | null
}

const SEOUL = { lat: 37.5665, lon: 126.978 }

// 위치 권한이 없거나 오래 걸리면 서울로
function getPosition(): Promise<{ lat: number; lon: number; place: string }> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({ ...SEOUL, place: '서울' })
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, place: '현재 위치' }),
      () => resolve({ ...SEOUL, place: '서울' }),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 }
    )
  })
}

export async function fetchWeather(): Promise<WeatherData> {
  const { lat, lon, place } = await getPosition()
  const q = `latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&timezone=auto`
  const [w, a] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,apparent_temperature,weather_code,is_day&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=2`).then(r => r.json()),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=pm10,pm2_5`).then(r => r.json()).catch(() => null),
  ])
  if (!w?.current) throw new Error('날씨 정보를 불러오지 못했습니다.')

  // 지금 시각부터 3시간 간격으로 6칸
  const nowIdx = Math.max(0, (w.hourly.time as string[]).findIndex(t => t >= w.current.time.slice(0, 13)))
  const hourly = [0, 3, 6, 9, 12, 15].map(off => {
    const i = nowIdx + off
    return {
      hour: Number((w.hourly.time[i] as string).slice(11, 13)),
      temp: Math.round(w.hourly.temperature_2m[i]),
      code: w.hourly.weather_code[i],
      rainChance: w.hourly.precipitation_probability[i] ?? 0,
    }
  })

  return {
    place,
    temp: Math.round(w.current.temperature_2m),
    feelsLike: Math.round(w.current.apparent_temperature),
    code: w.current.weather_code,
    isDay: w.current.is_day === 1,
    max: Math.round(w.daily.temperature_2m_max[0]),
    min: Math.round(w.daily.temperature_2m_min[0]),
    rainChance: w.daily.precipitation_probability_max[0] ?? 0,
    hourly,
    pm10: a?.current?.pm10 ?? null,
    pm25: a?.current?.pm2_5 ?? null,
  }
}

// WMO 날씨 코드 → 한국어 + 이모지
export function describeWeather(code: number, isDay = true): { label: string; icon: string } {
  if (code === 0) return { label: '맑음', icon: isDay ? '☀️' : '🌙' }
  if (code <= 2) return { label: '구름 조금', icon: isDay ? '🌤️' : '☁️' }
  if (code === 3) return { label: '흐림', icon: '☁️' }
  if (code === 45 || code === 48) return { label: '안개', icon: '🌫️' }
  if (code >= 51 && code <= 57) return { label: '이슬비', icon: '🌦️' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: '비', icon: '🌧️' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: '눈', icon: '🌨️' }
  if (code >= 95) return { label: '뇌우', icon: '⛈️' }
  return { label: '흐림', icon: '☁️' }
}

// 환경부 기준 미세먼지 등급
export function dustGrade(value: number | null, kind: 'pm10' | 'pm25'): { label: string; level: 0 | 1 | 2 | 3 } | null {
  if (value == null) return null
  const [a, b, c] = kind === 'pm10' ? [30, 80, 150] : [15, 35, 75]
  if (value <= a) return { label: '좋음', level: 0 }
  if (value <= b) return { label: '보통', level: 1 }
  if (value <= c) return { label: '나쁨', level: 2 }
  return { label: '매우 나쁨', level: 3 }
}

// 오늘 날씨에 맞는 한 줄 조언
export function weatherTip(d: WeatherData): string {
  if (d.rainChance >= 60) return '☂️ 비 소식이 있어요. 우산 챙기세요!'
  const pm = dustGrade(d.pm25, 'pm25')
  if (pm && pm.level >= 2) return '😷 초미세먼지가 나빠요. 마스크를 챙기세요.'
  if (d.max - d.min >= 10) return '🧥 일교차가 커요. 겉옷을 챙기세요.'
  if (d.max >= 30) return '🥤 많이 더워요. 물을 자주 드세요.'
  if (d.min <= -5) return '🧣 많이 추워요. 따뜻하게 입으세요.'
  return '👍 무난한 날씨예요. 좋은 하루 보내세요!'
}
