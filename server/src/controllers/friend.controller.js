import User, { USER_PUBLIC } from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from '../services/notify.js';
import { emitToUser } from '../services/realtime.js';

const acceptRequest = async (request, me) => {
  request.status = 'accepted';
  await request.save();
  await Promise.all([
    User.updateOne({ _id: request.from }, { $addToSet: { friends: request.to } }),
    User.updateOne({ _id: request.to }, { $addToSet: { friends: request.from } }),
  ]);
  const friend = await User.findById(request.from).select(USER_PUBLIC).lean();
  emitToUser(request.from, 'friend:accepted', { user: { _id: me._id, name: me.name, username: me.username, avatar: me.avatar } });
  notify(request.from, { type: 'friend_accept', title: `${me.name} accepted your friend request`, from: me._id }).catch(() => {});
  return friend;
};

export const sendRequest = asyncHandler(async (req, res) => {
  const me = req.user;
  const { userId } = req.body;
  if (userId === String(me._id)) throw ApiError.badRequest('You cannot add yourself');
  const target = await User.findOne({ _id: userId, isBanned: false, isBot: false });
  if (!target) throw ApiError.notFound('User not found');
  if (target.blockedUsers.some((b) => String(b) === String(me._id)) || me.blockedUsers.some((b) => String(b) === userId)) {
    throw ApiError.forbidden('You cannot send a request to this person');
  }
  if (me.friends.some((f) => String(f) === userId)) throw ApiError.conflict('You are already friends');

  // If they already asked us, accept instead of creating a second request.
  const reverse = await FriendRequest.findOne({ from: userId, to: me._id, status: 'pending' });
  if (reverse) {
    await acceptRequest(reverse, me);
    return res.json({ status: 'accepted' });
  }
  const request = await FriendRequest.findOneAndUpdate(
    { from: me._id, to: userId },
    { $set: { status: 'pending' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const populated = await request.populate('from', USER_PUBLIC);
  emitToUser(userId, 'friend:request', { request: populated.toObject() });
  notify(userId, { type: 'friend_request', title: `${me.name} sent you a friend request`, from: me._id }).catch(() => {});
  res.status(201).json({ status: 'pending', requestId: request._id });
});

export const listRequests = asyncHandler(async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    FriendRequest.find({ to: req.user._id, status: 'pending' }).sort({ createdAt: -1 }).populate('from', USER_PUBLIC).lean(),
    FriendRequest.find({ from: req.user._id, status: 'pending' }).sort({ createdAt: -1 }).populate('to', USER_PUBLIC).lean(),
  ]);
  res.json({ incoming, outgoing });
});

export const accept = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findOne({ _id: req.params.id, to: req.user._id, status: 'pending' });
  if (!request) throw ApiError.notFound('Request not found');
  const friend = await acceptRequest(request, req.user);
  res.json({ friend });
});

export const reject = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findOneAndDelete({ _id: req.params.id, to: req.user._id, status: 'pending' });
  if (!request) throw ApiError.notFound('Request not found');
  res.json({ ok: true });
});

export const cancel = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findOneAndDelete({ _id: req.params.id, from: req.user._id, status: 'pending' });
  if (!request) throw ApiError.notFound('Request not found');
  res.json({ ok: true });
});

export const listFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('friends', USER_PUBLIC);
  res.json({ friends: user.friends.filter(Boolean) });
});

export const unfriend = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  await Promise.all([
    User.updateOne({ _id: req.user._id }, { $pull: { friends: userId } }),
    User.updateOne({ _id: userId }, { $pull: { friends: req.user._id } }),
    FriendRequest.deleteMany({ $or: [{ from: req.user._id, to: userId }, { from: userId, to: req.user._id }] }),
  ]);
  res.json({ ok: true });
});
