import Conversation from '../models/Conversation.js';
import Group from '../models/Group.js';
import User, { USER_PUBLIC } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CONV_POPULATE, presentConversation } from '../services/serialize.js';
import { createSystemMessage } from '../services/message.service.js';
import { emitToConversation, emitToUser, joinConversation, leaveConversation } from '../services/realtime.js';
import { uploadBuffer, deleteAsset } from '../services/storage.js';
import { notify } from '../services/notify.js';

const idStr = (v) => String(v?._id ?? v);
const isAdmin = (group, userId) => group.admins.some((a) => idStr(a) === idStr(userId)) || idStr(group.owner) === idStr(userId);

const loadFull = (id) => Conversation.findById(id).populate(CONV_POPULATE);

// Pushes the current group + member list to everyone in the room.
async function broadcastGroup(conversationId) {
  const conv = await loadFull(conversationId);
  const shape = presentConversation(conv, null);
  emitToConversation(conversationId, 'conversation:updated', {
    conversationId: String(conversationId),
    patch: { group: shape.group, participants: shape.participants },
  });
}

async function getGroupAsMember(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  if (!group.members.some((m) => idStr(m) === idStr(userId))) throw ApiError.forbidden('You are not in this group');
  return group;
}

export const createGroup = asyncHandler(async (req, res) => {
  const me = req.user;
  const { name, description, memberIds } = req.body;
  const valid = await User.find({ _id: { $in: memberIds, $ne: me._id }, isBanned: false, isBot: false }).select('_id');
  if (!valid.length) throw ApiError.badRequest('Add at least one valid member');
  const ids = [String(me._id), ...valid.map((u) => String(u._id))];

  const group = await Group.create({ name, description, owner: me._id, admins: [me._id], members: ids });
  const conv = await Conversation.create({ type: 'group', group: group._id, members: ids.map((user) => ({ user })) });
  group.conversation = conv._id;
  await group.save();

  joinConversation(ids, conv._id);
  await createSystemMessage(conv, me._id, `${me.name} created the group “${name}”`);

  const full = presentConversation(await loadFull(conv._id), me._id);
  ids.filter((id) => id !== String(me._id)).forEach((id) => {
    emitToUser(id, 'conversation:new', { conversation: { ...full, me: { unread: 1, archived: false } } });
    notify(id, { type: 'group', title: `${me.name} added you to ${name}`, from: me._id, conversation: conv._id }).catch(() => {});
  });
  res.status(201).json({ conversation: full });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await getGroupAsMember(req.params.id, req.user._id);
  if (!isAdmin(group, req.user._id)) throw ApiError.forbidden('Only group admins can edit the group');
  const renamed = req.body.name && req.body.name !== group.name;
  Object.assign(group, req.body);
  await group.save();
  const conv = await Conversation.findById(group.conversation);
  if (renamed) await createSystemMessage(conv, req.user._id, `${req.user.name} renamed the group to “${group.name}”`);
  await broadcastGroup(group.conversation);
  res.json({ ok: true });
});

export const updateGroupAvatar = asyncHandler(async (req, res) => {
  const group = await getGroupAsMember(req.params.id, req.user._id);
  if (!isAdmin(group, req.user._id)) throw ApiError.forbidden('Only group admins can change the picture');
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const up = await uploadBuffer(req.file, { folder: 'groups', transformation: [{ width: 512, height: 512, crop: 'fill' }] });
  const old = group.avatar?.publicId;
  group.avatar = { url: up.url, publicId: up.publicId };
  await group.save();
  if (old) deleteAsset(old);
  await broadcastGroup(group.conversation);
  res.json({ avatar: group.avatar });
});

