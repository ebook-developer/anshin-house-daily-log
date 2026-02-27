import { parse, differenceInMinutes} from "date-fns"

/**
 * 2つの時刻文字列 (HH:mm) から所要時間（分）を計算する
 * タイムゾーンの影響を受けない堅牢な計算を行います。
 */
export function calculateDurationMinutes(startTime: string | null, endTime: string | null): number | null {
  if (!startTime || !endTime) return null

  try {
    // 基準日を固定してパース (HH:mm 形式を想定)
    const start = parse(startTime, "HH:mm:ss", new Date(0))
    const end = parse(endTime, "HH:mm:ss", new Date(0))

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      // 秒なし形式 (HH:mm) の場合をフォールバック
      const startAlt = parse(startTime, "HH:mm", new Date(0))
      const endAlt = parse(endTime, "HH:mm", new Date(0))
      if (isNaN(startAlt.getTime()) || isNaN(endAlt.getTime())) return null
      
      const diff = differenceInMinutes(endAlt, startAlt)
      return diff >= 0 ? diff : null
    }

    const diff = differenceInMinutes(end, start)
    return diff >= 0 ? diff : null
  } catch (error) {
    console.error("Duration calculation error:", error)
    return null
  }
}

/**
 * 時刻文字列を安全に整形する (HH:mm:ss -> HH:mm)
 */
export function formatTimeSafe(timeString: string | null): string | null {
  if (!timeString) return null
  return timeString.slice(0, 5)
}