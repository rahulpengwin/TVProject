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
import { VideoData, AdData, VideoService } from '@/services/VideoService';

const useTVEventHandler = Platform.isTV
  ? require('react-native').useTVEventHandler
  : (_: any) => {};

interface VideoPlayerProps {
  video: VideoData; // main video info (uri + duration in seconds)
  onVideoEnd?: () => void;
  onBack?: () => void;
  autoPlayAd?: boolean;
}

export function VideoPlayer({
  video,
  onVideoEnd,
  onBack,
  autoPlayAd = true,
}: VideoPlayerProps) {
  const scale = useScale();
  const styles = useVideoPlayerStyles();

  // Modes: 'loading' → 'ad' → 'main'
  const [mode, setMode] = useState<'loading' | 'ad' | 'main' | 'error'>('loading');
  const [ad, setAd] = useState<AdData | null>(null);
  const [adTimer, setAdTimer] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Refs for timers - Fixed: Use number type for React Native timers
  const adInterval = useRef<number | null>(null);
  const adTimeout = useRef<number | null>(null);
  const controlsTimeout = useRef<number | null>(null);
  const timeInterval = useRef<number | null>(null);
  const mainAutoplayed = useRef(false);

  // Create player without any initial source (set later via replaceAsync)
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
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

  // Initialize: start ad or main
  useEffect(() => {
    const t = setTimeout(() => {
      autoPlayAd ? loadAd() : loadMain();
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // Android TV back button
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.isTV) {
      const h = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => h.remove();
    }
  }, []);

  // Track time for main
  useEffect(() => {
    if (mode === 'main' && isPlaying) {
      timeInterval.current = setInterval(() => {
        const t = Math.floor(player.currentTime || 0);
        setCurrentTime(t);
        if (t >= duration - 1) {
          setIsPlaying(false);
          onVideoEnd?.();
        }
      }, 1000);
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
  }, [mode, isPlaying, duration]);

  // Auto-hide controls
  useEffect(() => {
    if (mode === 'main' && showControls && isPlaying) {
      if (controlsTimeout.current !== null) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => setShowControls(false), 4000);
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

  // Validate URL before loading
  async function validateAndLoadVideo(url: string, type: 'ad' | 'main'): Promise<boolean> {
    try {
      // Basic URL validation
      new URL(url);

      // Optional: Check if URL is reachable (can be slow, so use sparingly)
      const isValid = await VideoService.validateVideoUrl(url);
      if (!isValid) {
        console.warn(`${type} URL may not be accessible:`, url);
        // Don't fail completely, let expo-video handle it
      }

      return true;
    } catch (error) {
      console.error(`Invalid ${type} URL:`, url, error);
      return false;
    }
  }

  // Load & play ad
  async function loadAd() {
    console.log('▶️ Loading Ad');
    const a = VideoService.getRandomAd();
    setMode('loading');
    setAd(a);
    setAdTimer(0);
    setCanSkip(false);
    setCurrentTime(0);
    setDuration(a.duration);
    player.pause();
    setIsPlaying(false);

    try {
      // Validate ad URL
      const isValidUrl = await validateAndLoadVideo(a.videoSource, 'ad');
      if (!isValidUrl) {
        console.warn('Invalid ad URL, skipping to main content');
        loadMain();
        return;
      }

      await player.replaceAsync(a.videoSource);
      setMode('ad');

      setTimeout(() => {
        player.currentTime = 0;
        player.play();
        setIsPlaying(true);

        // skip countdown
        adInterval.current = setInterval(() => {
          setAdTimer(t => {
            if (t + 1 >= a.skipAfter) setCanSkip(true);
            return t + 1;
          });
        }, 1000);

        // auto-skip
        adTimeout.current = setTimeout(skipAd, a.duration * 1000);
      }, 500);
    } catch (e) {
      console.warn('Ad load error, skipping', e);
      setErrorMessage('Failed to load advertisement');
      setTimeout(() => loadMain(), 1000);
    }
  }

  // Skip ad
  function skipAd() {
    if (!canSkip) return;
    console.log('⏭️ Skip Ad');
    clearAdTimers();
    player.pause();
    setIsPlaying(false);
    transitionToMain();
  }

  // Transition after ad
  function transitionToMain() {
    console.log('🔄 To Main');
    clearAdTimers();
    setMode('loading');
    setAd(null);
    setCanSkip(false);
    setCurrentTime(0);
    setShowControls(false);
    player.pause();
    setIsPlaying(false);
    setTimeout(loadMain, 300);
  }

  // Load & play main
  async function loadMain() {
    console.log('▶️ Loading Main');
    setMode('loading');
    player.pause();
    setIsPlaying(false);

    try {
      // Validate main video URL
      const isValidUrl = await validateAndLoadVideo(video.videoSource, 'main');
      if (!isValidUrl) {
        setErrorMessage('Invalid video URL provided');
        setMode('error');
        return;
      }

      await player.replaceAsync(video.videoSource);
      setDuration(video.duration);
      setMode('main');

      setTimeout(() => {
        if (!mainAutoplayed.current) {
          mainAutoplayed.current = true;
          player.currentTime = 0;
          player.play();
          setIsPlaying(true);
          setShowControls(true);
        }
      }, 800);
    } catch (e) {
      console.error('Main video load error', e);
      setErrorMessage(`Failed to load video: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setMode('error');
    }
  }

  // Play/pause toggle
  function togglePlayPause() {
    if (mode !== 'main') return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
    setShowControls(true);
  }

  // Seek
  function handleSeek(dir: 'backward' | 'forward') {
    if (mode !== 'main') return;
    const s = 10;
    const nt = dir === 'forward'
      ? Math.min(currentTime + s, duration)
      : Math.max(currentTime - s, 0);
    player.currentTime = nt;
    setCurrentTime(nt);
    setShowControls(true);
  }

  // Screen press
  function handleScreen() {
    if (mode === 'ad' && canSkip) skipAd();
    else if (mode === 'main') setShowControls(v => !v);
  }

  // Back
  function handleBack() {
    console.log('🔙 Back');
    clearAdTimers();
    if (timeInterval.current !== null) {
      clearInterval(timeInterval.current);
      timeInterval.current = null;
    }
    player.pause();
    onBack?.();
  }

  // Retry loading video
  function retryLoading() {
    setMode('loading');
    setErrorMessage('');
    setTimeout(() => loadMain(), 500);
  }

  function format(s: number) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.container}>
      {/* Video */}
      <View style={styles.videoContainer}>
        <VideoView 
          player={player} 
          style={styles.video}
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      </View>

      {/* Touchable overlay for interactions */}
      <Pressable style={styles.overlay} onPress={handleScreen} />

      {/* Loading */}
      {mode === 'loading' && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {/* Error */}
      {mode === 'error' && (
        <View style={styles.loading}>
          <Text style={styles.errorText}>Error: {errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ad Overlay */}
      {mode === 'ad' && ad && (
        <View style={styles.adOverlay}>
          <View style={styles.adBanner}>
            <Text style={styles.adLabel}>Advertisement</Text>
            <Text style={styles.adTitle}>{ad.title}</Text>
          </View>
          <TouchableOpacity
            style={[styles.skipBtn, canSkip ? styles.skipActive : styles.skipInactive]}
            onPress={() => canSkip && skipAd()}
            disabled={!canSkip}
          >
            <Text style={styles.skipText}>
              {canSkip ? 'Skip Ad' : `Skip in ${Math.max(0, ad.skipAfter - adTimer)}s`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Controls */}
      {mode === 'main' && showControls && (
        <View style={styles.controls}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24 * scale} color="#fff" />
            </TouchableOpacity>
            <View style={styles.info}>
              <Text style={styles.title}>{video.title}</Text>
              <Text style={styles.time}>{format(currentTime)} / {format(duration)}</Text>
            </View>
          </View>

          <View style={styles.midRow}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSeek('backward')}>
              <Ionicons name="play-back" size={24 * scale} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause}>
              <Ionicons 
                name={isPlaying ? "pause" : "play"} 
                size={32 * scale} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSeek('forward')}>
              <Ionicons name="play-forward" size={24 * scale} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.botRow}>
            <View style={styles.progress}>
              <View 
                style={[styles.fill, { width: `${(currentTime / duration) * 100}%` }]} 
              />
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
    container: { flex: 1, backgroundColor: '#000' },
    videoContainer: { flex: 1 },
    video: { width, height },
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
    loadingText: { color: '#fff', fontSize: 18 * scale },
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
    adLabel: { fontSize: 12 * scale, fontWeight: 'bold', color: '#333' },
    adTitle: { fontSize: 16 * scale, fontWeight: 'bold', color: '#333' },
    skipBtn: {
      alignSelf: 'flex-end',
      padding: 12 * scale,
      borderRadius: 8 * scale
    },
    skipActive: { backgroundColor: 'rgba(0,122,255,0.9)' },
    skipInactive: { backgroundColor: 'rgba(0,0,0,0.7)' },
    skipText: { color: '#fff', fontSize: 14 * scale, fontWeight: '600' },
    controls: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
      padding: 30 * scale
    },
    topRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 8 * scale, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16 * scale },
    info: { marginLeft: 16 * scale },
    title: { color: '#fff', fontSize: 18 * scale, fontWeight: 'bold' },
    time: { color: '#ddd', fontSize: 14 * scale },
    midRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 40 * scale
    },
    ctrlBtn: { padding: 10 * scale, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20 * scale },
    playBtn: { padding: 14 * scale, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 28 * scale },
    botRow: { alignItems: 'center' },
    progress: {
      width: '100%',
      height: 3 * scale,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 2 * scale,
      overflow: 'hidden'
    },
    fill: { height: '100%', backgroundColor: '#007AFF' }
  });
};