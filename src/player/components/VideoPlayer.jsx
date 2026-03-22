import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';

function isMpegTS(url) {
  return /\.ts(\?|$)/i.test(url);
}

const HTTP_ERROR_MESSAGES = {
  401: 'Invalid credentials',
  403: 'Access denied',
  456: 'Connection limit reached. Close other streams using this account',
};

export default function VideoPlayer({ channel, userAgent, onVideoRef, onPlayStateChange, onError }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const mpegtsRef = useRef(null);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const retryTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const stallWatcherRef = useRef(null);
  const lastTimeRef = useRef(null);

  const clearAllTimers = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (stallWatcherRef.current) {
      clearInterval(stallWatcherRef.current);
      stallWatcherRef.current = null;
    }
  };

  const startStallWatcher = (isSilentRetry = false) => {
    if (stallWatcherRef.current) return;
    lastTimeRef.current = null;
    stallWatcherRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;
      if (lastTimeRef.current !== null && video.currentTime === lastTimeRef.current) {
        clearInterval(stallWatcherRef.current);
        stallWatcherRef.current = null;
        if (!isSilentRetry) {
          console.warn('[stall watcher] currentTime frozen at', video.currentTime, '— silent retry');
          destroyPlayers();
          loadStream(channel.url, video);
          startStallWatcher(true);
        } else {
          console.warn('[stall watcher] still frozen after silent retry — showing reconnect overlay');
          setShowErrorOverlay(true);
          setErrorMessage(null);
          if (onError) onError(true);
          startBufferStalledRetry();
        }
      }
      lastTimeRef.current = video.currentTime;
    }, 3000);
  };

  const destroyPlayers = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }
  };

  const handleRetry = () => {
    clearAllTimers();
    setShowErrorOverlay(false);
    setCountdown(5);
    destroyPlayers();

    const video = videoRef.current;
    if (!video || !channel) return;
    loadStream(channel.url, video);
  };

  const startBufferStalledRetry = () => {
    setCountdown(5);

    let count = 5;
    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }, 1000);

    retryTimerRef.current = setTimeout(() => {
      handleRetry();
    }, 5000);
  };

  const playWithErrorHandler = (playable) => {
    playable.play().catch(e => {
      if (e.name === 'AbortError') return;
      console.error('Playback error:', e);
      onPlayStateChange?.(false);
    });
  };

  const handleStreamError = (httpStatus, logLabel) => {
    const knownMsg = HTTP_ERROR_MESSAGES[httpStatus];
    if (knownMsg) {
      destroyPlayers();
      setShowErrorOverlay(true);
      setErrorMessage(knownMsg);
      if (onError) onError(true);
      return;
    }

    const video = videoRef.current;
    const hasBuffer = video && video.buffered.length > 0 &&
                     video.buffered.end(video.buffered.length - 1) > video.currentTime;
    const isPlaying = video && !video.paused && !video.ended && video.readyState > 2;

    if (hasBuffer && isPlaying) {
      console.log(`${logLabel} error, silently retrying...`);
      retryTimerRef.current = setTimeout(() => { handleRetry(); }, 2000);
    } else {
      setShowErrorOverlay(true);
      setErrorMessage(null);
      if (onError) onError(true);
      startBufferStalledRetry();
    }
  };

  const handleHLSError = (_event, data) => {
    if (!data.fatal) return;
    console.error('HLS error:', data);
    handleStreamError(data.response?.code, 'HLS');
  };

  const handleMpegTSError = (errType, errDetail) => {
    console.error('MPEG-TS error:', errType, errDetail);
    handleStreamError(errDetail?.code, 'MPEG-TS');
  };

  const loadMpegTS = (url, video) => {
    if (!mpegts.isSupported()) {
      setShowErrorOverlay(true);
      if (onError) onError(true);
      return;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }
    const player = mpegts.createPlayer({ type: 'mpegts', url, isLive: true });
    player.attachMediaElement(video);
    player.load();
    player.on(mpegts.Events.ERROR, handleMpegTSError);
    playWithErrorHandler(player);
    mpegtsRef.current = player;
  };

  const loadHLS = (url, video) => {
    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => playWithErrorHandler(video));
      hls.on(Hls.Events.ERROR, handleHLSError);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => playWithErrorHandler(video), { once: true });
    } else {
      setShowErrorOverlay(true);
      if (onError) onError(true);
    }
  };

  const loadStream = (url, video) => {
    if (isMpegTS(url)) loadMpegTS(url, video);
    else loadHLS(url, video);
  };

  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  useEffect(() => {
    if (!channel || !videoRef.current) return;

    clearAllTimers();
    setShowErrorOverlay(false);
    setErrorMessage(null);
    setCountdown(5);
    const video = videoRef.current;

    loadStream(channel.url, video);

    return () => {
      clearAllTimers();
      destroyPlayers();
    };
  }, [channel, onPlayStateChange]);

  // Track play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => onPlayStateChange?.(true);
    const handlePause = () => {
      onPlayStateChange?.(false);
      if (stallWatcherRef.current) {
        clearInterval(stallWatcherRef.current);
        stallWatcherRef.current = null;
      }
    };
    const handlePlaying = () => {
      setShowErrorOverlay(prev => {
        if (prev) {
          clearAllTimers();
          setCountdown(5);
        }
        return false;
      });
      if (onError) onError(false);
      startStallWatcher();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [onPlayStateChange, channel]);

  return (
    <div className="video-container">
      {/* muted required for autoplay policy; unmuted on first user interaction */}
      <video
        ref={videoRef}
        className="video-element"
        autoPlay
        muted
      />
      {showErrorOverlay && (
        <div className="video-error">
          {errorMessage ? (
            <div className="video-error-card error-fatal">
              <div className="video-error-icon icon-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="video-error-title">{errorMessage}</p>
            </div>
          ) : (
            <div className="video-error-card error-reconnecting">
              <div className="video-error-icon icon-reconnecting">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                </svg>
              </div>
              <p className="video-error-title">Reconnecting</p>
              <p className="video-error-subtitle">Retrying in</p>
              <p className="video-error-countdown">{countdown}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
