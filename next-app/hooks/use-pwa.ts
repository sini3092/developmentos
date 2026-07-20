import * as React from "react"

export function useIsPwa() {
  const [isPwa, setIsPwa] = React.useState(false)

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    setIsPwa(standalone)
  }, [])

  return isPwa
}
