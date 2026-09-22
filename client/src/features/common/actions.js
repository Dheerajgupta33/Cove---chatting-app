// Actions shared by several slices / the HTTP layer. Kept dependency-free to avoid import cycles.
import { createAction } from '@reduxjs/toolkit';

export const tokenRefreshed = createAction('auth/tokenRefreshed');
export const sessionExpired = createAction('auth/sessionExpired');
export const loggedOut = createAction('auth/loggedOut');
export const presenceUpdated = createAction('presence/updated');
