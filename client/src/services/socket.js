import { io } from 'socket.io-client';
import { API_URL } from './api';

let socket = null;

// `auth` is a function so every (re)connect uses the freshest access token.
export function connectSocket(getToken) {
  if (socket) return socket;
  socket = io(API_URL, {
    auth: (cb) => cb({ token: getToken() }),
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 8000,
  });
  return socket;
}

export const getSocket = () => socket;

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
