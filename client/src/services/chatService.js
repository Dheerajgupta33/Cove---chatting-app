import api from './api';

export const chatService = {
  conversations: (archived = false) =>
    api.get('/conversations', { params: { archived } }),

  conversation: (id) =>
    api.get(`/conversations/${id}`),

  openDirect: (userId) =>
    api.post('/conversations/direct', { userId }),

  openAi: () =>
    api.post('/conversations/ai'),

  createGroup: (body) =>
    api.post('/conversations/group', body),

  archive: (id, archived) =>
    api.patch(`/conversations/${id}/archive`, { archived }),

  markRead: (id) =>
    api.post(`/conversations/${id}/read`),

  messages: (id, params) =>
    api.get(`/conversations/${id}/messages`, { params }),

  // Send message
  send: (id, body) => {
    const payload = { ...body };

    // The backend expects "poll" to be an object when present.
    // Remove it when there is no poll.
    if (payload.poll === null || payload.poll === undefined) {
      delete payload.poll;
    }

    // Remove scheduledFor when this is a normal message.
    if (
      payload.scheduledFor === null ||
      payload.scheduledFor === undefined
    ) {
      delete payload.scheduledFor;
    }

    return api.post(`/conversations/${id}/messages`, payload);
  },

  pinned: (id) =>
    api.get(`/conversations/${id}/pinned`),

  media: (id, kind) =>
    api.get(`/conversations/${id}/media`, { params: { kind } }),

  edit: (id, text) =>
    api.patch(`/messages/${id}`, { text }),

  remove: (id, scope) =>
    api.delete(`/messages/${id}`, { params: { scope } }),

  react: (id, emoji) =>
    api.post(`/messages/${id}/reactions`, { emoji }),

  pin: (id) =>
    api.post(`/messages/${id}/pin`),

  star: (id) =>
    api.post(`/messages/${id}/star`),

  forward: (id, conversationIds) =>
    api.post(`/messages/${id}/forward`, { conversationIds }),

  vote: (id, optionIndex) =>
    api.post(`/messages/${id}/vote`, { optionIndex }),

  search: (params) =>
    api.get('/messages/search', { params }),

  starred: () =>
    api.get('/messages/starred'),

  scheduled: () =>
    api.get('/messages/scheduled'),

  upload: (files, onProgress) => {
    const fd = new FormData();

    files.forEach((f) => {
      fd.append('files', f);
    });

    return api.post('/uploads', fd, {
      timeout: 120000,
      onUploadProgress: (e) => {
        if (e.total) {
          onProgress?.(
            Math.round((e.loaded / e.total) * 100)
          );
        }
      },
    });
  },

  // Groups
  updateGroup: (id, body) =>
    api.patch(`/groups/${id}`, body),

  updateGroupAvatar: (id, file) => {
    const fd = new FormData();
    fd.append('avatar', file);

    return api.patch(`/groups/${id}/avatar`, fd);
  },

  addMembers: (id, userIds) =>
    api.post(`/groups/${id}/members`, { userIds }),

  removeMember: (id, userId) =>
    api.delete(`/groups/${id}/members/${userId}`),

  toggleAdmin: (id, userId) =>
    api.post(`/groups/${id}/admins/${userId}`),

  leaveGroup: (id) =>
    api.post(`/groups/${id}/leave`),
};
