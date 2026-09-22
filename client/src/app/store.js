import { combineReducers, configureStore } from '@reduxjs/toolkit';
import auth from '../features/auth/authSlice';
import chat from '../features/chat/chatSlice';
import ui from '../features/ui/uiSlice';
import notifications from '../features/notifications/notificationsSlice';
import friends from '../features/friends/friendsSlice';
import { loggedOut, sessionExpired } from '../features/common/actions';
import { injectStore } from '../services/api';

const appReducer = combineReducers({ auth, chat, ui, notifications, friends });

// Signing out (or losing the session) wipes every slice so no data leaks to the next account.
const rootReducer = (state, action) => {
  if (action.type === loggedOut.type || action.type === sessionExpired.type) {
    const fresh = appReducer(undefined, action);
    return { ...fresh, auth: { ...fresh.auth, status: 'unauthenticated' }, ui: state?.ui ?? fresh.ui };
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
});

injectStore(store);
