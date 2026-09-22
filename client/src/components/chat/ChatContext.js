import { createContext, useContext } from 'react';

// Shared by everything inside an open conversation (header, list, composer, side panel).
export const ChatContext = createContext(null);
export const useChat = () => useContext(ChatContext);
