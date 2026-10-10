const { randomUnit, pickWeighted } = require('../../utils/random.js')
const { layoutSectors, stopAngle, forwardAngle, clipText } = require('../../utils/wheel.js')
const { sizeClass } = require('../../utils/palette.js')
const session = require('../../utils/session.js')

Page({
  data: {
    phase: 'ready',
    busy: true,
    buttonText: '正在抽',
    resultText: '',
    resultClass: 'xl',
  },

  onLoad() {
    this._alive = true
    this._locking = false
    this._token = 0
    this._angle = 0
    this.timer = null
    const current = session.read()
    if (!current || !current.options || current.options.length < 2) {
      this.bad = true
      this.setData({ busy: false, buttonText: '重新抽' })
      wx.showToast({ title: '先写下选项', icon: 'none' })
      setTimeout(() => {
        if (this._alive) wx.navigateBack()
      }, 500)
      return
    }
    this.options = current.options
    this.sectors = layoutSectors(current.options.map((item) => item.weight))
  },

  onReady() {
    if (!this.bad) this.initCanvas()
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

  initCanvas() {
    this.createSelectorQuery().select('#wheel').fields({ node: true, size: true }).exec((res) => {
      if (!this._alive) return
      const info = res && res[0]
      if (!info || !info.node) {
        this.setData({ busy: false, phase: 'ready', buttonText: '重新抽' })
        wx.showToast({ title: '转盘没能打开', icon: 'none' })
        return
      }
      const canvas = info.node
      const ctx = canvas.getContext('2d')
      let dpr = 2
      try {
        dpr = wx.getWindowInfo().pixelRatio || 2
      } catch (err) {
        dpr = 2
      }
      const size = info.width
      canvas.width = size * dpr
      canvas.height = size * dpr
      ctx.scale(dpr, dpr)
      this.canvas = canvas
      this.ctx = ctx
      this.cssSize = size
      this.renderWheel(0)
      this.startDraw()
    })
  },

  renderWheel(rotation) {
    const ctx = this.ctx
    const size = this.cssSize
    if (!ctx || !size) return
    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 6
    ctx.clearRect(0, 0, size, size)
    this.sectors.forEach((sector, index) => {
      const start = sector.start + rotation
      const end = start + sector.span
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = this.options[index].color
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#f6f0e6'
      ctx.stroke()
      if (sector.span < 0.12) return
      const mid = start + sector.span / 2
      let maxChars = 6
      let font = 15
      let dist = radius * 0.62
      if (sector.span < 0.28) {
        maxChars = 2
        font = 11
        dist = radius * 0.74
      } else if (sector.span < 0.55) {
        maxChars = 4
        font = 12
        dist = radius * 0.68
      }
      ctx.save()
      ctx.translate(cx + Math.cos(mid) * dist, cy + Math.sin(mid) * dist)
      ctx.fillStyle = '#fffaf3'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '600 ' + font + 'px sans-serif'
      ctx.fillText(clipText(this.options[index].text, maxChars), 0, 0)
      ctx.restore()
    })
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.16, 0, Math.PI * 2)
    ctx.fillStyle = '#fffaf3'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.045, 0, Math.PI * 2)
    ctx.fillStyle = '#d85a3a'
    ctx.fill()
  },

  startDraw() {
    if (this._locking || !this.ctx) return
    this._locking = true
    this.clearSpin()
    const token = this._token
    this.setData({
      busy: true,
      phase: 'spinning',
      buttonText: '正在抽',
      resultText: '',
    })
    randomUnit().then((unit) => {
      if (!this._alive || token !== this._token) return
      const index = pickWeighted(this.options.map((item) => item.weight), unit)
      const sector = this.sectors[index]
      this.winner = this.options[index]
      const absolute = stopAngle(sector.center, sector.span, 5, Math.random())
      this.animate(forwardAngle(this._angle || 0, absolute), token)
    }).catch(() => {
      if (!this._alive || token !== this._token) return
      this._locking = false
      this.setData({ busy: false, phase: 'ready', buttonText: '重新抽' })
      wx.showToast({ title: '没能完成抽取', icon: 'none' })
    })
  },

  animate(target, token) {
    const start = this._angle || 0
    const duration = 2600
    const began = Date.now()
    const step = () => {
      if (!this._alive || token !== this._token) return
      const progress = Math.min(1, (Date.now() - began) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const angle = start + (target - start) * eased
      this._angle = angle
      this.renderWheel(angle)
      if (progress < 1) {
        this.timer = setTimeout(step, 16)
        return
      }
      this._angle = target
      this.renderWheel(target)
      this.timer = null
      this._locking = false
      this.setData({
        busy: false,
        phase: 'settled',
        buttonText: '重新抽',
        resultText: this.winner.text,
        resultClass: sizeClass(this.winner.text),
      })
    }
    step()
  },

  onAgain() {
    this.startDraw()
  },
})
