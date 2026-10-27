// 오늘의 운세: Google AI Studio(Gemini) API 를 브라우저에서 바로 호출
// 키는 사용자가 직접 입력해 본인 계정 데이터(user-storage)에만 저장됨
import type { FortuneProfile, FortuneResult } from '../store/useStore'

// -latest 별칭은 구글이 최신 Flash 모델로 자동 연결해 줌. 안 되면 고정 모델로 재시도
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash']

const ZODIAC = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양']

export function zodiacAnimal(birthDate: string): string {
  const y = Number(birthDate.slice(0, 4))
  return y ? `${ZODIAC[y % 12]}띠` : ''
}

export function starSign(birthDate: string): string {
  const m = Number(birthDate.slice(5, 7)), d = Number(birthDate.slice(8, 10))
  const signs: [number, number, string][] = [
    [1, 20, '염소자리'], [2, 19, '물병자리'], [3, 21, '물고기자리'], [4, 20, '양자리'], [5, 21, '황소자리'], [6, 22, '쌍둥이자리'],
    [7, 23, '게자리'], [8, 23, '사자자리'], [9, 23, '처녀자리'], [10, 23, '천칭자리'], [11, 23, '전갈자리'], [12, 22, '사수자리'],
  ]
  if (!m || !d) return ''
  const [, start, name] = signs[m - 1]
  return d >= start ? name : signs[(m + 10) % 12][2]
}

export function ageOf(birthDate: string, today = new Date()): number {
  const b = new Date(birthDate + 'T00:00:00')
  let age = today.getFullYear() - b.getFullYear()
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--
  return age
}

const item = { type: 'OBJECT', properties: { score: { type: 'INTEGER' }, text: { type: 'STRING' } }, required: ['score', 'text'] }
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    total: item, money: item, love: item, work: item, health: item, relationship: item,
    lucky: {
      type: 'OBJECT',
      properties: {
        color: { type: 'STRING' }, number: { type: 'STRING' }, direction: { type: 'STRING' },
        item: { type: 'STRING' }, time: { type: 'STRING' },
      },
      required: ['color', 'number', 'direction', 'item', 'time'],
    },
    advice: { type: 'STRING' },
  },
  required: ['summary', 'total', 'money', 'love', 'work', 'health', 'relationship', 'lucky', 'advice'],
}

function buildPrompt(p: FortuneProfile, date: string): string {
  const d = new Date(date + 'T00:00:00')
  const weekday = '일월화수목금토'[d.getDay()]
  return [
    '당신은 한국의 운세 앱에서 "오늘의 운세"를 써 주는 따뜻한 역술가입니다.',
    '아래 정보로 오늘 하루 운세를 사주·띠·별자리 느낌을 섞어 한국어로 써 주세요.',
    '',
    `- 이름: ${p.name}`,
    `- 성별: ${p.gender === 'male' ? '남성' : '여성'}`,
    `- 생년월일: ${p.birthDate} (${p.calendar === 'lunar' ? '음력' : '양력'}), 만 ${ageOf(p.birthDate)}세`,
    `- 태어난 시간: ${p.birthTime || '모름'}`,
    `- 띠: ${zodiacAnimal(p.birthDate)} (음력 설 이전 출생이면 전년도 띠로 보정), 별자리: ${starSign(p.birthDate)}`,
    `- 오늘: ${date} (${weekday}요일)`,
    '',
    '작성 규칙:',
    '- score 는 0~100 정수. 항목마다 점수가 고르게 다르게, 너무 낮은 점수(40 미만)는 드물게.',
    '- summary: 오늘을 한 문장으로 요약 (25자 안팎).',
    '- total(총운), money(금전운), love(연애운), work(직장·학업운), health(건강운), relationship(대인관계운)의 text 는 각각 2~3문장, 구체적인 행동 팁 포함.',
    '- 이름을 한두 번 자연스럽게 불러 주세요.',
    '- lucky: color(행운의 색), number(숫자 1~2개), direction(방위), item(물건), time(시간대 예: 오후 2~4시).',
    '- advice: 오늘의 한마디 (명언처럼 짧게).',
    '- 불안감을 주거나 의료·투자 판단을 단정하는 표현은 피하고, 재미로 보는 운세 톤을 유지하세요.',
  ].join('\n')
}

