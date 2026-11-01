import { useEffect, useRef, useState } from 'react';
import { trainingApi } from '../api/training';

interface VideoPlayerProps {
  resourceId: string;
  videoUrl: string;
  title: string;
  onEnded?: () => void;
}

export default function VideoPlayer({ resourceId, videoUrl, title, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedPosition, setSavedPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentPos, setCurrentPos] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'stale'>('idle');
  const lastSaveTimeRef = useRef<number>(0);

  // Load initial progress
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    trainingApi
      .getVideoProgress(resourceId)
      .then((data: any) => {
        if (!active) return;
        if (data && data.lastPosition > 0) {
          const resumeAt = Math.max(0, data.lastPosition - 2); // 2s context rewind
          setSavedPosition(resumeAt);
        }
      })
      .catch((err: any) => {
        console.warn('Could not load saved video progress:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [resourceId]);

  // Apply saved position once video metadata is ready
  const handleLoadedMetadata = () => {
    setLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      if (savedPosition > 0 && savedPosition < videoRef.current.duration) {
        videoRef.current.currentTime = savedPosition;
      }
    }
  };

  const saveProgress = async (pos: number, dur: number) => {
    if (!pos && pos !== 0) return;
    setSyncStatus('saving');
    try {
      const res = await trainingApi.saveVideoProgress(resourceId, {
        position: Math.floor(pos),
        duration: Math.floor(dur || 0),
        clientUpdatedAt: new Date().toISOString(),
      });
      if (res?.stale) {
        setSyncStatus('stale');
      } else {
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (e) {
      console.warn('Failed to save video progress:', e);
      setSyncStatus('idle');
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const now = videoRef.current.currentTime;
    setCurrentPos(now);

    // Save every 10 seconds of playback
    const wallNow = Date.now();
    if (wallNow - lastSaveTimeRef.current >= 10000) {
      lastSaveTimeRef.current = wallNow;
      saveProgress(now, videoRef.current.duration || duration);
    }
  };

  const handlePause = () => {
    if (!videoRef.current) return;
    saveProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
  };

  const handleEnded = () => {
    if (!videoRef.current) return;
    saveProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
    if (onEnded) onEnded();
  };

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '15px', color: '#e2e8f0' }}>📹 {title}</h4>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          {syncStatus === 'saving' && <span>💾 Saving progress...</span>}
          {syncStatus === 'saved' && <span style={{ color: '#4ade80' }}>✓ Progress saved</span>}
          {syncStatus === 'stale' && <span style={{ color: '#facc15' }}>⚠️ Out of sync</span>}
          {syncStatus === 'idle' && duration > 0 && (
            <span>
              {formatTime(currentPos)} / {formatTime(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.7)',
              zIndex: 2,
            }}
          >
            <p style={{ color: '#fff', fontSize: '14px' }}>Loading video stream...</p>
          </div>
        )}

        {error ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: '#1e293b' }}>
            <p style={{ color: '#f87171', marginBottom: '8px' }}>⚠️ {error}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              The video stream could not be loaded or is in an unsupported format.
            </p>
            <div style={{ marginTop: '14px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  if (videoRef.current) videoRef.current.load();
                }}
                style={{
                  padding: '6px 14px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '6px 14px',
                  background: '#334155',
                  color: '#f8fafc',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                Open in New Tab
              </a>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePause}
            onEnded={handleEnded}
            onError={() => setError('Failed to play video. Please retry or download directly.')}
            style={{ width: '100%', maxHeight: '420px', display: 'block' }}
          />
        )}
      </div>

      {/* Competency Guard Notice (Challenge 57 / 61) */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#93c5fd',
          lineHeight: '1.5',
        }}
      >
        <strong>Competency Requirement:</strong> Watching this video records your playback position, but{' '}
        <strong>does not complete the module</strong>. To earn module completion, you must pass the associated assessment or
        coding challenge.
      </div>
    </div>
  );
}

