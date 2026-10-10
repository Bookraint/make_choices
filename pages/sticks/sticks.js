const { randomUnit, pickWeighted } = require('../../utils/random.js')
const { sizeClass } = require('../../utils/palette.js')
const session = require('../../utils/session.js')

Page({
  data: {
    sticks: [],
    shaking: false,
    phase: 'ready',
    busy: false,
    buttonText: '摇一摇',
    resultText: '',
    resultClass: 'xl',
  },

  onLoad() {
    this._alive = true
    this._locking = false
    this._token = 0
    this.timer = null
    const current = session.read()
    if (!current || !current.options || current.options.length < 2) {
      this.bad = true
      wx.showToast({ title: '先写下选项', icon: 'none' })
      setTimeout(() => {
        if (this._alive) wx.navigateBack()
      }, 500)
      return
    }
    this.options = current.options
    this.setData({ sticks: this.viewSticks(-1) })
  },

  onUnload() {
    this._alive = false
    this._locking = false
    this.clearSpin()
  },

  clearSpin() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this._token += 1
  },

  viewSticks(upIndex) {
    return this.options.map((item, index) => ({
      slot: index,
      color: item.color,
      length: 300 + ((index * 37) % 120),
      up: index === upIndex,
    }))
  },

  onShake() {
    if (this._locking || this.bad) return
    this._locking = true
    this.clearSpin()
    const token = this._token
    this.setData({
      shaking: true,
      phase: 'spinning',
      busy: true,
      buttonText: '正在摇',
      resultText: '',
      sticks: this.viewSticks(-1),
    })
    randomUnit().then((unit) => {
      if (!this._alive || token !== this._token) return
      const index = pickWeighted(this.options.map((item) => item.weight), unit)
      const winner = this.options[index]
      this.timer = setTimeout(() => {
        if (!this._alive || token !== this._token) return
        this.setData({
          shaking: false,
          sticks: this.viewSticks(index),
        })
        this.timer = setTimeout(() => {
          if (!this._alive || token !== this._token) return
          this.timer = null
          this._locking = false
          this.setData({
            shaking: false,
            phase: 'settled',
            busy: false,
            buttonText: '再摇一次',
            resultText: winner.text,
            resultClass: sizeClass(winner.text),
          })
        }, 520)
      }, 1100)
    }).catch(() => {
      if (!this._alive || token !== this._token) return
      this._locking = false
      this.setData({
        shaking: false,
        phase: 'ready',
        busy: false,
        buttonText: '摇一摇',
      })
      wx.showToast({ title: '没能摇出来', icon: 'none' })
    })
  },
})
