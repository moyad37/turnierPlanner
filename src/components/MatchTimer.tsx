// ============================================
// Match Timer Komponente
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface MatchTimerProps {
  duration: number; // Minuten
  matchId: string;
  onTimeUp?: () => void;
  compact?: boolean;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  duration,
  matchId,
  onTimeUp,
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timer when matchId or duration changes
  useEffect(() => {
    setTimeLeft(duration * 60);
    setIsRunning(false);
    setHasEnded(false);
  }, [matchId, duration]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setHasEnded(true);
            onTimeUp?.();
            // Play sound
            playEndSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onTimeUp]);

  const playEndSound = useCallback(() => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
      
      // Play 3 beeps
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 800;
        gain2.gain.setValueAtTime(0.5, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start();
        osc2.stop(audioContext.currentTime + 0.5);
      }, 300);
      
      setTimeout(() => {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.value = 1000;
        gain3.gain.setValueAtTime(0.5, audioContext.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        osc3.start();
        osc3.stop(audioContext.currentTime + 1);
      }, 600);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const toggleTimer = useCallback(() => {
    if (hasEnded) {
      // Reset
      setTimeLeft(duration * 60);
      setHasEnded(false);
      setIsRunning(false);
    } else {
      setIsRunning(prev => !prev);
    }
  }, [hasEnded, duration]);

  const resetTimer = useCallback(() => {
    setTimeLeft(duration * 60);
    setIsRunning(false);
    setHasEnded(false);
  }, [duration]);

  const addTime = useCallback((seconds: number) => {
    setTimeLeft(prev => Math.max(0, prev + seconds));
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;
  const isLowTime = timeLeft <= 60 && timeLeft > 0;
  const isVeryLowTime = timeLeft <= 10 && timeLeft > 0;

  if (compact) {
    return (
      <div className={`timer-compact ${isRunning ? 'running' : ''} ${hasEnded ? 'ended' : ''} ${isLowTime ? 'low-time' : ''}`}>
        <span className="timer-display">{formatTime(timeLeft)}</span>
        <button 
          type="button" 
          className="timer-btn-sm"
          onClick={toggleTimer}
        >
          {hasEnded ? '↺' : isRunning ? '⏸' : '▶'}
        </button>
      </div>
    );
  }

  return (
    <div className={`match-timer ${hasEnded ? 'ended' : ''} ${isLowTime ? 'low-time' : ''} ${isVeryLowTime ? 'very-low-time' : ''}`}>
      {/* Progress Bar */}
      <div className="timer-progress-bar">
        <div 
          className="timer-progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time Display */}
      <div className="timer-display-large">
        {formatTime(timeLeft)}
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button 
          type="button" 
          className="timer-btn"
          onClick={() => addTime(-30)}
          disabled={timeLeft < 30}
        >
          -30s
        </button>
        
        <button 
          type="button" 
          className={`timer-btn timer-btn-main ${isRunning ? 'pause' : 'start'}`}
          onClick={toggleTimer}
        >
          {hasEnded ? '↺ Reset' : isRunning ? '⏸ Pause' : '▶ Start'}
        </button>
        
        <button 
          type="button" 
          className="timer-btn"
          onClick={() => addTime(30)}
        >
          +30s
        </button>
      </div>

      {/* Quick Reset */}
      {(isRunning || timeLeft !== duration * 60) && !hasEnded && (
        <button 
          type="button" 
          className="timer-reset-btn"
          onClick={resetTimer}
        >
          ↺ Zurücksetzen
        </button>
      )}
    </div>
  );
};

// Big Screen Timer für Beamer/TV
export const BigScreenTimer: React.FC<{
  duration: number;
  matchInfo?: string;
}> = ({ duration, matchInfo }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="big-screen-timer">
      {matchInfo && <div className="big-timer-info">{matchInfo}</div>}
      <div className={`big-timer-display ${timeLeft <= 60 ? 'warning' : ''} ${timeLeft <= 10 ? 'danger' : ''}`}>
        {formatTime(timeLeft)}
      </div>
      <div className="big-timer-controls">
        <button onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? '⏸ PAUSE' : '▶ START'}
        </button>
        <button onClick={() => { setTimeLeft(duration * 60); setIsRunning(false); }}>
          ↺ RESET
        </button>
      </div>
    </div>
  );
};
