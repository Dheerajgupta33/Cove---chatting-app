import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => (await userService.notifications()).data);

const slice = createSlice({
  name: 'notifications',
  initialState: { items: [], unread: 0, status: 'idle' },
  reducers: {
    notificationAdded(state, { payload }) {
      if (state.items.some((n) => n._id === payload._id)) return;
      state.items.unshift(payload);
      state.unread += 1;
    },
    notificationRead(state, { payload: id }) {
      const n = state.items.find((x) => x._id === id);
      if (n && !n.read) { n.read = true; state.unread = Math.max(0, state.unread - 1); }
    },
    allNotificationsRead(state) { state.items.forEach((n) => { n.read = true; }); state.unread = 0; },
    notificationRemoved(state, { payload: id }) {
      const n = state.items.find((x) => x._id === id);
      if (n && !n.read) state.unread = Math.max(0, state.unread - 1);
      state.items = state.items.filter((x) => x._id !== id);
    },
    notificationsCleared(state) { state.items = []; state.unread = 0; },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotifications.pending, (s) => { s.status = 'loading'; })
      .addCase(fetchNotifications.fulfilled, (s, { payload }) => { s.items = payload.notifications; s.unread = payload.unread; s.status = 'ready'; })
      .addCase(fetchNotifications.rejected, (s) => { s.status = 'ready'; });
  },
});

export const { notificationAdded, notificationRead, allNotificationsRead, notificationRemoved, notificationsCleared } = slice.actions;
export default slice.reducer;
