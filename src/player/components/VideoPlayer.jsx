import React, { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ channel, onVideoRef, onPlayStateChange }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  useEffect(() => {
    if (!channel || !videoRef.current) return;

    setError(false);
    const video = videoRef.current;

    // Load HLS.js dynamically
    const loadHLS = async () => {
      // HLS.js is loaded via CDN in player.html
      if (window.Hls && window.Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.loadSource(channel.url);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => {
            console.error('Playback error:', e);
            onPlayStateChange?.(false);
          });
        });

        hls.on(window.Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setError(true);
            console.error('HLS Error:', data);
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = channel.url;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => {
            console.error('Playback error:', e);
            onPlayStateChange?.(false);
          });
        });
      } else {
        setError(true);
      }
    };

    loadHLS();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [channel, onPlayStateChange]);

  // Track play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => onPlayStateChange?.(true);
    const handlePause = () => onPlayStateChange?.(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onPlayStateChange]);

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        className="video-element"
        autoPlay
      />
      {error && (
        <div className="video-error">
          <p>Failed to load stream</p>
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            Please check the stream URL
          </p>
        </div>
      )}
    </div>
  );
}
