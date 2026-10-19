export type Box = {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Pixel shift that slides `box` inside `frame`.
 * Positive x and y match MapLibre `panBy`: the map content moves the other way,
 * which pulls a popup that hangs past the map back inside it.
 */
export function panToKeepBoxInside(box: Box, frame: Box, pad = 8): { x: number; y: number } {
  let x = 0
  let y = 0
  const minLeft = frame.left + pad
  const maxRight = frame.right - pad
  const minTop = frame.top + pad
  const maxBottom = frame.bottom - pad

  if (box.right - box.left > maxRight - minLeft) {
    x = box.left - minLeft
  } else if (box.left < minLeft) {
    x = box.left - minLeft
  } else if (box.right > maxRight) {
    x = box.right - maxRight
  }

  if (box.bottom - box.top > maxBottom - minTop) {
    y = box.top - minTop
  } else if (box.top < minTop) {
    y = box.top - minTop
  } else if (box.bottom > maxBottom) {
    y = box.bottom - maxBottom
  }

  return { x, y }
}

/** Scrollable card height so the popup still fits inside the map. */
export function popupCardMaxHeight(mapHeight: number, chrome = 48): number {
  return Math.max(96, Math.floor(mapHeight - chrome))
}
