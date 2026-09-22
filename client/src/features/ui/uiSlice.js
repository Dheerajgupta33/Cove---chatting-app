import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'cove-theme';
const storedTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'system'; } catch { return 'system'; } };

const slice = createSlice({
  name: 'ui',
  initialState: {
    theme: storedTheme(), // system | light | dark
    settings: {
      enterToSend: true,
      notifications: { sound: true, desktop: false, preview: true },
      privacy: { showOnline: true, showLastSeen: true, readReceipts: true },
    },
    infoPanel: { open: false, tab: 'about', query: '' },
    forwarding: null, // the message being forwarded
    // Call state machine: null | { id, status: outgoing|incoming|connected, type, peer, conversationId, startedAt }
    call: null,
  },
  reducers: {
    themeSet(state, { payload }) {
      state.theme = payload;
      try { localStorage.setItem(THEME_KEY, payload); } catch { /* private mode */ }
    },
    settingsLoaded(state, { payload }) {
      state.settings = { ...state.settings, ...payload, notifications: { ...state.settings.notifications, ...payload.notifications }, privacy: { ...state.settings.privacy, ...payload.privacy } };
    },
    infoPanelOpened(state, { payload = 'about' }) { state.infoPanel = { open: true, tab: payload, query: '' }; },
    // e.g. clicking a #hashtag: open the search tab pre-filled
    searchRequested(state, { payload }) { state.infoPanel = { open: true, tab: 'search', query: payload }; },
    infoPanelClosed(state) { state.infoPanel.open = false; },
    infoPanelToggled(state) { state.infoPanel.open = !state.infoPanel.open; },
    infoTabSet(state, { payload }) { state.infoPanel.tab = payload; },
    forwardingSet(state, { payload }) { state.forwarding = payload; },
    callSet(state, { payload }) { state.call = payload; },
    callPatched(state, { payload }) { if (state.call) Object.assign(state.call, payload); },
    callCleared(state) { state.call = null; },
  },
});

export const { themeSet, settingsLoaded, searchRequested, infoPanelOpened, infoPanelClosed, infoPanelToggled, infoTabSet, forwardingSet, callSet, callPatched, callCleared } = slice.actions;
export default slice.reducer;
