import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { refreshAccessToken } from '../../services/api';
import { disconnectSocket } from '../../services/socket';
import { loggedOut, sessionExpired, tokenRefreshed } from '../common/actions';

const fail = (err, rejectWithValue) =>
  rejectWithValue({ message: err?.response?.data?.message || 'Something went wrong. Please try again.', code: err?.response?.data?.code });

// On app start: try to turn the httpOnly refresh cookie into a session.
export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  try { return await refreshAccessToken(); } catch (e) { return rejectWithValue(); }
});

export const loginUser = createAsyncThunk('auth/login', async (body, { rejectWithValue }) => {
  try { return (await authService.login(body)).data; } catch (e) { return fail(e, rejectWithValue); }
});

export const registerUser = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => {
  try { return (await authService.register(body)).data; } catch (e) { return fail(e, rejectWithValue); }
});

export const googleLogin = createAsyncThunk('auth/google', async (credential, { rejectWithValue }) => {
  try { return (await authService.google(credential)).data; } catch (e) { return fail(e, rejectWithValue); }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (body, { rejectWithValue }) => {
  try { return (await authService.changePassword(body)).data; } catch (e) { return fail(e, rejectWithValue); }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try { await authService.logout(); } catch { /* still sign out locally */ }
  disconnectSocket();
  dispatch(loggedOut());
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (body, { rejectWithValue }) => {
  try { return (await userService.updateMe(body)).data.user; } catch (e) { return fail(e, rejectWithValue); }
});

export const updateAvatar = createAsyncThunk('auth/updateAvatar', async (file, { rejectWithValue }) => {
  try { return (await userService.updateAvatar(file)).data.user; } catch (e) { return fail(e, rejectWithValue); }
});

const initialState = {
  user: null,
  accessToken: null,
  status: 'loading', // loading -> authenticated | unauthenticated
};

const setSession = (state, { accessToken, user }) => {
  state.accessToken = accessToken;
  state.user = user;
  state.status = 'authenticated';
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    userPatched(state, { payload }) { if (state.user) Object.assign(state.user, payload); },
  },
  extraReducers: (b) => {
    b.addCase(bootstrapAuth.fulfilled, (s, a) => setSession(s, a.payload))
      .addCase(bootstrapAuth.rejected, (s) => { s.status = 'unauthenticated'; })
      .addCase(loginUser.fulfilled, (s, a) => setSession(s, a.payload))
      .addCase(googleLogin.fulfilled, (s, a) => setSession(s, a.payload))
      .addCase(registerUser.fulfilled, (s, a) => { if (a.payload.accessToken) setSession(s, a.payload); })
      .addCase(changePassword.fulfilled, (s, a) => setSession(s, a.payload))
      .addCase(updateProfile.fulfilled, (s, a) => { s.user = { ...s.user, ...a.payload }; })
      .addCase(updateAvatar.fulfilled, (s, a) => { s.user = { ...s.user, ...a.payload }; })
      .addCase(tokenRefreshed, (s, a) => { s.accessToken = a.payload.accessToken; if (a.payload.user) s.user = a.payload.user; })
      .addCase(sessionExpired, (s) => { s.user = null; s.accessToken = null; s.status = 'unauthenticated'; });
  },
});

export const { userPatched } = slice.actions;
export default slice.reducer;
