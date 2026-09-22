import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import UserPicker from './UserPicker';
import { createGroupChat } from '../../features/chat/chatSlice';
import { groupSchema } from '../../lib/schemas';

export default function NewGroupModal({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(groupSchema), defaultValues: { name: '', description: '' } });

  const close = () => { reset(); setMembers([]); onClose(); };
  const onSubmit = async (values) => {
    if (!members.length) { toast.error('Add at least one member'); return; }
    setBusy(true);
    try {
      const conv = await dispatch(createGroupChat({ ...values, memberIds: members.map((m) => m._id) })).unwrap();
      close();
      navigate(`/app/chat/${conv._id}`);
    } catch (e) { toast.error(e?.message || 'Could not create the group'); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={close} title="New group" description="Groups can have up to 256 people." size="md"
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button loading={busy} onClick={handleSubmit(onSubmit)}>Create group</Button></>}>
      <div className="space-y-3">
        <Input label="Group name" placeholder="Weekend hikers" error={errors.name?.message} {...register('name')} />
        <Input label="Description (optional)" placeholder="What is this group for?" error={errors.description?.message} {...register('description')} />
        <div>
          <span className="mb-1.5 block text-sm font-medium">Members</span>
          <UserPicker selected={members} onToggle={(u) => setMembers((s) => (s.some((x) => x._id === u._id) ? s.filter((x) => x._id !== u._id) : [...s, u]))} />
        </div>
      </div>
    </Modal>
  );
}
