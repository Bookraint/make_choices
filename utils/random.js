function randomUnit() {
  return new Promise((resolve) => {
    if (typeof wx.getRandomValues !== 'function') {
      resolve(Math.random())
      return
    }
    wx.getRandomValues({
      length: 4,
      success(res) {
        try {
          const view = new Uint32Array(res.randomValues)
          resolve(view[0] / 4294967296)
        } catch (err) {
          resolve(Math.random())
        }
      },
      fail() {
        resolve(Math.random())
      },
    })
  })
}

function shuffle(list) {
  const items = list.slice()
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = items[i]
    items[i] = items[j]
    items[j] = swap
  }
  return items
}

function pickWeighted(weights, random01) {
  const sum = weights.reduce((total, weight) => total + weight, 0)
  if (sum <= 0) return 0
  let cursor = random01 * sum
  for (let i = 0; i < weights.length; i++) {
    cursor -= weights[i]
    if (cursor < 0) return i
  }
  for (let i = weights.length - 1; i >= 0; i--) {
    if (weights[i] > 0) return i
  }
  return 0
}

function toPercents(weights) {
  const sum = weights.reduce((total, weight) => total + weight, 0)
  if (sum <= 0) return weights.map(() => 0)
  const exact = weights.map((weight) => (weight / sum) * 100)
  const floors = exact.map((value) => Math.floor(value + 1e-9))
  let remain = 100 - floors.reduce((total, value) => total + value, 0)
  const order = exact.map((value, index) => ({
    index,
    frac: value - Math.floor(value + 1e-9),
  }))
  order.sort((a, b) => b.frac - a.frac || a.index - b.index)
  for (let i = 0; i < remain; i++) floors[order[i].index] += 1
  return floors
}

function cleanRow(row, weight) {
  return { id: row.id, text: row.text, weight }
}

function equalize(rows) {
  const active = rows.filter((row) => row.text.trim())
  const share = active.length ? 1 / active.length : 1
  return rows.map((row) => cleanRow(row, row.text.trim() ? share : 1))
}

function refit(rows, previousIds) {
  const active = rows.filter((row) => row.text.trim())
  if (!active.length) {
    return rows.map((row) => cleanRow(row, row.weight || 1))
  }
  const old = active.filter((row) => previousIds.indexOf(row.id) >= 0)
  const fresh = active.filter((row) => previousIds.indexOf(row.id) < 0)
  const oldSum = old.reduce((total, row) => total + (row.weight > 0 ? row.weight : 0), 0)
  if (!old.length || oldSum <= 0) return equalize(rows)
  const oldPortion = old.length / active.length
  const freshShare = fresh.length ? (1 - oldPortion) / fresh.length : 0
  return rows.map((row) => {
    if (!row.text.trim()) return cleanRow(row, row.weight || 1)
    if (previousIds.indexOf(row.id) >= 0) {
      return cleanRow(row, (row.weight / oldSum) * oldPortion)
    }
    return cleanRow(row, freshShare)
  })
}

function setShare(rows, index, target) {
  const indexes = []
  rows.forEach((row, i) => {
    if (row.text.trim()) indexes.push(i)
  })
  if (indexes.length < 2 || indexes.indexOf(index) < 0) return rows.map((row) => cleanRow(row, row.weight))
  const min = 1 / (indexes.length * 12)
  const max = 1 - min * (indexes.length - 1)
  let share = target
  if (share < min) share = min
  if (share > max) share = max
  let otherSum = 0
  indexes.forEach((i) => {
    if (i !== index) otherSum += rows[i].weight
  })
  if (otherSum <= 0) otherSum = indexes.length - 1
  const remain = 1 - share
  return rows.map((row, i) => {
    if (indexes.indexOf(i) < 0) return cleanRow(row, row.weight || 1)
    if (i === index) return cleanRow(row, share)
    return cleanRow(row, (row.weight / otherSum) * remain)
  })
}

module.exports = {
  randomUnit,
  shuffle,
  pickWeighted,
  toPercents,
  equalize,
  refit,
  setShare,
}
