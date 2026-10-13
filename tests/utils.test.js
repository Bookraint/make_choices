const assert = require('node:assert/strict')
const { pickWeighted, toPercents, equalize, setShare } = require('../utils/random.js')
const { layoutSectors, stopAngle, forwardAngle } = require('../utils/wheel.js')

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10)

assert.deepEqual(toPercents([]), [])
assert.deepEqual(toPercents([0, 0]), [0, 0])
assert.deepEqual(toPercents([1, 1, 1]), [34, 33, 33])
assert.equal(toPercents([1, 999]).reduce((a, b) => a + b, 0), 100)
assert.equal(pickWeighted([1, 0, 9], 0), 0)
assert.equal(pickWeighted([1, 0, 9], 0.999999), 2)

const rows = equalize([{ id: 1, text: 'A', weight: 9 }, { id: 2, text: 'B', weight: 1 }])
close(rows[0].weight, 0.5)
const adjusted = setShare(rows, 0, 0.9)
close(adjusted[0].weight + adjusted[1].weight, 1)

const sectors = layoutSectors([1, 3])
close(sectors[0].span + sectors[1].span, Math.PI * 2)
const stopped = stopAngle(sectors[1].center, sectors[1].span, 5, 0.5)
close(sectors[1].center + stopped, -Math.PI / 2 + Math.PI * 10)
assert.ok(forwardAngle(Math.PI * 20, 0) >= Math.PI * 28)

console.log('utils tests passed')
