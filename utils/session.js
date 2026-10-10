let current = null

function save(payload) {
  current = payload
}

function read() {
  return current
}

module.exports = {
  save,
  read,
}
