const { toPercents, equalize, refit, setShare } = require('../../utils/random.js')
const { PALETTE } = require('../../utils/palette.js')
const session = require('../../utils/session.js')

const BUTTONS = {
  wheel: '开始转盘',
  cards: '开始翻牌',
  sticks: '开始抽签',
}

function activeIds(rows) {
  return rows.filter((row) => row.text.trim()).map((row) => row.id)
}

function present(rows, method) {
  const weights = rows.map((row) => (row.text.trim() ? row.weight : 0))
  const percents = toPercents(weights)
  const activeCount = weights.filter((weight) => weight > 0).length
  let colorIndex = 0
  const viewRows = rows.map((row, index) => {
    const filled = !!row.text.trim()
    const color = filled ? PALETTE[colorIndex % PALETTE.length] : ''
    if (filled) colorIndex += 1
    return {
      id: row.id,
      text: row.text,
      weight: row.weight,
      showWeight: method !== 'cards' && filled && activeCount >= 2,
      percent: percents[index],
      color,
    }
  })
  const validCount = activeCount
  return {
    rows: viewRows,
    validCount,
    canAdd: rows.length < 30,
    showDelete: rows.length > 2,
    buttonDisabled: validCount < 2,
    buttonText: BUTTONS[method] || BUTTONS.wheel,
    hint: validCount < 2
      ? '至少写下两个选项'
      : method === 'cards'
        ? '翻牌为等概率'
        : '拖动圆点，偏向会自动换成占比',
  }
}

Page({
  data: {
    rows: [
      { id: 1, text: '', weight: 1, showWeight: false, percent: 0, color: '' },
      { id: 2, text: '', weight: 1, showWeight: false, percent: 0, color: '' },
    ],
    nextId: 3,
    method: 'wheel',
    validCount: 0,
    canAdd: true,
    showDelete: false,
    buttonDisabled: true,
    buttonText: '开始转盘',
    hint: '至少写下两个选项',
  },

  onLoad() {
    this._rows = this.data.rows.map((row) => ({
      id: row.id,
      text: row.text,
      weight: row.weight,
    }))
  },

  onInput(e) {
    const id = Number(e.currentTarget.dataset.id)
    const text = e.detail.value
    const previous = activeIds(this._rows)
    let rows = this._rows.map((row) => ({
      id: row.id,
      text: row.id === id ? text : row.text,
      weight: row.weight,
    }))
    const next = activeIds(rows)
    const changed = previous.join(',') !== next.join(',')
    if (changed) rows = refit(rows, previous)
    this._rows = rows
    const view = present(rows, this.data.method)
    if (
      !changed &&
      view.buttonDisabled === this.data.buttonDisabled &&
      view.hint === this.data.hint
    ) {
      return
    }
    if (!changed) {
      this.setData({
        validCount: view.validCount,
        canAdd: view.canAdd,
        showDelete: view.showDelete,
        buttonDisabled: view.buttonDisabled,
        buttonText: view.buttonText,
        hint: view.hint,
      })
      return
    }
    this.setData(view)
  },

  onAdd() {
    if (this._rows.length >= 30) return
    const id = this.data.nextId
    const rows = this._rows.concat([{ id, text: '', weight: 1 }]).map((row) => ({
      id: row.id,
      text: row.text,
      weight: row.weight,
    }))
    this._rows = rows
    this.setData(Object.assign({ nextId: id + 1 }, present(rows, this.data.method)))
  },

  onRemove(e) {
    if (this._rows.length <= 2) return
    const id = Number(e.currentTarget.dataset.id)
    const previous = activeIds(this._rows)
    const removed = this._rows.find((row) => row.id === id)
    let rows = this._rows.filter((row) => row.id !== id).map((row) => ({
      id: row.id,
      text: row.text,
      weight: row.weight,
    }))
    if (removed && removed.text.trim()) rows = refit(rows, previous)
    this._rows = rows
    this.setData(present(rows, this.data.method))
  },

  onEven() {
    const rows = equalize(this._rows.map((row) => ({
      id: row.id,
      text: row.text,
      weight: row.weight,
    })))
    this._rows = rows
    this.setData(present(rows, this.data.method))
  },

  onMethod(e) {
    const method = e.currentTarget.dataset.method
    if (!BUTTONS[method] || method === this.data.method) return
    this.setData(Object.assign({ method }, present(this._rows, method)))
  },

  onWeightStart(e) {
    const index = Number(e.currentTarget.dataset.index)
    const row = this._rows[index]
    if (!row || !row.text.trim()) return
    wx.hideKeyboard()
    this.createSelectorQuery().select('#track-' + row.id).boundingClientRect((rect) => {
      if (!rect || !rect.width) return
      this._track = { index, left: rect.left, width: rect.width }
      this.applyWeight(e.touches[0].clientX)
    }).exec()
  },

  onWeightMove(e) {
    if (!this._track) return
    this.applyWeight(e.touches[0].clientX)
  },

  onWeightEnd() {
    this._track = null
  },

  applyWeight(clientX) {
    const track = this._track
    if (!track || !track.width) return
    let ratio = (clientX - track.left) / track.width
    if (ratio < 0) ratio = 0
    if (ratio > 1) ratio = 1
    const rows = setShare(this._rows.map((row) => ({
      id: row.id,
      text: row.text,
      weight: row.weight,
    })), track.index, ratio)
    this._rows = rows
    this.setData(present(rows, this.data.method))
  },

  onStart() {
    const source = this._rows.map((row) => ({
      id: row.id,
      text: row.text,
      weight: row.weight || 1,
    }))
    const view = present(source, this.data.method)
    const packed = view.rows.filter((row) => row.text.trim())
    if (packed.length < 2) {
      wx.showToast({ title: '至少两个选项', icon: 'none' })
      return
    }
    const sum = packed.reduce((total, row) => total + row.weight, 0) || 1
    session.save({
      method: this.data.method,
      options: packed.map((row) => ({
        id: row.id,
        text: row.text.trim(),
        weight: row.weight / sum,
        color: row.color,
      })),
    })
    wx.navigateTo({ url: '/pages/' + this.data.method + '/' + this.data.method })
  },
})
