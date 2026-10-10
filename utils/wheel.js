function layoutSectors(weights) {
  const sum = weights.reduce((total, weight) => total + weight, 0) || 1
  let cursor = -Math.PI / 2
  return weights.map((weight) => {
    const span = (weight / sum) * Math.PI * 2
    const start = cursor
    const center = start + span / 2
    cursor += span
    return { start, span, center }
  })
}

function stopAngle(center, span, turns, jitterUnit) {
  const unit = jitterUnit < 0 ? 0 : jitterUnit > 1 ? 1 : jitterUnit
  const jitter = (unit - 0.5) * span * 0.8
  return (-Math.PI / 2 - center) + Math.PI * 2 * turns + jitter
}

function forwardAngle(current, absolute) {
  const turn = Math.PI * 2
  let target = absolute
  while (target < current + turn * 4) target += turn
  return target
}

function clipText(text, maxChars) {
  const chars = Array.from(text)
  if (chars.length <= maxChars) return text
  return chars.slice(0, maxChars - 1).join('') + '…'
}

module.exports = {
  layoutSectors,
  stopAngle,
  forwardAngle,
  clipText,
}
