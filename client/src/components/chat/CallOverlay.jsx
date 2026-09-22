import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mic, MicOff, Phone, PhoneOff, ScreenShare, ScreenShareOff, Video, VideoOff } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useCall } from '../../hooks/useCall';
import { playPing } from '../../lib/sound';
import { cn, formatDuration } from '../../lib/utils';

function CircleButton({ label, onClick, active = true, danger, accept, children }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cn('flex h-14 w-14 items-center justify-center rounded-full text-white transition hover:scale-105', danger ? 'bg-coral shadow-[0_8px_24px_-6px_rgb(244_63_94/0.7)]' : accept ? 'bg-emerald-500 shadow-[0_8px_24px_-6px_rgb(16_185_129/0.7)]' : active ? 'bg-white/15 hover:bg-white/25' : 'bg-white text-slate-900')}>
      {children}
    </button>
  );
}

const Video_ = ({ stream, muted = true, className }) => (
  <video ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }} autoPlay playsInline muted={muted} className={className} />
);

/**
 * Full-screen call UI: ringing, in-call controls, camera preview and screen sharing.
 * Signalling (ring/accept/decline/end) goes through Socket.IO. Local camera/mic/screen streams are real;
 * streaming them to the other person needs a WebRTC peer connection (see README "Calls").
 */
export default function CallOverlay() {
  const call = useSelector((s) => s.ui.call);
  const { accept, decline, end } = useCall();
  const [camStream, setCamStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const camRef = useRef(null);
  const screenRef = useRef(null);

  const mediaActive = Boolean(call && call.status !== 'incoming');
  const isVideo = call?.type === 'video';

  // Acquire the camera/microphone once the call is placed or accepted; release everything when it ends.
  useEffect(() => {
    if (!mediaActive) return undefined;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ audio: true, video: isVideo })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        camRef.current = stream;
        setCamStream(stream);
      })
      .catch(() => toast('Could not access your microphone or camera'));
    return () => {
      cancelled = true;
      camRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
      camRef.current = null; screenRef.current = null;
      setCamStream(null); setScreenStream(null); setMuted(false); setCamOff(false);
    };
  }, [mediaActive, isVideo]);

  // Ring tone while incoming; give up on unanswered outgoing calls after 45s.
  useEffect(() => {
    if (call?.status !== 'incoming') return undefined;
    playPing();
    const t = setInterval(playPing, 2200);
    return () => clearInterval(t);
  }, [call?.status]);

  useEffect(() => {
    if (call?.status !== 'outgoing') return undefined;
    const t = setTimeout(() => { toast('No answer'); end(); }, 45000);
    return () => clearTimeout(t);
  }, [call?.status, call?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (call?.status !== 'connected') { setElapsed(0); return undefined; }
    const tick = () => setElapsed(Math.floor((Date.now() - call.startedAt) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [call?.status, call?.startedAt]);

  const toggleMic = () => { camRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; }); setMuted((m) => !m); };
  const toggleCam = () => { camRef.current?.getVideoTracks().forEach((t) => { t.enabled = camOff; }); setCamOff((c) => !c); };

  const stopScreen = () => { screenRef.current?.getTracks().forEach((t) => t.stop()); screenRef.current = null; setScreenStream(null); };
  const toggleScreen = async () => {
    if (screenStream) { stopScreen(); return; }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenRef.current = stream;
      setScreenStream(stream);
      stream.getVideoTracks()[0].onended = stopScreen; // user clicked the browser's "Stop sharing"
    } catch { /* cancelled */ }
  };

  const peer = call?.peer;
  const status = call?.status;

  return (
    <AnimatePresence>
      {call && (
        <motion.div className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#070814] text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Call">
          <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: 'radial-gradient(60rem 40rem at 20% 10%, rgb(124 92 255 / .45), transparent 60%), radial-gradient(50rem 40rem at 90% 90%, rgb(45 212 191 / .30), transparent 60%)' }} />

          <div className="relative flex flex-1 flex-col items-center justify-center p-6 text-center">
            {status === 'connected' && screenStream ? (
              <Video_ stream={screenStream} className="max-h-[68vh] w-full max-w-4xl rounded-3xl bg-black object-contain shadow-pop" />
            ) : (
              <div className="relative">
                {status !== 'connected' && <><span className="absolute inset-0 animate-ring rounded-full bg-white/30" /><span className="absolute inset-0 animate-ring rounded-full bg-white/20 [animation-delay:.6s]" /></>}
                <Avatar src={peer?.avatar?.url} name={peer?.name} size="2xl" className="relative h-36 w-36 text-5xl" />
              </div>
            )}
            <h2 className="mt-6 text-3xl font-bold">{peer?.name}</h2>
            <p className="mt-1 text-white/70">
              {status === 'incoming' && `Incoming ${isVideo ? 'video' : 'voice'} call…`}
              {status === 'outgoing' && 'Calling…'}
              {status === 'connected' && <span className="tabular-nums">{formatDuration(elapsed)}</span>}
            </p>
            {status === 'connected' && (
              <p className="mt-4 max-w-sm rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/70">Camera and screen previews are local. Add a WebRTC layer to stream them to {peer?.name?.split(' ')[0]}.</p>
            )}
          </div>

          {/* Self view */}
          {mediaActive && isVideo && camStream && !camOff && (
            <Video_ stream={camStream} className="absolute bottom-28 right-4 h-40 w-28 -scale-x-100 rounded-2xl border border-white/20 bg-black object-cover shadow-pop sm:h-48 sm:w-36" />
          )}

          <div className="pb-safe relative flex items-center justify-center gap-4 p-6">
            {status === 'incoming' ? (
              <>
                <CircleButton label="Decline" danger onClick={decline}><PhoneOff className="h-6 w-6" /></CircleButton>
                <CircleButton label="Accept" accept onClick={accept}>{isVideo ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}</CircleButton>
              </>
            ) : (
              <>
                <CircleButton label={muted ? 'Unmute' : 'Mute'} active={!muted} onClick={toggleMic}>{muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}</CircleButton>
                {isVideo && <CircleButton label={camOff ? 'Turn camera on' : 'Turn camera off'} active={!camOff} onClick={toggleCam}>{camOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}</CircleButton>}
                {status === 'connected' && <CircleButton label={screenStream ? 'Stop sharing' : 'Share screen'} active={!screenStream} onClick={toggleScreen}>{screenStream ? <ScreenShareOff className="h-6 w-6" /> : <ScreenShare className="h-6 w-6" />}</CircleButton>}
                <CircleButton label={status === 'outgoing' ? 'Cancel call' : 'End call'} danger onClick={end}><PhoneOff className="h-6 w-6" /></CircleButton>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
