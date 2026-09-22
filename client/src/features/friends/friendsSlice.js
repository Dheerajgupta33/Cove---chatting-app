import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';
import { presenceUpdated } from '../common/actions';

export const fetchFriends = createAsyncThunk('friends/fetchFriends', async () => (await userService.friends()).data.friends);
export const fetchRequests = createAsyncThunk('friends/fetchRequests', async () => (await userService.requests()).data);
export const fetchFavorites = createAsyncThunk('friends/fetchFavorites', async () => (await userService.favorites()).data.users);
export const fetchActive = createAsyncThunk('friends/fetchActive', async () => (await userService.active()).data.users);

const applyPresence = (list, { userId, isOnline, lastSeen }) => {
  const u = list.find((x) => x._id === userId);
  if (u) { u.isOnline = isOnline; if (lastSeen) u.lastSeen = lastSeen; }
};

const slice = createSlice({
  name: 'friends',
  initialState: { friends: [], incoming: [], outgoing: [], favorites: [], active: [], loaded: false },
  reducers: {
    requestReceived(state, { payload }) {
      if (!state.incoming.some((r) => r._id === payload._id)) state.incoming.unshift(payload);
    },
    requestRemoved(state, { payload: id }) {
      state.incoming = state.incoming.filter((r) => r._id !== id);
      state.outgoing = state.outgoing.filter((r) => r._id !== id);
    },
    favoriteToggled(state, { payload: { user, isFavorite } }) {
      state.favorites = isFavorite ? [user, ...state.favorites.filter((u) => u._id !== user._id)] : state.favorites.filter((u) => u._id !== user._id);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchFriends.fulfilled, (s, a) => { s.friends = a.payload; s.loaded = true; })
      .addCase(fetchRequests.fulfilled, (s, a) => { s.incoming = a.payload.incoming; s.outgoing = a.payload.outgoing; })
      .addCase(fetchFavorites.fulfilled, (s, a) => { s.favorites = a.payload; })
      .addCase(fetchActive.fulfilled, (s, a) => { s.active = a.payload; })
      .addCase(presenceUpdated, (s, { payload }) => {
        applyPresence(s.friends, payload);
        applyPresence(s.favorites, payload);
        const inActive = s.active.find((u) => u._id === payload.userId);
        if (inActive && !payload.isOnline) s.active = s.active.filter((u) => u._id !== payload.userId);
        else if (!inActive && payload.isOnline) {
          const known = s.friends.find((u) => u._id === payload.userId) || s.favorites.find((u) => u._id === payload.userId);
          if (known) s.active.unshift({ ...known, isOnline: true });
        }
      });
  },
});

export const { requestReceived, requestRemoved, favoriteToggled } = slice.actions;
export default slice.reducer;
