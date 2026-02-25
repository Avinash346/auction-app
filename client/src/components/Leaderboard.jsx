export default function Leaderboard({ socket, roomId, auctionResult, scores, isCreator }) {
  const onNext = () => {
    socket.emit('start_auction', { roomId })
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="text-center">
          <div className="text-2xl">🏆</div>
          <div className="text-white font-bold text-xl mt-2">Auction Complete!</div>

          {auctionResult && (
            <>
              <div className="mt-3 text-gray-400 text-sm">Winner</div>
              <div className="text-orange-400 font-bold text-2xl">{auctionResult.winner}</div>
              <div className="text-gray-400 text-sm mt-2">
                Winning bid: <span className="text-white font-semibold">₹{auctionResult.winningBid}</span>
              </div>
              <div className="text-gray-400 text-sm mt-1">
                Item: <span className="text-white font-semibold">{auctionResult.item ? auctionResult.item.name : '-'}</span>
              </div>
            </>
          )}
        </div>

        <div className="mt-6">
          <div className="text-gray-400 text-sm mb-2">Scores</div>
          <div className="grid grid-cols-3 text-gray-400 text-sm px-2">
            <div>Rank</div>
            <div>Player</div>
            <div className="text-right">Wins</div>
          </div>

          <div className="mt-2 space-y-2">
            {scores.map((s, idx) => {
              const top = idx === 0
              return (
                <div
                  key={s.username + idx}
                  className={
                    'grid grid-cols-3 items-center rounded-lg px-3 py-2 ' +
                    (idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900/40')
                  }
                >
                  <div className={top ? 'text-orange-400 font-bold' : 'text-gray-300'}>#{idx + 1}</div>
                  <div className={top ? 'text-orange-400 font-bold' : 'text-white'}>{s.username}</div>
                  <div className={top ? 'text-orange-400 font-bold text-right' : 'text-white text-right'}>
                    {s.totalWins}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6">
          {isCreator ? (
            <button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg"
              onClick={onNext}
            >
              Start Next Item →
            </button>
          ) : (
            <div className="text-gray-400 text-sm">Waiting for creator to start next item...</div>
          )}
        </div>
      </div>
    </div>
  )
}
