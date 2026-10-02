import { useBreakpoint } from "../lib/font-scale"

/** Below the md breakpoint, measured on the width scaled by the text size setting. */
export function useIsMobile() {
  return !useBreakpoint("md")
}
