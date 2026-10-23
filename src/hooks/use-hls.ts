'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export type HlsStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export function useHls(streamUrl: string) {
  const [status, setStatus] = useState<HlsStatus>('connecting');
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const initStream = useCallback(
    (video: HTMLVideoElement) => {
      cleanup();

      if (!streamUrl) {
        setStatus('offline');
        return;
      }

      setStatus('connecting');

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false, // Standard HLS prevents socket flooding
          backBufferLength: 10,
          maxBufferLength: 6,
          maxMaxBufferLength: 10,
        });

        hlsRef.current = hls;
        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(streamUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video
            .play()
            .then(() => setStatus('live'))
            .catch(() => {
              // Wait for user interaction if browser policy blocks autoplay
              setStatus('live');
            });
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('[HLS] Network glitch, recovering...');
                setStatus('reconnecting');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('[HLS] Media buffer glitch, recovering...');
                setStatus('reconnecting');
                hls.recoverMediaError();
                break;
              default:
                console.error('[HLS] Fatal error, retrying in 3s:', data);
                setStatus('offline');
                cleanup();
                retryTimerRef.current = setTimeout(() => {
                  if (videoElementRef.current) {
                    initStream(videoElementRef.current);
                  }
                }, 3000);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari fallback
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          video
            .play()
            .then(() => setStatus('live'))
            .catch(() => setStatus('live'));
        });
        video.addEventListener('waiting', () => setStatus('reconnecting'));
        video.addEventListener('playing', () => setStatus('live'));
        video.addEventListener('error', () => setStatus('offline'));
      } else {
        setStatus('offline');
      }
    },
    [streamUrl, cleanup]
  );

  const attachVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElementRef.current = node;
      if (node) {
        initStream(node);
      } else {
        cleanup();
      }
    },
    [initStream, cleanup]
  );

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { status, attachVideo };
}