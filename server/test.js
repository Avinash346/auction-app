const { io } = require('socket.io-client')

const URL = 'http://localhost:4000'

let passed = 0
let failed = 0

function pass(name) {
  passed += 1
  console.log('PASS:', name)
}

function fail(name, err) {
  failed += 1
  console.log('FAIL:', name)
  if (err) console.log('  ', err.message || err)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve))
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  const socket1 = io(URL, { transports: ['websocket'] })
  const socket2 = io(URL, { transports: ['websocket'] })
  const socket3 = io(URL, { transports: ['websocket'] })

  let roomId = null
  let latestPlayers = []
  let lastScores = null
  let lastAuctionResult = null
  let timerEvents = []
  let lastBidUpdate = null

  const wireCommon = (socket, label) => {
    socket.on('error', (e) => {
      // Useful while debugging tests
      // console.log(label, 'error:', e)
    })
  }

  wireCommon(socket1, 'socket1')
  wireCommon(socket2, 'socket2')
  wireCommon(socket3, 'socket3')

  socket1.on('player_list', (p) => {
    latestPlayers = p.players
  })
  socket2.on('player_list', (p) => {
    latestPlayers = p.players
  })
  socket3.on('player_list', (p) => {
    latestPlayers = p.players
  })

  socket1.on('timer_update', (t) => timerEvents.push(t.timeLeft))
  socket2.on('timer_update', (t) => timerEvents.push(t.timeLeft))

  socket1.on('bid_update', (b) => {
    lastBidUpdate = b
  })
  socket2.on('bid_update', (b) => {
    lastBidUpdate = b
  })

  socket1.on('auction_result', (r) => {
    lastAuctionResult = r
  })
  socket2.on('auction_result', (r) => {
    lastAuctionResult = r
  })

  socket1.on('score_update', (s) => {
    lastScores = s.scores
  })
  socket2.on('score_update', (s) => {
    lastScores = s.scores
  })

  try {
    // 1. CREATE ROOM
    socket1.emit('create_room', { username: 'Alice' })
    const created = await once(socket1, 'room_created')
    assert(created.roomId && created.roomId.length === 6, 'roomId missing')
    roomId = created.roomId

    await wait(200)
    assert(Array.isArray(latestPlayers), 'player_list missing')
    assert(latestPlayers.length === 1, 'expected 1 player in room')
    pass('1. CREATE ROOM')
  } catch (e) {
    fail('1. CREATE ROOM', e)
  }

  try {
    // 2. JOIN ROOM
    socket2.emit('join_room', { roomId, username: 'Bob' })
    const joined = await once(socket2, 'joined_room')
    assert(joined.roomId === roomId, 'joined roomId mismatch')

    await wait(300)
    assert(latestPlayers.length === 2, 'expected 2 players after join')
    pass('2. JOIN ROOM')
  } catch (e) {
    fail('2. JOIN ROOM', e)
  }

  try {
    // 3. START AUCTION — VALIDATION
    socket3.emit('join_room', { roomId, username: 'Cara' })
    await once(socket3, 'joined_room')
    await wait(200)

    socket2.emit('start_auction', { roomId })
    const err = await once(socket2, 'error')
    assert(err.message === 'Only creator can start', 'expected Only creator can start')
    pass('3. START AUCTION — VALIDATION')
  } catch (e) {
    fail('3. START AUCTION — VALIDATION', e)
  }

  let auctionStarted = null
  try {
    // 4. START AUCTION — SUCCESS
    socket1.emit('start_auction', { roomId })
    auctionStarted = await once(socket1, 'auction_started')
    assert(auctionStarted.item && auctionStarted.item.name, 'missing item')
    assert(auctionStarted.highestBid === 2, 'expected highestBid = 2')

    const auctionStarted2 = await once(socket2, 'auction_started')
    assert(auctionStarted2.highestBid === 2, 'socket2 did not get auction_started')

    pass('4. START AUCTION — SUCCESS')
  } catch (e) {
    fail('4. START AUCTION — SUCCESS', e)
  }

  try {
    // 5. TIMER UPDATES
    timerEvents = []
    await wait(3100)
    assert(timerEvents.length >= 2, 'expected at least 2 timer updates')
    // ensure decreasing at least once
    let dec = false
    for (let i = 1; i < timerEvents.length; i++) {
      if (timerEvents[i] < timerEvents[i - 1]) dec = true
    }
    assert(dec, 'expected decreasing timeLeft')
    pass('5. TIMER UPDATES')
  } catch (e) {
    fail('5. TIMER UPDATES', e)
  }

  try {
    // 6. BID INCREMENT VALIDATION
    socket1.emit('increment_bid', { roomId })
    await wait(200)
    assert(lastBidUpdate && lastBidUpdate.highestBid === 4, 'expected bid 4')

    socket1.emit('increment_bid', { roomId })
    await wait(200)
    assert(lastBidUpdate && lastBidUpdate.highestBid === 6, 'expected bid 6')
    pass('6. BID INCREMENT VALIDATION')
  } catch (e) {
    fail('6. BID INCREMENT VALIDATION', e)
  }

  try {
    // 7. DYNAMIC INCREMENT TIERS
    // Bid until 20
    while (lastBidUpdate.highestBid < 20) {
      socket1.emit('increment_bid', { roomId })
      await wait(30)
    }
    assert(lastBidUpdate.highestBid === 20, 'expected to reach 20 exactly')

    socket1.emit('increment_bid', { roomId })
    await wait(100)
    assert(lastBidUpdate.highestBid === 23, 'expected next bid 23 (20+3)')

    while (lastBidUpdate.highestBid < 50) {
      socket1.emit('increment_bid', { roomId })
      await wait(30)
    }
    assert(lastBidUpdate.highestBid === 50, 'expected to reach 50 exactly')

    socket1.emit('increment_bid', { roomId })
    await wait(100)
    assert(lastBidUpdate.highestBid === 55, 'expected next bid 55 (50+5)')

    pass('7. DYNAMIC INCREMENT TIERS')
  } catch (e) {
    fail('7. DYNAMIC INCREMENT TIERS', e)
  }

  try {
    // 8. BID REACHES 100
    lastAuctionResult = null

    while (lastBidUpdate.highestBid < 100) {
      socket1.emit('increment_bid', { roomId })
      await wait(20)
      if (lastAuctionResult) break
    }

    // give server a moment to emit result
    await wait(250)

    assert(lastAuctionResult, 'expected auction_result')
    assert(lastAuctionResult.winningBid === 100, 'expected winningBid = 100')

    pass('8. BID REACHES 100')
  } catch (e) {
    fail('8. BID REACHES 100', e)
  }

  try {
    // 10. SCORE UPDATE (validate after result)
    await wait(200)
    assert(Array.isArray(lastScores) && lastScores.length >= 1, 'expected score_update')

    const winnerRow = lastScores.find((s) => s.username === lastAuctionResult.winner)
    assert(winnerRow, 'winner missing from scores')
    assert(winnerRow.totalWins >= 1, 'expected winner totalWins incremented')

    pass('10. SCORE UPDATE')
  } catch (e) {
    fail('10. SCORE UPDATE', e)
  }

  try {
    // 9. DISCONNECT HANDLING
    // Start next auction, make socket2 highest bidder, then disconnect it.
    socket1.emit('start_auction', { roomId })
    await once(socket1, 'auction_started')
    await wait(200)

    socket2.emit('increment_bid', { roomId })
    await wait(200)
    const bidBeforeDisconnect = lastBidUpdate && lastBidUpdate.highestBid
    assert(bidBeforeDisconnect >= 4, 'expected socket2 to place a bid')

    socket2.disconnect()
    await wait(300)

    assert(latestPlayers.length >= 1, 'expected player_list after disconnect')

    // Auction should continue (timer events should still happen)
    const before = timerEvents.length
    await wait(1200)
    assert(timerEvents.length > before, 'expected timer to continue after disconnect')

    pass('9. DISCONNECT HANDLING')
  } catch (e) {
    fail('9. DISCONNECT HANDLING', e)
  }

  socket1.disconnect()
  socket3.disconnect()

  console.log(`=== TEST SUMMARY: ${passed} passed, ${failed} failed ===`)
}

run().catch((e) => {
  console.error('Unexpected test runner error:', e)
  process.exit(1)
})
