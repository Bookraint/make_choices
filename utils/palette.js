const PALETTE = [
  '#d85a3a',
  '#e0a106',
  '#2f6f5e',
  '#3d5a80',
  '#c47b5a',
  '#6b4c7a',
  '#3f7d8c',
  '#c46b7a',
  '#8a6a3b',
  '#4e7a55',
]

function sizeClass(text) {
  const length = Array.from(text).length
  if (length <= 6) return 'xl'
  if (length <= 14) return 'lg'
  return 'md'
}

module.exports = {
  PALETTE,
  sizeClass,
}
