import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { chatService } from '../services/chatService';
import { errorMessage, formatBytes, uid } from '../lib/utils';

const MAX_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 10;

/** Staging area for attachments: uploads start immediately (with progress) so "send" is instant. */
export function useUploads() {
  const [items, setItems] = useState([]);
  const countRef = useRef(0);

  const patch = (id, changes) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  const addFiles = useCallback((fileList) => {
    for (const file of Array.from(fileList || [])) {
      if (countRef.current >= MAX_FILES) { toast.error(`You can attach up to ${MAX_FILES} files at once`); break; }
      if (file.size > MAX_SIZE) { toast.error(`${file.name} is ${formatBytes(file.size)} - the limit is 25 MB`); continue; }
      const id = uid();
      countRef.current += 1;
      setItems((list) => [...list, { id, file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, progress: 0, status: 'uploading' }]);
      chatService
        .upload([file], (p) => patch(id, { progress: p }))
        .then(({ data }) => patch(id, { status: 'done', progress: 100, result: data.files[0] }))
        .catch((e) => { patch(id, { status: 'error' }); toast.error(errorMessage(e, `Could not upload ${file.name}`)); });
    }
  }, []);

  const revoke = (i) => i.preview && URL.revokeObjectURL(i.preview);

  const remove = useCallback((id) => {
    countRef.current = Math.max(0, countRef.current - 1);
    setItems((list) => { list.filter((i) => i.id === id).forEach(revoke); return list.filter((i) => i.id !== id); });
  }, []);

  const clear = useCallback(() => {
    countRef.current = 0;
    setItems((list) => { list.forEach(revoke); return []; });
  }, []);

  return {
    items,
    addFiles,
    remove,
    clear,
    uploading: items.some((i) => i.status === 'uploading'),
    results: () => items.filter((i) => i.status === 'done').map((i) => i.result),
  };
}
