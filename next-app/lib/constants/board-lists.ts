export const BOARD_LIST_COLORS = [
  "slate",
  "blue",
  "green",
  "yellow",
  "red",
  "purple",
] as const

export type BoardListColor = (typeof BOARD_LIST_COLORS)[number]

export const BOARD_LIST_COLOR_BAR: Record<BoardListColor, string> = {
  slate: "bg-muted-foreground/50",
  blue: "bg-info",
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
  purple: "bg-primary",
}

export const BOARD_LIST_COLOR_BORDER: Record<BoardListColor, string> = {
  slate: "border-t-muted-foreground/40",
  blue: "border-t-info",
  green: "border-t-success",
  yellow: "border-t-warning",
  red: "border-t-danger",
  purple: "border-t-primary",
}

export function getBoardListColorClasses(color: string) {
  if (color in BOARD_LIST_COLOR_BAR) {
    return {
      bar: BOARD_LIST_COLOR_BAR[color as BoardListColor],
      border: BOARD_LIST_COLOR_BORDER[color as BoardListColor],
    }
  }

  return {
    bar: BOARD_LIST_COLOR_BAR.slate,
    border: BOARD_LIST_COLOR_BORDER.slate,
  }
}
