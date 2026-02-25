const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')

const items = require('./items')

const app = express()
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://auction-app-rosy.vercel.app'],
    methods: ['GET', 'POST']
  }
})

const rooms = {}

function getPlayerList(room) {
  return Object.entries(room.players).map(([id, p]) => ({
    id,
    username: p.username,
    totalWins: p.totalWins
  }))
}

function getIncrement(bid) {
  if (bid <= 20) return 2
  if (bid <= 50) return 3
  return 5
}

function getNextBid(bid) {
  return bid + getIncrement(bid)
}

function endAuction(roomId, ioInstance) {
  const room = rooms[roomId]
  if (!room) return

  if (!room.auctionActive) return

  clearInterval(room.timerRef)
  room.timerRef = null
  room.auctionActive = false

  const winnerId = room.highestBidder
  const winnerName = room.highestBidderName || 'No winner'

  if (winnerId && room.players[winnerId]) {
    room.players[winnerId].totalWins += 1
  }

  ioInstance.to(roomId).emit('auction_result', {
    winner: winnerName,
    winningBid: room.highestBid,
    item: room.currentItem
  })

  const scores = Object.values(room.players)
    .map((p) => ({ username: p.username, totalWins: p.totalWins }))
    .sort((a, b) => b.totalWins - a.totalWins)

  ioInstance.to(roomId).emit('score_update', { scores })

  room.currentItemIndex = (room.currentItemIndex + 1) % items.length
}

function makeRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ username }) => {
    const roomId = makeRoomId()

    rooms[roomId] = {
      creator: socket.id,
      players: {
        [socket.id]: { username, totalWins: 0 }
      },
      currentItemIndex: 0,
      currentItem: null,
      highestBid: 2,
      highestBidder: null,
      highestBidderName: null,
      auctionActive: false,
      timerRef: null,
      endTime: null
    }

    socket.join(roomId)
    socket.emit('room_created', { roomId })

    const room = rooms[roomId]
    io.to(roomId).emit('player_list', {
      players: getPlayerList(room),
      creator: room.creator
    })
  })

  socket.on('join_room', ({ roomId, username }) => {
    const room = rooms[roomId]
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }

    room.players[socket.id] = { username, totalWins: 0 }
    socket.join(roomId)
    socket.emit('joined_room', { roomId })

    io.to(roomId).emit('player_list', {
      players: getPlayerList(room),
      creator: room.creator
    })
  })

  socket.on('start_auction', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }

    if (socket.id !== room.creator) {
      socket.emit('error', { message: 'Only creator can start' })
      return
    }

    const playerCount = Object.keys(room.players).length
    if (playerCount < 2) {
      socket.emit('error', { message: 'Need at least 2 players' })
      return
    }

    if (room.auctionActive) {
      socket.emit('error', { message: 'Auction already running' })
      return
    }

    room.auctionActive = true
    room.currentItem = items[room.currentItemIndex]
    room.highestBid = room.currentItem.basePrice
    room.highestBidder = null
    room.highestBidderName = null
    room.endTime = Date.now() + 60000

    io.to(roomId).emit('auction_started', {
      item: room.currentItem,
      highestBid: room.highestBid,
      endTime: room.endTime
    })

    clearInterval(room.timerRef)
    room.timerRef = setInterval(() => {
      const activeRoom = rooms[roomId]
      if (!activeRoom || !activeRoom.auctionActive) return

      const timeLeft = Math.ceil((room.endTime - Date.now()) / 1000)
      const safeTimeLeft = Math.max(0, timeLeft)
      io.to(roomId).emit('timer_update', { timeLeft: safeTimeLeft })
      if (safeTimeLeft <= 0) endAuction(roomId, io)
    }, 1000)
  })

  socket.on('increment_bid', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room || !room.auctionActive) {
      socket.emit('error', { message: 'No active auction' })
      return
    }

    if (Date.now() >= room.endTime) {
      socket.emit('error', { message: 'Auction ended' })
      return
    }

    const nextBid = getNextBid(room.highestBid)
    if (nextBid > 100) {
      socket.emit('error', { message: 'Exceeds max bid' })
      return
    }

    if (!room.players[socket.id]) {
      socket.emit('error', { message: 'Not in room' })
      return
    }

    room.highestBid = nextBid
    room.highestBidder = socket.id
    room.highestBidderName = room.players[socket.id].username

    io.to(roomId).emit('bid_update', {
      highestBid: nextBid,
      highestBidder: room.highestBidderName
    })

    if (nextBid >= 100) endAuction(roomId, io)
  })

  socket.on('disconnect', () => {
    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId]
      if (!room.players[socket.id]) continue

      if (room.auctionActive && room.highestBidder === socket.id) {
        room.highestBidder = null
        room.highestBidderName = null
      }

      delete room.players[socket.id]

      const remainingIds = Object.keys(room.players)
      if (remainingIds.length === 0) {
        clearInterval(room.timerRef)
        delete rooms[roomId]
        return
      }

      if (room.creator === socket.id) {
        room.creator = remainingIds[0]
      }

      io.to(roomId).emit('player_list', {
        players: getPlayerList(room),
        creator: room.creator
      })

      return
    }
  })
})

server.listen(4000, () => {
  console.log('Server running on http://localhost:4000')
})
