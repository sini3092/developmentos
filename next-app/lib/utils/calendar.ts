export function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseMonthParam(value?: string) {
  const now = new Date()
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  const [year, month] = value.split("-").map(Number)
  if (month < 1 || month > 12) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  return { year, month }
}

export function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

export function getMonthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export type CalendarDayCell = {
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
}

export function buildMonthGrid(year: number, month: number): CalendarDayCell[][] {
  const firstOfMonth = new Date(year, month - 1, 1)
  const lastOfMonth = new Date(year, month, 0)
  const todayKey = formatDateKey(new Date())

  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const totalDays = lastOfMonth.getDate()
  const cells: CalendarDayCell[] = []

  for (let i = 0; i < startOffset; i += 1) {
    const date = new Date(year, month - 1, -startOffset + i + 1)
    const key = formatDateKey(date)
    cells.push({ key, day: date.getDate(), inMonth: false, isToday: key === todayKey })
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    cells.push({ key, day, inMonth: true, isToday: key === todayKey })
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const date = new Date(
      Number(last.key.slice(0, 4)),
      Number(last.key.slice(5, 7)) - 1,
      Number(last.key.slice(8, 10)) + 1
    )
    const key = formatDateKey(date)
    cells.push({ key, day: date.getDate(), inMonth: false, isToday: key === todayKey })
  }

  const weeks: CalendarDayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return weeks
}

export function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = new Date(year, month, 0)
  const end = formatDateKey(endDate)
  return { start, end }
}
