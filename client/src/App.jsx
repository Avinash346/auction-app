import { useEffect, useMemo, useState } from 'react'
import socket from './socket'
import Lobby from './components/Lobby'
import Auction from './components/Auction'
import Leaderboard from './components/Leaderboard'

export default function App() {
  const [screen, setScreen] = useState('lobby')
  const [roomId, setRoomId] = useState('')
  const [username, setUsername] = useState('')
  const [isCreator, setIsCreator] = useState(false)
  const [creatorId, setCreatorId] = useState(null)

  const [players, setPlayers] = useState([])
  const [scores, setScores] = useState([])

  const [currentItem, setCurrentItem] = useState(null)
  const [highestBid, setHighestBid] = useState(2)
  const [highestBidder, setHighestBidder] = useState(null)
  const [timeLeft, setTimeLeft] = useState(60)

  const [auctionResult, setAuctionResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onConnect() {
      setError(null)
    }

    function onConnectError(e) {
      setError(e && e.message ? e.message : 'Socket connection failed')
      setTimeout(() => setError(null), 3000)
    }

    function onRoomCreated({ roomId: id }) {
      setRoomId(id)
      setScreen('lobby')
    }

    function onJoinedRoom({ roomId: id }) {
      setRoomId(id)
      setScreen('lobby')
    }

    function onPlayerList({ players, creator }) {
      setPlayers(players)
      setIsCreator(socket.id === creator)
      setCreatorId(creator)
    }

    function onAuctionStarted({ item, highestBid, endTime }) {
      setCurrentItem(item)
      setHighestBid(highestBid)
      setHighestBidder(null)
      setAuctionResult(null)
      const t = Math.ceil((endTime - Date.now()) / 1000)
      setTimeLeft(Number.isFinite(t) ? t : 60)
      setScreen('auction')
    }

    function onTimerUpdate({ timeLeft }) {
      setTimeLeft(timeLeft)
    }

    function onBidUpdate({ highestBid, highestBidder }) {
      setHighestBid(highestBid)
      setHighestBidder(highestBidder)
    }

    function onAuctionResult(result) {
      setAuctionResult(result)
      setScreen('result')
    }

    function onScoreUpdate({ scores }) {
      setScores(scores)
    }

    function onError({ message }) {
      setError(message)
      setTimeout(() => setError(null), 3000)
    }

    socket.on('room_created', onRoomCreated)
    socket.on('joined_room', onJoinedRoom)
    socket.on('player_list', onPlayerList)
    socket.on('auction_started', onAuctionStarted)
    socket.on('timer_update', onTimerUpdate)
    socket.on('bid_update', onBidUpdate)
    socket.on('auction_result', onAuctionResult)
    socket.on('score_update', onScoreUpdate)
    socket.on('error', onError)
    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('room_created', onRoomCreated)
      socket.off('joined_room', onJoinedRoom)
      socket.off('player_list', onPlayerList)
      socket.off('auction_started', onAuctionStarted)
      socket.off('timer_update', onTimerUpdate)
      socket.off('bid_update', onBidUpdate)
      socket.off('auction_result', onAuctionResult)
      socket.off('score_update', onScoreUpdate)
      socket.off('error', onError)
      socket.off('connect', onConnect)
      socket.off('connect_error', onConnectError)
    }
  }, [])

  const playerCount = players.length

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {screen === 'lobby' && (
          <Lobby
            socket={socket}
            roomId={roomId}
            players={players}
            isCreator={isCreator}
            creatorId={creatorId}
            error={error}
            username={username}
            setUsername={setUsername}
            playerCount={playerCount}
          />
        )}

        {screen === 'auction' && (
          <Auction
            socket={socket}
            roomId={roomId}
            currentItem={currentItem}
            highestBid={highestBid}
            highestBidder={highestBidder}
            timeLeft={timeLeft}
            username={username}
          />
        )}

        {screen === 'result' && (
          <Leaderboard
            socket={socket}
            roomId={roomId}
            auctionResult={auctionResult}
            scores={scores}
            isCreator={isCreator}
          />
        )}
      </div>
    </div>
  )
}
