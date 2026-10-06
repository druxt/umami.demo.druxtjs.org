// cspell:ignore ABCDEFGHJKLMNPQRSTUVWXYZ
/** Room codes: four characters, with nothing that reads as another. */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** A four-character room code, free in `taken`. */
function roomCode(taken, rand = Math.random) {
  for (let i = 0; i < 1000; i++) {
    let code = ''
    for (let j = 0; j < 4; j++)
      code += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]
    if (!taken.has(code)) return code
  }
  throw new Error('No free room code')
}

module.exports = { roomCode, CODE_CHARS }
