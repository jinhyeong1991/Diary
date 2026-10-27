// new Date().toISOString()은 UTC 기준이라 한국(UTC+9)에서 오전 9시 이전엔 전날 날짜가 반환됨
// 반드시 로컬 날짜를 사용해야 함
export function localDateStr(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
