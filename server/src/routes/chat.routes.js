import { Router } from 'express';
import { z } from 'zod';
import * as conv from '../controllers/conversation.controller.js';
import * as grp from '../controllers/group.controller.js';
import * as msg from '../controllers/message.controller.js';
import { uploadAttachments } from '../controllers/upload.controller.js';
import { validate } from '../middleware/validate.js';
import { sendLimiter } from '../middleware/rateLimit.js';
import { uploadAvatar, uploadFiles } from '../middleware/upload.js';
import { chat as v, objectId } from '../validators/index.js';

const router = Router();
const memberParams = validate({ params: z.object({ id: objectId, userId: objectId }) });

/* Conversations */
router.get('/conversations', validate(v.listConversations), conv.listConversations);
router.post('/conversations/direct', validate(v.direct), conv.openDirect);
router.post('/conversations/ai', conv.openAi);
router.post('/conversations/group', validate(v.createGroup), grp.createGroup);
router.get('/conversations/:id', validate(v.id), conv.getConversation);
router.patch('/conversations/:id/archive', validate(v.archive), conv.setArchived);
router.post('/conversations/:id/read', validate(v.id), conv.markRead);
router.get('/conversations/:id/messages', validate(v.getMessages), msg.getMessages);
router.post('/conversations/:id/messages', sendLimiter, validate(v.sendMessage), msg.sendMessage);
router.get('/conversations/:id/pinned', validate(v.id), msg.getPinned);
router.get('/conversations/:id/media', validate(v.media), msg.getMedia);

/* Groups */
router.patch('/groups/:id', validate(v.groupUpdate), grp.updateGroup);
router.patch('/groups/:id/avatar', validate(v.id), uploadAvatar.single('avatar'), grp.updateGroupAvatar);
router.post('/groups/:id/members', validate(v.groupMembers), grp.addMembers);
router.delete('/groups/:id/members/:userId', memberParams, grp.removeMemberByAdmin);
router.post('/groups/:id/admins/:userId', memberParams, grp.toggleAdmin);
router.post('/groups/:id/leave', validate(v.id), grp.leaveGroup);

/* Messages (static paths before "/:id") */
router.get('/messages/search', validate(v.search), msg.searchMessages);
router.get('/messages/starred', msg.starredMessages);
router.get('/messages/scheduled', msg.scheduledMessages);
router.patch('/messages/:id', validate(v.editMessage), msg.editMessage);
router.delete('/messages/:id', validate(v.deleteMessage), msg.deleteMessage);
router.post('/messages/:id/reactions', validate(v.react), msg.toggleReaction);
router.post('/messages/:id/pin', validate(v.id), msg.togglePin);
router.post('/messages/:id/star', validate(v.id), msg.toggleStar);
router.post('/messages/:id/forward', sendLimiter, validate(v.forward), msg.forwardMessage);
router.post('/messages/:id/vote', validate(v.vote), msg.votePoll);

/* Uploads */
router.post('/uploads', sendLimiter, uploadFiles.array('files', 10), uploadAttachments);

export default router;
