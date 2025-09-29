// components/VideoPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions, Alert } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useScale } from '@/hooks/useScale';
import { VideoData, AdData, VideoService } from '@/services/VideoService';

interface VideoPlayerProps {
  video: VideoData;
  onVideoEnd?: () => void;
  onBack?: () => void;
}

export function VideoPlayer({ video, onVideoEnd, onBack }: VideoPlayerProps) {
  const scale = useScale();
  const styles = useVideoPlayerStyles();
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [currentAd, setCurrentAd] = useState<AdData | null>(null);
  const [adSkipTimer, setAdSkipTimer] = useState(0);
  const [canSkipAd, setCanSkipAd] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  
  const adIntervalRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const adTimerRef = useRef<number | null>(null);
  const skipTimerRef = useRef<number | null>(null);

  // Main video player
  const mainPlayer = useVideoPlayer(video.videoSource, (player) => {
    player.loop = false;
    player.play();
    setPlayerReady(true);
  });

  // Ad video player  
  const adPlayer = useVideoPlayer(null, (player) => {
    player.loop = false;
  });

  useEffect(() => {
    if (!playerReady) return;

    // Schedule random ads every 2-3 minutes during video playback
    const scheduleAds = () => {
      adIntervalRef.current = setTimeout(() => {
        if (!showAd && isPlaying && currentTime > 30) { // Wait at least 30 seconds
          playRandomAd();
        }
        scheduleAds();
      }, (90 + Math.random() * 60) * 1000); // 1.5-2.5 minutes
    };

    scheduleAds();

    return () => {
      if (adIntervalRef.current) clearTimeout(adIntervalRef.current);
    };
  }, [showAd, isPlaying, currentTime, playerReady]);

  useEffect(() => {
    // Auto-hide controls after 4 seconds
    if (showControls && isPlaying && !showAd) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
    
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showControls, isPlaying, showAd]);

  useEffect(() => {
    // Track video time progress
    if (mainPlayer && isPlaying && !showAd) {
      const interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [mainPlayer, isPlaying, showAd]);

  const playRandomAd = () => {
    try {
      const ad = VideoService.getRandomAd();
      setCurrentAd(ad);
      setShowAd(true);
      setAdSkipTimer(0);
      setCanSkipAd(false);
      
      // Pause main video
      mainPlayer.pause();
      setIsPlaying(false);
      
      // Load and play ad
      adPlayer.replace(ad.videoSource);
      adPlayer.play();

      // Start skip countdown
      skipTimerRef.current = setInterval(() => {
        setAdSkipTimer(prev => {
          const newTime = prev + 1;
          if (newTime >= ad.skipAfter) {
            setCanSkipAd(true);
            if (skipTimerRef.current) clearInterval(skipTimerRef.current);
          }
          return newTime;
        });
      }, 1000);

      // Auto-end ad after duration
      adTimerRef.current = setTimeout(() => {
        endAd();
      }, ad.duration * 1000);
      
    } catch (error) {
      console.error('Error playing ad:', error);
      // If ad fails, continue with main video
      setShowAd(false);
    }
  };

  const endAd = () => {
    setShowAd(false);
    setCurrentAd(null);
    setAdSkipTimer(0);
    setCanSkipAd(false);
    
    // Clear timers
    if (adTimerRef.current) clearTimeout(adTimerRef.current);
    if (skipTimerRef.current) clearInterval(skipTimerRef.current);
    
    // Resume main video
    adPlayer.pause();
    mainPlayer.play();
    setIsPlaying(true);
  };

  const skipAd = () => {
    if (canSkipAd) {
      endAd();
    }
  };

  const togglePlayPause = () => {
    if (showAd) {
      return; // Don't allow control during ads
    }
    
    if (isPlaying) {
      mainPlayer.pause();
    } else {
      mainPlayer.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePress = () => {
    if (!showAd) {
      setShowControls(true);
    }
  };

const cleanupTimers = () => {
    if (adIntervalRef.current) {
      clearTimeout(adIntervalRef.current);
      adIntervalRef.current = null;
    }
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
      adTimerRef.current = null;
    }
    if (skipTimerRef.current) {
      clearInterval(skipTimerRef.current);
      skipTimerRef.current = null;
    }
  };

  const handleBack = () => {
    cleanupTimers();
    mainPlayer.pause();
    adPlayer.pause();
    if (onBack) onBack();
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showAd && currentAd) {
    return (
      <View style={styles.container}>
        <VideoView
          style={styles.video}
          player={adPlayer}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
        
        <View style={styles.adOverlay}>
          <View style={styles.adBanner}>
            <Text style={styles.adLabel}>Advertisement</Text>
            <Text style={styles.adTitle}>{currentAd.title}</Text>
          </View>
          
          <View style={styles.adControls}>
            {canSkipAd ? (
              <Pressable 
                style={[styles.skipButton, styles.skipButtonActive]}
                onPress={skipAd}
              >
                <Text style={styles.skipText}>Skip Ad</Text>
                <Ionicons name="play-forward" size={20 * scale} color="#fff" />
              </Pressable>
            ) : (
              <View style={styles.skipButton}>
                <Text style={styles.skipText}>
                  Skip in {currentAd.skipAfter - adSkipTimer}s
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <VideoView
        style={styles.video}
        player={mainPlayer}
        allowsFullscreen={true}
        allowsPictureInPicture={false}
      />
      
      {showControls && (
        <View style={styles.controlsOverlay}>
          <View style={styles.topControls}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24 * scale} color="#fff" />
            </Pressable>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <Text style={styles.videoDescription}>{video.description}</Text>
              <Text style={styles.videoTime}>
                {formatTime(currentTime)} / {formatTime(video.duration)}
              </Text>
            </View>
          </View>

          <View style={styles.centerControls}>
            <Pressable style={styles.playButton} onPress={togglePlayPause}>
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={48 * scale} 
                color="#fff" 
              />
            </Pressable>
          </View>

          <View style={styles.bottomControls}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(currentTime / video.duration) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const useVideoPlayerStyles = () => {
  const scale = useScale();
  const { width, height } = Dimensions.get('window');
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    video: {
      width: width,
      height: height,
    },
    controlsOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'space-between',
      padding: 20 * scale,
    },
    topControls: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 15 * scale,
    },
    backButton: {
      padding: 12 * scale,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 25 * scale,
    },
    videoInfo: {
      flex: 1,
    },
    videoTitle: {
      fontSize: 28 * scale,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 8 * scale,
    },
    videoDescription: {
      fontSize: 18 * scale,
      color: '#ddd',
      marginBottom: 8 * scale,
    },
    videoTime: {
      fontSize: 16 * scale,
      color: '#bbb',
    },
    centerControls: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{ translateX: -40 * scale }, { translateY: -40 * scale }],
    },
    playButton: {
      width: 80 * scale,
      height: 80 * scale,
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderRadius: 40 * scale,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomControls: {
      alignItems: 'center',
    },
    progressBar: {
      width: '100%',
      height: 4 * scale,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 2 * scale,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#007AFF',
      borderRadius: 2 * scale,
    },
    adOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      padding: 20 * scale,
    },
    adBanner: {
      backgroundColor: 'rgba(255,193,7,0.95)',
      padding: 15 * scale,
      borderRadius: 12 * scale,
      alignSelf: 'flex-start',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    adLabel: {
      fontSize: 14 * scale,
      fontWeight: 'bold',
      color: '#333',
      textTransform: 'uppercase',
    },
    adTitle: {
      fontSize: 20 * scale,
      fontWeight: 'bold',
      color: '#333',
      marginTop: 5 * scale,
    },
    adControls: {
      alignItems: 'flex-end',
    },
    skipButton: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 15 * scale,
      borderRadius: 12 * scale,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10 * scale,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    skipButtonActive: {
      backgroundColor: 'rgba(0,122,255,0.9)',
    },
    skipText: {
      fontSize: 16 * scale,
      color: '#fff',
      fontWeight: 'bold',
    },
  });
};
