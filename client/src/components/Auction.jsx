function getIncrement(bid) {
  if (bid < 20) return 2
  if (bid < 50) return 3
  return 5
}

function getNextBid(bid) {
  return bid + getIncrement(bid)
}

export default function Auction({
  socket,
  roomId,
  currentItem,
  highestBid,
  highestBidder,
  timeLeft,
  username
}) {
  const nextBid = getNextBid(highestBid)

  const tier = getIncrement(highestBid)

  const timerPct = Math.max(0, Math.min(100, (timeLeft / 60) * 100))
  const bidPct = Math.max(0, Math.min(100, (highestBid / 100) * 100))

  const urgent = timeLeft <= 10

  const onBid = () => {
    socket.emit('increment_bid', { roomId })
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="text-gray-400 text-sm">Item</div>
        <div className="text-white font-bold text-2xl mt-1">{currentItem ? currentItem.name : '...'}</div>
        <div className="text-gray-400 text-sm mt-1">Item {currentItem ? currentItem.id : '-'} of 5</div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-gray-400 text-sm">Time Remaining</div>
          <div className={(urgent ? 'text-red-400 animate-pulse ' : 'text-white ') + 'font-bold'}>
            {timeLeft}s
          </div>
        </div>

        <div className="mt-2 bg-gray-700 rounded-full h-3 overflow-hidden">
          <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${timerPct}%` }} />
        </div>

        <div className="mt-6">
          <div className="text-gray-400 text-sm">Current Highest Bid</div>
          <div className="text-4xl text-orange-400 font-bold mt-1">₹{highestBid}</div>
          <div className="text-gray-400 text-sm mt-1">
            {highestBidder ? `by ${highestBidder}` : 'No bids yet'}
          </div>
        </div>

        <div className="mt-3 bg-gray-700 rounded-full h-3 overflow-hidden">
          <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${bidPct}%` }} />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
          <div
            className={
              'bg-gray-900/40 rounded-lg p-2 border ' +
              (tier === 2 ? 'border-orange-500 text-orange-400' : 'border-gray-700 text-gray-300')
            }
          >
            ₹0–20 → +2
          </div>
          <div
            className={
              'bg-gray-900/40 rounded-lg p-2 border ' +
              (tier === 3 ? 'border-orange-500 text-orange-400' : 'border-gray-700 text-gray-300')
            }
          >
            ₹21–50 → +3
          </div>
          <div
            className={
              'bg-gray-900/40 rounded-lg p-2 border ' +
              (tier === 5 ? 'border-orange-500 text-orange-400' : 'border-gray-700 text-gray-300')
            }
          >
            ₹51–100 → +5
          </div>
        </div>

        <button
          className={
            'mt-6 w-full text-white font-semibold px-4 py-3 rounded-lg ' +
            (timeLeft <= 0 || nextBid > 100
              ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600')
          }
          onClick={onBid}
          disabled={timeLeft <= 0 || nextBid > 100}
        >
          Place Bid ₹{nextBid}
        </button>

        <div className="text-gray-400 text-sm mt-3">You: {username || 'Guest'}</div>
      </div>
    </div>
  )
}
