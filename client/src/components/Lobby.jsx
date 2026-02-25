import { useState } from 'react'

export default function Lobby({
  socket,
  roomId,
  players,
  isCreator,
  creatorId,
  error,
  username,
  setUsername,
  playerCount
}) {
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinUsername, setJoinUsername] = useState('')

  const canStart = isCreator && playerCount >= 2

  const onCreate = () => {
    if (!username.trim()) return
    socket.emit('create_room', { username: username.trim() })
  }

  const onJoin = () => {
    if (!joinUsername.trim() || !joinRoomId.trim()) return
    setUsername(joinUsername.trim())
    socket.emit('join_room', { roomId: joinRoomId.trim().toUpperCase(), username: joinUsername.trim() })
  }

  const onStart = () => {
    socket.emit('start_auction', { roomId })
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      {error && (
        <div className="mb-4 bg-red-900 border border-red-600 text-red-300 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">AuctionLive</h1>
        <p className="text-gray-400 mt-2">Minimal real-time bidding rooms</p>
      </div>

      {!roomId ? (
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-white font-bold text-xl mb-3">Create Room</div>
            <div className="text-gray-400 text-sm mb-2">Username</div>
            <input
              className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg w-full focus:outline-none focus:border-orange-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Alice"
            />
            <button
              className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg"
              onClick={onCreate}
            >
              Create Room
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="text-white font-bold text-xl mb-3">Join Room</div>

            <div className="text-gray-400 text-sm mb-2">Username</div>
            <input
              className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg w-full focus:outline-none focus:border-orange-500"
              value={joinUsername}
              onChange={(e) => setJoinUsername(e.target.value)}
              placeholder="e.g. Bob"
            />

            <div className="text-gray-400 text-sm mb-2 mt-3">Room ID</div>
            <input
              className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg w-full focus:outline-none focus:border-orange-500"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="ABC123"
            />

            <button
              className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              onClick={onJoin}
            >
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm">Room ID</div>
              <div className="inline-block mt-1 bg-gray-700 px-3 py-1 rounded text-orange-400 font-mono">
                {roomId}
              </div>
            </div>
            <div className="text-gray-400 text-sm">Players: {playerCount}</div>
          </div>

          <div className="mt-5">
            <div className="text-gray-400 text-sm mb-2">Players</div>
            <div className="space-y-2">
              {players.map((p) => {
                const isMe = p.id === socket.id
                const isRoomCreator = creatorId && p.id === creatorId
                return (
                  <div
                    key={p.id}
                    className={
                      'flex items-center justify-between bg-gray-900/40 rounded-lg px-3 py-2 border ' +
                      (isMe ? 'border-orange-500' : 'border-gray-700')
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-white font-semibold">{p.username}</div>
                      {isRoomCreator && (
                        <span className="text-orange-400" title="Creator">
                          👑
                        </span>
                      )}
                    </div>
                    <div className="bg-gray-700 text-white text-sm px-2 py-1 rounded-lg">
                      {p.totalWins} wins
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6">
            {isCreator ? (
              <>
                <button
                  className={
                    'w-full font-semibold px-4 py-2 rounded-lg ' +
                    (canStart
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 cursor-not-allowed')
                  }
                  onClick={onStart}
                  disabled={!canStart}
                >
                  Start Auction
                </button>
                <div className="text-gray-400 text-sm mt-2">You are the room creator</div>
                {!canStart && (
                  <div className="text-gray-400 text-sm mt-1">Need at least 2 players</div>
                )}
              </>
            ) : (
              <div className="text-gray-400 text-sm">
                Waiting for creator to start the auction...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
