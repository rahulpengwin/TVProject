// components/VideoPlayer.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  Platform,
  BackHandler,
  TouchableOpacity,
  Alert
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useScale } from '@/hooks/useScale';
import { VideoData, AdData, AdSchedule, VideoService } from '@/services/VideoService';

const useTVEventHandler = Platform.isTV
  ? require('react-native').useTVEventHandler
  : (_: any) => {};

interface VideoPlayerProps {
  video: VideoData;
  onVideoEnd?: () => void;
  onBack?: () => void;
  autoPlayAd?: boolean;
  adTypes?: Array<'pre-roll' | 'mid-roll' | 'post-roll'>;
}

export function VideoPlayer({
  video,
  onVideoEnd,
  onBack,
  autoPlayAd = true,
  adTypes = ['pre-roll', 'mid-roll', 'post-roll'],
}: VideoPlayerProps) {
  const scale = useScale();
  const styles = useVideoPlayerStyles();

  // Enhanced state management
  const [mode, setMode] = useState<'loading' | 'ad' | 'main' | 'error'>('loading');
  const [ad, setAd] = useState<AdData | null>(null);
  const [adTimer, setAdTimer] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  // Enhanced ad scheduling state
  const [adSchedule, setAdSchedule] = useState<AdSchedule[]>([]);
  const [currentAdType, setCurrentAdType] = useState<'pre-roll' | 'mid-roll' | 'post-roll'>('pre-roll');
  const [savedPlayTime, setSavedPlayTime] = useState(0); // Save time before ad

  // Timer refs
  const adInterval = useRef<number | null>(null);
  const adTimeout = useRef<number | null>(null);
  const controlsTimeout = useRef<number | null>(null);
  const timeInterval = useRef<number | null>(null);

  // Create video player without initial source
  const player = useVideoPlayer('', (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
  });

  // TV remote handler
  useTVEventHandler((evt: any) => {
    if (!evt) return;
    if (['select', 'playPause'].includes(evt.eventType)) {
      if (mode === 'ad' && canSkip) skipAd();
      else if (mode === 'main') togglePlayPause();
    }
    if (['menu', 'back'].includes(evt.eventType)) {
      handleBack();
    }
  });

  // Initialize video and ad scheduling
  useEffect(() => {
    const initializePlayer = async () => {
      console.log('🎬 Initializing Player for video:', video.title);
      
      // Generate enhanced random ad schedule
      const schedule = VideoService.generateAdSchedule(video);
      setAdSchedule(schedule);
      
      // Increment watch count for ad frequency calculation
      VideoService.incrementVideoWatchCount(video.id);
      
      // Set initial duration
      setDuration(video.duration);
      
      // Start with pre-roll ad or main video
      setTimeout(() => {
        if (autoPlayAd && adTypes.includes('pre-roll')) {
          loadAd('pre-roll');
        } else {
          loadMain();
        }
      }, 300);
    };

    initializePlayer();
  }, [video.id]);

  // Android TV back button handler
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.isTV) {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => handler.remove();
    }
  }, []);

  // Enhanced time tracking with better mid-roll ad detection
  useEffect(() => {
    if (mode === 'main' && isPlaying && isVideoLoaded) {
      timeInterval.current = setInterval(() => {
        const currentPlayerTime = Math.floor(player.currentTime || 0);
        setCurrentTime(currentPlayerTime);
        
        // Check for scheduled mid-roll ads
        if (adTypes.includes('mid-roll')) {
          const nextAd = VideoService.getNextScheduledAd(adSchedule, currentPlayerTime);
          
          if (nextAd) {
            console.log('🎯 Mid-roll ad triggered:', nextAd.ad.title, 'at', currentPlayerTime);
            
            // Mark this ad as triggered
            const updatedSchedule = adSchedule.map(item => 
              item === nextAd ? { ...item, triggered: true } : item
            );
            setAdSchedule(updatedSchedule);
            
            // Save current time and pause main video
            setSavedPlayTime(currentPlayerTime);
            player.pause();
            setIsPlaying(false);
            
            // Load and play the ad
            setTimeout(() => loadAd('mid-roll', nextAd.ad), 500);
          }
        }
        
        // Check for video end
        if (currentPlayerTime >= duration - 2) {
          handleVideoEnd();
        }
      }, 1000) as number;
    } else {
      if (timeInterval.current !== null) {
        clearInterval(timeInterval.current);
        timeInterval.current = null;
      }
    }

    return () => {
      if (timeInterval.current !== null) {
        clearInterval(timeInterval.current);
        timeInterval.current = null;
      }
    };
  }, [mode, isPlaying, isVideoLoaded, duration, adSchedule]);

  // Auto-hide controls
  useEffect(() => {
    if (mode === 'main' && showControls && isPlaying) {
      if (controlsTimeout.current !== null) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => setShowControls(false), 4000) as number;
    }
  }, [mode, showControls, isPlaying]);

  function clearAdTimers() {
    if (adInterval.current !== null) {
      clearInterval(adInterval.current);
      adInterval.current = null;
    }
    if (adTimeout.current !== null) {
      clearTimeout(adTimeout.current);
      adTimeout.current = null;
    }
  }

  // Enhanced ad loading with specific ad support
  async function loadAd(
    type: 'pre-roll' | 'mid-roll' | 'post-roll', 
    specificAd?: AdData
  ) {
    console.log(`▶️ Loading ${type} Ad`);
    
    const selectedAd = specificAd || VideoService.getRandomAd(type, video);
    
    if (!selectedAd) {
      console.log(`No ${type} ad available, proceeding...`);
      if (type === 'pre-roll') {
        loadMain();
      } else if (type === 'mid-roll') {
        // Resume main video immediately if no ad
        resumeMainVideo();
      } else if (type === 'post-roll') {
        onVideoEnd?.();
      }
      return;
    }

    setMode('loading');
    setAd(selectedAd);
    setCurrentAdType(type);
    setAdTimer(0);
    setCanSkip(false);
    setCurrentTime(0);
    setDuration(selectedAd.duration);
    setIsPlaying(false);
    setIsVideoLoaded(false);

    try {
      console.log('🎥 Loading ad video source:', selectedAd.videoSource);
      
      // Use replaceAsync for ad
      await player.replaceAsync(selectedAd.videoSource);
      setIsVideoLoaded(true);
      
      setTimeout(() => {
        setMode('ad');
        player.currentTime = 0;
        player.play();
        setIsPlaying(true);
        startAdCountdown(selectedAd);
        console.log(`▶️ ${type} ad playback started: "${selectedAd.title}"`);
      }, 800);

    } catch (error) {
      console.warn('Ad load error, continuing with content...', error);
      if (type === 'mid-roll') {
        resumeMainVideo();
      } else {
        setTimeout(() => handleAdComplete(), 1000);
      }
    }
  }

  function startAdCountdown(adData: AdData) {
    // Skip countdown timer
    adInterval.current = setInterval(() => {
      setAdTimer(timer => {
        if (timer + 1 >= adData.skipAfter) {
          setCanSkip(true);
        }
        return timer + 1;
      });
    }, 1000) as number;

    // Auto-complete ad timer
    adTimeout.current = setTimeout(() => {
      console.log('⏰ Ad auto-completed');
      handleAdComplete();
    }, adData.duration * 1000) as number;
  }

  function skipAd() {
    if (!canSkip) return;
    console.log('⏭️ Skip Ad');
    clearAdTimers();
    player.pause();
    setIsPlaying(false);
    handleAdComplete();
  }

  function handleAdComplete() {
    console.log('✅ Ad completed, type:', currentAdType);
    clearAdTimers();
    
    if (currentAdType === 'pre-roll') {
      transitionToMain();
    } else if (currentAdType === 'mid-roll') {
      // Resume main video from saved position
      resumeMainVideo();
    } else if (currentAdType === 'post-roll') {
      onVideoEnd?.();
    }
  }

  function transitionToMain() {
    console.log('🔄 Transitioning to Main Video');
    clearAdTimers();
    setMode('loading');
    setAd(null);
    setCanSkip(false);
    setCurrentTime(0);
    setShowControls(false);
    setIsPlaying(false);
    setIsVideoLoaded(false);
    
    setTimeout(() => {
      loadMain();
    }, 500);
  }

  async function resumeMainVideo() {
    console.log('▶️ Resuming Main Video from time:', savedPlayTime);
    clearAdTimers();
    setMode('loading');
    setAd(null);
    setCanSkip(false);
    setShowControls(false);
    setIsVideoLoaded(false);
    
    try {
      // Use replaceAsync for main video
      await player.replaceAsync(video.videoSource);
      setDuration(video.duration);
      setIsVideoLoaded(true);
      
      setTimeout(() => {
        // Seek to saved position (where ad was triggered)
        player.currentTime = savedPlayTime;
        setCurrentTime(savedPlayTime);
        setMode('main');
        player.play();
        setIsPlaying(true);
        setShowControls(true);
        console.log('▶️ Main video resumed at', savedPlayTime, 'seconds');
      }, 1000);
    } catch (error) {
      console.error('Error resuming main video', error);
      setErrorMessage('Failed to resume video');
      setMode('error');
    }
  }

  async function loadMain() {
    console.log('▶️ Loading Main Video:', video.title);
    setMode('loading');
    setIsPlaying(false);
    setIsVideoLoaded(false);

    try {
      console.log('🎥 Main video source:', video.videoSource);
      
      // Use replaceAsync for better performance
      await player.replaceAsync(video.videoSource);
      setDuration(video.duration);
      setIsVideoLoaded(true);
      
      setTimeout(() => {
        setMode('main');
        player.currentTime = 0;
        player.play();
        setIsPlaying(true);
        setShowControls(true);
        console.log('▶️ Main video playback started');
      }, 1000);

    } catch (error) {
      console.error('Main video load error', error);
      setErrorMessage(`Failed to load video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMode('error');
    }
  }

  function handleVideoEnd() {
    console.log('🏁 Video ended');
    setIsPlaying(false);
    
    // Check for post-roll ads before ending
    if (adTypes.includes('post-roll')) {
      loadAd('post-roll');
    } else {
      onVideoEnd?.();
    }
  }

  function togglePlayPause() {
    console.log('⏯️ Toggle play/pause, current state:', isPlaying);
    if (mode !== 'main' || !isVideoLoaded) return;
    
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
    setShowControls(true);
  }

  function handleSeek(direction: 'backward' | 'forward') {
    if (mode !== 'main' || !isVideoLoaded) return;
    
    const seekAmount = 10;
    const newTime = direction === 'forward'
      ? Math.min(currentTime + seekAmount, duration)
      : Math.max(currentTime - seekAmount, 0);
    
    console.log(`⏭️ Seeking ${direction} to:`, newTime);
    player.currentTime = newTime;
    setCurrentTime(newTime);
    setShowControls(true);
  }

  function handleScreen() {
    console.log('👆 Screen tapped, mode:', mode);
    if (mode === 'ad' && canSkip) {
      skipAd();
    } else if (mode === 'main' && isVideoLoaded) {
      setShowControls(prev => !prev);
    }
  }

  function handleBack() {
    console.log('🔙 Back Button Pressed');
    clearAdTimers();
    
    if (timeInterval.current !== null) {
      clearInterval(timeInterval.current);
      timeInterval.current = null;
    }
    
    player.pause();
    onBack?.();
  }

  function retryLoading() {
    console.log('🔄 Retrying video load');
    setMode('loading');
    setErrorMessage('');
    setIsVideoLoaded(false);
    setTimeout(() => loadMain(), 500);
  }

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Enhanced ad click handler
  function handleAdClick() {
    if (ad?.clickThroughUrl) {
      Alert.alert(
        'Open Advertisement',
        `Visit ${ad.advertiser || 'advertiser'} website?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open', 
            onPress: () => {
              // In a real app, you would use Linking.openURL(ad.clickThroughUrl)
              console.log('Opening ad URL:', ad.clickThroughUrl);
            }
          }
        ]
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit="contain"
        />
        
        {/* Touch overlay for interactions */}
        <Pressable style={styles.overlay} onPress={handleScreen} />
      </View>

      {/* Loading State */}
      {(mode === 'loading' || !isVideoLoaded) && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>
            {mode === 'loading' ? 'Loading...' : 'Preparing video...'}
          </Text>
        </View>
      )}

      {/* Error State */}
      {mode === 'error' && (
        <View style={styles.loading}>
          <Text style={styles.errorText}>Error: {errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Ad Overlay with Random Mid-roll Support */}
      {mode === 'ad' && ad && isVideoLoaded && (
        <View style={styles.adOverlay}>
          <View style={styles.adBanner}>
            <Text style={styles.adLabel}>
              {currentAdType === 'pre-roll' && 'Advertisement'}
              {currentAdType === 'mid-roll' && '🔥 Commercial Break'}
              {currentAdType === 'post-roll' && 'Thank you for watching'}
            </Text>
            <Text style={styles.adTitle}>{ad.title}</Text>
            {ad.advertiser && (
              <Text style={styles.adAdvertiser}>by {ad.advertiser}</Text>
            )}
            {currentAdType === 'mid-roll' && (
              <Text style={styles.adResume}>
                Video will resume in {Math.max(0, ad.duration - adTimer)}s
              </Text>
            )}
          </View>
          
          <View style={styles.adControls}>
            {ad.clickThroughUrl && (
              <TouchableOpacity style={styles.adClickButton} onPress={handleAdClick}>
                <Text style={styles.adClickText}>Learn More</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.skipBtn, canSkip ? styles.skipActive : styles.skipInactive]}
              onPress={() => canSkip && skipAd()}
              disabled={!canSkip}
            >
              <Text style={styles.skipText}>
                {canSkip ? 'Skip Ad ⏭️' : `Skip in ${Math.max(0, ad.skipAfter - adTimer)}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Video Controls */}
      {mode === 'main' && showControls && isVideoLoaded && (
        <View style={styles.controls}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24 * scale} color="#fff" />
            </TouchableOpacity>
            <View style={styles.info}>
              <Text style={styles.title}>{video.title}</Text>
              <Text style={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
            </View>
          </View>

          <View style={styles.midRow}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSeek('backward')}>
              <Ionicons name="play-back" size={32 * scale} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause}>
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={40 * scale} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSeek('forward')}>
              <Ionicons name="play-forward" size={32 * scale} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.botRow}>
            <View style={styles.progress}>
              <View 
                style={[
                  styles.fill, 
                  { width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }
                ]} 
              />
              {/* Show ad markers on progress bar */}
              {adSchedule.map((scheduleItem, index) => (
                <View 
                  key={index}
                  style={[
                    styles.adMarker,
                    { left: `${(scheduleItem.timePosition / duration) * 100}%` }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const useVideoPlayerStyles = () => {
  const scale = useScale();
  const { width, height } = Dimensions.get('window');

  return StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: '#000' 
    },
    videoContainer: { 
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    video: { 
      width, 
      height,
      backgroundColor: '#000'
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    loading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    loadingText: { 
      color: '#fff', 
      fontSize: 18 * scale 
    },
    errorText: {
      color: '#ff6b6b',
      fontSize: 16 * scale,
      textAlign: 'center',
      marginBottom: 20 * scale,
      paddingHorizontal: 20 * scale
    },
    retryButton: {
      backgroundColor: '#007AFF',
      paddingHorizontal: 20 * scale,
      paddingVertical: 10 * scale,
      borderRadius: 8 * scale
    },
    retryText: {
      color: '#fff',
      fontSize: 16 * scale,
      fontWeight: '600'
    },
    adOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
      padding: 30 * scale
    },
    adBanner: {
      backgroundColor: 'rgba(255,193,7,0.95)',
      padding: 16 * scale,
      borderRadius: 10 * scale
    },
    adLabel: { 
      fontSize: 12 * scale, 
      fontWeight: 'bold', 
      color: '#333' 
    },
    adTitle: { 
      fontSize: 16 * scale, 
      fontWeight: 'bold', 
      color: '#333',
      marginTop: 4 * scale
    },
    adAdvertiser: {
      fontSize: 14 * scale,
      color: '#666',
      marginTop: 2 * scale,
      fontStyle: 'italic'
    },
    adResume: {
      fontSize: 12 * scale,
      color: '#555',
      marginTop: 4 * scale,
      fontWeight: '500'
    },
    adControls: {
      alignItems: 'flex-end',
      gap: 10 * scale
    },
    adClickButton: {
      backgroundColor: 'rgba(0,122,255,0.9)',
      paddingHorizontal: 16 * scale,
      paddingVertical: 8 * scale,
      borderRadius: 6 * scale
    },
    adClickText: {
      color: '#fff',
      fontSize: 14 * scale,
      fontWeight: '600'
    },
    skipBtn: {
      padding: 12 * scale,
      borderRadius: 8 * scale
    },
    skipActive: { 
      backgroundColor: 'rgba(0,122,255,0.9)' 
    },
    skipInactive: { 
      backgroundColor: 'rgba(0,0,0,0.7)' 
    },
    skipText: { 
      color: '#fff', 
      fontSize: 14 * scale, 
      fontWeight: '600' 
    },
    controls: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
      padding: 30 * scale
    },
    topRow: { 
      flexDirection: 'row', 
      alignItems: 'center' 
    },
    backBtn: { 
      padding: 8 * scale, 
      backgroundColor: 'rgba(0,0,0,0.7)', 
      borderRadius: 16 * scale 
    },
    info: { 
      marginLeft: 16 * scale 
    },
    title: { 
      color: '#fff', 
      fontSize: 18 * scale, 
      fontWeight: 'bold' 
    },
    time: { 
      color: '#ddd', 
      fontSize: 14 * scale 
    },
    midRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 40 * scale
    },
    ctrlBtn: { 
      padding: 10 * scale, 
      backgroundColor: 'rgba(0,0,0,0.7)', 
      borderRadius: 20 * scale 
    },
    playBtn: { 
      padding: 14 * scale, 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      borderRadius: 28 * scale 
    },
    botRow: { 
      alignItems: 'center' 
    },
    progress: {
      width: '100%',
      height: 3 * scale,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 2 * scale,
      overflow: 'hidden',
      position: 'relative'
    },
    fill: { 
      height: '100%', 
      backgroundColor: '#007AFF' 
    },
    adMarker: {
      position: 'absolute',
      top: 0,
      width: 2 * scale,
      height: '100%',
      backgroundColor: '#FFD700',
      zIndex: 2
    }
  });
};