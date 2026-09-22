import api from './api';

export const userService = {
  search: (q) => api.get('/users/search', { params: { q } }),
  get: (id) => api.get(`/users/${id}`),
  updateMe: (body) => api.patch('/users/me', body),
  updateAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.patch('/users/me/avatar', fd);
  },
  active: () => api.get('/users/active'),
  favorites: () => api.get('/users/favorites'),
  toggleFavorite: (id) => api.post(`/users/${id}/favorite`),
  blocked: () => api.get('/users/blocked'),
  block: (id) => api.post(`/users/${id}/block`),
  unblock: (id) => api.delete(`/users/${id}/block`),
  stats: () => api.get('/users/me/stats'),
  activity: () => api.get('/users/me/activity'),
  backup: () => api.get('/users/me/backup', { responseType: 'blob' }),

  // friends
  friends: () => api.get('/friends'),
  requests: () => api.get('/friends/requests'),
  sendRequest: (userId) => api.post('/friends/requests', { userId }),
  acceptRequest: (id) => api.post(`/friends/requests/${id}/accept`),
  rejectRequest: (id) => api.post(`/friends/requests/${id}/reject`),
  cancelRequest: (id) => api.delete(`/friends/requests/${id}`),
  unfriend: (userId) => api.delete(`/friends/${userId}`),

  // notifications
  notifications: () => api.get('/notifications'),
  readNotification: (id) => api.post(`/notifications/${id}/read`),
  readAllNotifications: () => api.post('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  clearNotifications: () => api.delete('/notifications'),

  // safety + settings
  report: (body) => api.post('/reports', body),
  getSettings: () => api.get('/settings'),
  updateSettings: (body) => api.patch('/settings', body),
};