export async function fetchFortune(apiKey: string, profile: FortuneProfile, date: string): Promise<FortuneResult> {
  let lastError = ''
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(profile, date) }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.9 },
      }),
    })
    const body = await res.json().catch(() => null)
    if (res.ok) {
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('운세 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요.')
      return { ...JSON.parse(text), date }
    }
    lastError = body?.error?.message || `HTTP ${res.status}`
    if (res.status !== 404) break // 모델이 없을 때만 다음 모델로
  }
  throw new Error(friendlyError(lastError))
}

// 오늘의 운세 그림: Gemini 이미지 모델로 생성 → 휴대폰 저장 공간을 아끼려고 작은 JPEG 로 줄여서 돌려줌
const IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview']

function buildImagePrompt(r: FortuneResult, p: FortuneProfile): string {
  return [
    'Create a single cheerful retro 16-bit pixel art illustration for a daily fortune card.',
    `Theme of the day: "${r.summary}" (Korean). Mood: ${r.total.score >= 80 ? 'bright, lucky, celebratory' : r.total.score >= 60 ? 'warm, hopeful' : 'calm, gentle, encouraging'}.`,
    `Include the lucky color (${r.lucky.color}) as the main accent and the lucky item (${r.lucky.item}) somewhere in the scene.`,
    `A small friendly ${p.gender === 'male' ? 'boy' : 'girl'} pixel character and the ${zodiacEnglish(p.birthDate)} of the Korean zodiac as a cute companion.`,
    'Cozy magical fortune-teller atmosphere with stars and soft sparkles.',
    'Original characters only — do not depict any existing game, anime, or brand characters. No text, letters, or numbers in the image.',
  ].join(' ')
}

const ZODIAC_EN = ['monkey', 'rooster', 'dog', 'pig', 'rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'sheep']
function zodiacEnglish(birthDate: string): string {
  const y = Number(birthDate.slice(0, 4))
  return y ? ZODIAC_EN[y % 12] : 'cat'
}

function shrinkImage(dataUrl: string, maxSide = 640): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export async function fetchFortuneImage(apiKey: string, result: FortuneResult, profile: FortuneProfile): Promise<string> {
  let lastError = ''
  for (const model of IMAGE_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildImagePrompt(result, profile) }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    })
    const body = await res.json().catch(() => null)
    if (res.ok) {
      const parts: { inlineData?: { mimeType: string; data: string } }[] = body?.candidates?.[0]?.content?.parts ?? []
      const inline = parts.find(p => p.inlineData)?.inlineData
      if (!inline) throw new Error('그림이 만들어지지 않았어요. 다시 시도해 주세요.')
      return shrinkImage(`data:${inline.mimeType};base64,${inline.data}`)
    }
    lastError = body?.error?.message || `HTTP ${res.status}`
    if (res.status !== 404) break
  }
  if (/quota|RESOURCE_EXHAUSTED|billing|free tier|limit: 0/i.test(lastError)) {
    throw new Error('이 API 키로는 지금 그림을 만들 수 없어요. 무료 사용량을 다 썼거나, 그림 생성에 Google AI Studio 결제 설정이 필요할 수 있어요.')
  }
  throw new Error(friendlyError(lastError))
}

function friendlyError(m: string): string {
  if (/API key not valid|API_KEY_INVALID/i.test(m)) return 'API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.'
  if (/quota|RESOURCE_EXHAUSTED|rate/i.test(m)) return '오늘 사용할 수 있는 무료 호출량을 넘었습니다. 잠시 후 다시 시도해 주세요.'
  if (/location is not supported/i.test(m)) return '현재 지역에서는 이 API를 쓸 수 없습니다.'
  return `운세를 불러오지 못했습니다: ${m}`
}
