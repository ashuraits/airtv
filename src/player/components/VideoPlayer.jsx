import React, { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ channel, userAgent, onVideoRef, onPlayStateChange, onError }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [bufferStalled, setBufferStalled] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const retryTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const clearAllTimers = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const handleRetry = () => {
    clearAllTimers();
    setBufferStalled(false);
    setCountdown(5);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Reload stream without full page reload
    const video = videoRef.current;
    if (video && channel) {
      if (window.Hls && window.Hls.isSupported()) {
        const hlsConfig = {
          enableWorker: true,
          lowLatencyMode: true,
        };

        // Apply custom User-Agent if provided
        if (userAgent) {
          hlsConfig.xhrSetup = function(xhr) {
            xhr.setRequestHeader('User-Agent', userAgent);
          };
        }

        const hls = new window.Hls(hlsConfig);
        hls.loadSource(channel.url);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.error('Playback error:', e));
        });

        hls.on(window.Hls.Events.ERROR, handleHLSError);
      }
    }
  };

  const startBufferStalledRetry = () => {
    setCountdown(5);

    // Start countdown
    let count = 5;
    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }, 1000);

    // Retry after 5 seconds
    retryTimerRef.current = setTimeout(() => {
      handleRetry();
    }, 5000);
  };

  const handleHLSError = (_event, data) => {
    if (data.fatal) {
      const video = videoRef.current;
      const hasBuffer = video && video.buffered.length > 0 &&
                       video.buffered.end(video.buffered.length - 1) > video.currentTime;
      const isPlaying = video && !video.paused && !video.ended && video.readyState > 2;

      if (hasBuffer && isPlaying) {
        // Stream error but video still playing - silent retry
        console.log('Stream error, silently retrying in background...');

        retryTimerRef.current = setTimeout(() => {
          handleRetry();
        }, 2000);
      } else {
        // Video stopped or never started - show message and auto-retry
        setBufferStalled(true);
        if (onError) onError(true);
        console.error('Stream failed to load, retrying in 5 seconds...', data);
        startBufferStalledRetry();
      }
    }
  };

  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  useEffect(() => {
    if (!channel || !videoRef.current) return;

    clearAllTimers();
    setBufferStalled(false);
    setCountdown(5);
    const video = videoRef.current;

    // Load HLS.js dynamically
    const loadHLS = async () => {
      // HLS.js is loaded via CDN in player.html
      if (window.Hls && window.Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hlsConfig = {
          enableWorker: true,
          lowLatencyMode: true,
        };

        // Apply custom User-Agent if provided
        if (userAgent) {
          hlsConfig.xhrSetup = function(xhr) {
            xhr.setRequestHeader('User-Agent', userAgent);
          };
        }

        const hls = new window.Hls(hlsConfig);

        hls.loadSource(channel.url);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => {
            console.error('Playback error:', e);
            onPlayStateChange?.(false);
          });
        });

        hls.on(window.Hls.Events.ERROR, handleHLSError);

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
        setBufferStalled(true);
        if (onError) onError(true);
      }
    };

    loadHLS();

    return () => {
      clearAllTimers();
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
      {bufferStalled && (
        <div className="video-error">
          <p>Reconnecting...</p>
          <p style={{ fontSize: '24px', marginTop: '12px', fontWeight: 'bold' }}>
            {countdown}
          </p>
        </div>
      )}
    </div>
  );
}
