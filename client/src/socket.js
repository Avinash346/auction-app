import { io } from 'socket.io-client'

const socket = io('https://auction-app-backend-wine.vercel.app')

export default socket