export const addMembers = asyncHandler(async (req, res) => {
  const group = await getGroupAsMember(req.params.id, req.user._id);
  if (!isAdmin(group, req.user._id)) throw ApiError.forbidden('Only group admins can add people');
  const existing = new Set(group.members.map(idStr));
  const users = await User.find({ _id: { $in: req.body.userIds }, isBanned: false, isBot: false }).select(USER_PUBLIC);
  const fresh = users.filter((u) => !existing.has(idStr(u._id)));
  if (!fresh.length) throw ApiError.badRequest('Those people are already in the group');
  if (group.members.length + fresh.length > 256) throw ApiError.badRequest('Groups can have up to 256 members');

  const ids = fresh.map((u) => idStr(u._id));
  group.members.push(...ids);
  await group.save();
  await Conversation.updateOne({ _id: group.conversation }, { $push: { members: { $each: ids.map((user) => ({ user, unread: 1 })) } } });
  joinConversation(ids, group.conversation);

  const conv = await Conversation.findById(group.conversation);
  await createSystemMessage(conv, req.user._id, `${req.user.name} added ${fresh.map((u) => u.name).join(', ')}`);
  const full = presentConversation(await loadFull(group.conversation), null);
  ids.forEach((id) => {
    emitToUser(id, 'conversation:new', { conversation: { ...full, me: { unread: 1, archived: false } } });
    notify(id, { type: 'group', title: `${req.user.name} added you to ${group.name}`, from: req.user._id, conversation: group.conversation }).catch(() => {});
  });
  await broadcastGroup(group.conversation);
  res.json({ ok: true });
});

async function removeMember(group, userId, actor, verb) {
  group.members = group.members.filter((m) => idStr(m) !== userId);
  group.admins = group.admins.filter((m) => idStr(m) !== userId);
  if (idStr(group.owner) === userId) group.owner = group.admins[0] || group.members[0]; // hand over ownership
  if (group.owner && !group.admins.some((a) => idStr(a) === idStr(group.owner))) group.admins.push(group.owner);
  await group.save();
  await Conversation.updateOne({ _id: group.conversation }, { $pull: { members: { user: userId } } });

  const conv = await Conversation.findById(group.conversation);
  const removed = await User.findById(userId).select('name');
  emitToUser(userId, 'conversation:removed', { conversationId: String(group.conversation) });
  leaveConversation([userId], group.conversation);
  if (group.members.length) {
    await createSystemMessage(conv, actor._id, `${verb === 'left' ? removed.name : actor.name} ${verb === 'left' ? 'left the group' : `removed ${removed.name}`}`);
    await broadcastGroup(group.conversation);
  }
}

export const removeMemberByAdmin = asyncHandler(async (req, res) => {
  const group = await getGroupAsMember(req.params.id, req.user._id);
  const target = req.params.userId;
  if (!isAdmin(group, req.user._id)) throw ApiError.forbidden('Only group admins can remove people');
  if (target === idStr(group.owner)) throw ApiError.forbidden('The group owner cannot be removed');
  if (!group.members.some((m) => idStr(m) === target)) throw ApiError.notFound('That person is not in the group');
  await removeMember(group, target, req.user, 'removed');
  res.json({ ok: true });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const group = await getGroupAsMember(req.params.id, req.user._id);
  await removeMember(group, idStr(req.user._id), req.user, 'left');
  res.json({ ok: true });
});

export const toggleAdmin = asyncHandler(async (req, res) => {
  const group = await getGroupAsMember(req.params.id, req.user._id);
  if (idStr(group.owner) !== idStr(req.user._id)) throw ApiError.forbidden('Only the owner can change admins');
  const target = req.params.userId;
  if (!group.members.some((m) => idStr(m) === target)) throw ApiError.notFound('That person is not in the group');
  if (target === idStr(group.owner)) throw ApiError.badRequest('The owner is always an admin');
  const has = group.admins.some((a) => idStr(a) === target);
  group.admins = has ? group.admins.filter((a) => idStr(a) !== target) : [...group.admins, target];
  await group.save();
  await broadcastGroup(group.conversation);
  res.json({ isAdmin: !has });
});
