const { shuffle } = require('../../utils/random.js')
const { sizeClass } = require('../../utils/palette.js')
const session = require('../../utils/session.js')

Page({
  data: {
    cards: [],
    cols: 2,
    phase: 'ready',
    hint: '点一张翻开',
    resultText: '',
    resultClass: 'xl',
    intoView: '',
  },

  onLoad() {
    this._alive = true
    this._dealToken = 0
    const current = session.read()
    if (!current || !current.options || current.options.length < 2) {
      this.bad = true
      wx.showToast({ title: '先写下选项', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 500)
      return
    }
    this.options = current.options
    this.setData({ cols: current.options.length <= 4 ? 2 : 3 })
    this.deal()
  },

  onUnload() {
    this._alive = false
    this._dealToken += 1
  },

  deal() {
    this.setData({
      phase: 'dealing',
      hint: '正在洗牌',
      resultText: '',
      intoView: '',
      cards: [],
    })
    const token = ++this._dealToken
    shuffle(this.options).then((deck) => {
      if (!this._alive || token !== this._dealToken) return
      this.deck = deck
      this.setData({
        phase: 'ready',
        hint: '点一张翻开',
        cards: deck.map((item, index) => ({
          slot: index,
          text: item.text,
          flipped: false,
          dim: false,
        })),
      })
    })
  },

  onPick(e) {
    if (this.bad || this.data.phase !== 'ready') return
    const index = Number(e.currentTarget.dataset.index)
    const picked = this.deck[index]
    if (!picked) return
    this.setData({
      phase: 'settled',
      hint: '',
      intoView: 'card-' + index,
      resultText: picked.text,
      resultClass: sizeClass(picked.text),
      cards: this.deck.map((item, i) => ({
        slot: i,
        text: item.text,
        flipped: i === index,
        dim: i !== index,
      })),
    })
  },

  onAgain() {
    this.deal()
  },
})
