import api from './api';

export const adminService = {
  stats: () => api.get('/admin/stats'),
  users: (params) => api.get('/admin/users', { params }),
  ban: (id, reason) => api.post(`/admin/users/${id}/ban`, { reason }),
  unban: (id) => api.post(`/admin/users/${id}/unban`),
  setRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  conversations: (params) => api.get('/admin/conversations', { params }),
  conversationMessages: (id, before) => api.get(`/admin/conversations/${id}/messages`, { params: { before } }),
  removeMessage: (id, reason) => api.delete(`/admin/messages/${id}`, { data: { reason } }),
  reports: (status) => api.get('/admin/reports', { params: { status } }),
  updateReport: (id, body) => api.patch(`/admin/reports/${id}`, body),
  flagged: () => api.get('/admin/moderation'),
  logs: (params) => api.get('/admin/logs', { params }),
};
