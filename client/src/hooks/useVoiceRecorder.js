import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

// Records microphone audio with MediaRecorder. stop() resolves with { file, duration } ready to upload.
export function useVoiceRecorder() {
  const [isRecording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const stream = useRef(null);
  const startedAt = useRef(0);

  const cleanup = () => {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
    setRecording(false);
    setSeconds(0);
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser');
      return false;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.start();
      recorder.current = rec;
      startedAt.current = Date.now();
      setRecording(true);
      timer.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
      return true;
    } catch {
      toast.error('Allow microphone access to record voice messages');
      return false;
    }
  };

  const stop = () =>
    new Promise((resolve) => {
      const rec = recorder.current;
      if (!rec) return resolve(null);
      const duration = (Date.now() - startedAt.current) / 1000;
      rec.onstop = () => {
        const type = (rec.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks.current, { type });
        cleanup();
        resolve({ file: new File([blob], `voice-message.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type }), duration });
      };
      rec.stop();
    });

  const cancel = () => {
    const rec = recorder.current;
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); }
    cleanup();
  };

  useEffect(() => () => cancel(), []); // release the microphone if the composer unmounts
  return { isRecording, seconds, start, stop, cancel };
}
