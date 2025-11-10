import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  BackHandler,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { useScale } from "@/hooks/useScale";
import {
  VideoData,
  AdData,
  AdSchedule,
  VideoService,
} from "@/services/VideoService";

export interface VideoQuality {
  label: string;
  value: string;
  bitrate: number;
}

// Helper: Get video dimensions using fetch to detect quality
async function detectVideoQuality(videoUrl: string): Promise<VideoQuality[]> {
  try {
    const response = await fetch(videoUrl, { method: "HEAD" });
    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type");

    console.log("📊 Video Info:", {
      contentLength,
      contentType,
      url: videoUrl,
    });

    // Default qualities - always include Auto
    const qualities: VideoQuality[] = [
      { label: "Auto", value: "auto", bitrate: 0 },
    ];

    // Calculate file size in MB
    const fileSizeInMB = contentLength
      ? parseInt(contentLength) / (1024 * 1024)
      : 0;

    console.log(`📏 File size: ${fileSizeInMB.toFixed(2)} MB`);

    // Add quality options based on file size
    if (fileSizeInMB > 0) {
      qualities.push({ label: "360p", value: "360p", bitrate: 500 });
      qualities.push({ label: "480p", value: "480p", bitrate: 1000 });

      if (fileSizeInMB > 50) {
        qualities.push({ label: "720p", value: "720p", bitrate: 2500 });
      }

      if (fileSizeInMB > 150) {
        qualities.push({ label: "1080p", value: "1080p", bitrate: 5000 });
      }

      if (fileSizeInMB > 300) {
        qualities.push({ label: "1440p", value: "1440p", bitrate: 8000 });
      }

      if (fileSizeInMB > 500) {
        qualities.push({ label: "4K", value: "2160p", bitrate: 15000 });
      }
    }

    console.log(
      `✅ Available qualities:`,
      qualities.map((q) => q.label).join(", ")
    );

    return qualities;
  } catch (error) {
    console.warn("⚠️ Could not detect video quality:", error);
    return [
      { label: "Auto", value: "auto", bitrate: 0 },
      { label: "360p", value: "360p", bitrate: 500 },
      { label: "480p", value: "480p", bitrate: 1000 },
    ];
  }
}

// Helper: Convert URL to different quality (if backend supports it)
function getQualityUrl(originalUrl: string, quality: VideoQuality): string {
  if (quality.value === "auto") return originalUrl;

  const patterns = [
    originalUrl.replace(/\.mp4$/i, `_${quality.value}.mp4`),
    originalUrl.replace(/\.mp4$/i, `-${quality.value}.mp4`),
    originalUrl.replace(/\/([^\/]+)\.mp4$/i, `/${quality.value}/$1.mp4`),
  ];

  return originalUrl;
}

const useTVEventHandler = Platform.isTV
  ? require("react-native").useTVEventHandler
  : (_: any) => {};

interface VideoPlayerProps {
  video: VideoData;
  onVideoEnd?: () => void;
  onBack?: () => void;
  autoPlayAd?: boolean;
  adTypes?: Array<"pre-roll" | "mid-roll">;
}

const AnimatedButton = ({
  children,
  onPress,
  style,
  disabled = false,
  isHighlighted = false,
  isFocused = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
  isHighlighted?: boolean;
  isFocused?: boolean;
}) => {
  const scale = useSharedValue(isHighlighted || isFocused ? 0.85 : 1);
  const opacity = useSharedValue(isHighlighted ? 0.6 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15 });
    opacity.value = withTiming(0.6, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  useEffect(() => {
    if (isHighlighted || isFocused) {
      scale.value = withSpring(0.85, { damping: 15 });
      if (isHighlighted) {
        opacity.value = withTiming(0.6, { duration: 100 });
      }
    } else {
      scale.value = withSpring(1, { damping: 15 });
      opacity.value = withTiming(1, { duration: 100 });
    }
  }, [isHighlighted, isFocused]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

export function VideoPlayer({
  video,
  onVideoEnd,
  onBack,
  autoPlayAd = true,
  adTypes = ["pre-roll", "mid-roll"],
}: VideoPlayerProps) {
  const scale = useScale();
  const styles = useVideoPlayerStyles();

  const [mode, setMode] = useState<"loading" | "ad" | "main" | "error">(
    "loading"
  );
  const [ad, setAd] = useState<AdData | null>(null);
  const [adTimer, setAdTimer] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [seekDirection, setSeekDirection] = useState<
    "forward" | "backward" | null
  >(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>({
    label: "Auto",
    value: "auto",
    bitrate: 0,
  });
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>([
    { label: "Auto", value: "auto", bitrate: 0 },
  ]);
  const [isDetectingQuality, setIsDetectingQuality] = useState(true);
  const [highlightedButton, setHighlightedButton] = useState<
    "play" | "forward" | "backward" | null
  >(null);
  const [focusedControl, setFocusedControl] = useState<
    "back" | "play" | "forward" | "backward" | "quality" | null
  >(null);
  const [selectedQualityIndex, setSelectedQualityIndex] = useState(0);

  const [adSchedule, setAdSchedule] = useState<AdSchedule[]>([]);
  const [currentAdType, setCurrentAdType] = useState<"pre-roll" | "mid-roll">(
    "pre-roll"
  );
  const [savedPlayTime, setSavedPlayTime] = useState(0);

  const adInterval = useRef<number | null>(null);
  const adTimeout = useRef<number | null>(null);
  const controlsTimeout = useRef<number | null>(null);
  const timeInterval = useRef<number | null>(null);
  const bufferingCheckInterval = useRef<number | null>(null);
  const lastCurrentTime = useRef(0);
  const consecutiveStallCount = useRef(0);

  const player = useVideoPlayer("", (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
  });

  // TV remote handler - Simple and intuitive
  useTVEventHandler((evt: any) => {
    if (!evt) return;

    const { eventType } = evt;

    console.log("📺 TV Remote Event:", eventType, "Mode:", mode);

    // Handle quality modal navigation
    if (showQualityModal) {
      if (eventType === "up") {
        setSelectedQualityIndex((prev) =>
          prev > 0 ? prev - 1 : availableQualities.length - 1
        );
        return;
      }

      if (eventType === "down") {
        setSelectedQualityIndex((prev) =>
          prev < availableQualities.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (eventType === "select") {
        handleQualityChange(availableQualities[selectedQualityIndex]);
        return;
      }

      if (["menu", "back"].includes(eventType)) {
        setShowQualityModal(false);
        return;
      }

      return;
    }
    // Ad mode controls
    if (["select", "playPause"].includes(eventType)) {
      if (mode === "ad" && canSkip) {
        skipAd();
      } else if (mode === "main" && isVideoLoaded) {
        if (focusedControl === "quality" && availableQualities.length > 1) {
          setShowQualityModal(true);
          setSelectedQualityIndex(
            availableQualities.findIndex(
              (q) => q.value === selectedQuality.value
            )
          );
        } else if (focusedControl === "backward") {
          handleSeek("backward");
        } else if (focusedControl === "forward") {
          handleSeek("forward");
        } else {
          // Show controls BEFORE toggling play/pause
          setShowControls(true);
          setHighlightedButton("play");
          setTimeout(() => setHighlightedButton(null), 400);
          togglePlayPause();
        }
      }
      return;
    }

    // Main video controls
    if (mode === "main" && isVideoLoaded) {
      // CENTER button - Play/Pause
      if (["select", "playPause"].includes(eventType)) {
        setHighlightedButton("play");
        setTimeout(() => setHighlightedButton(null), 400);
        togglePlayPause();
        // Don't auto-hide when paused
        if (isPlaying) {
          // Video is playing, will pause now - keep controls visible
          setShowControls(true);
        }
        return;
      }

      // RIGHT button - Forward 10 seconds
      if (eventType === "right") {
        setHighlightedButton("forward");
        setTimeout(() => setHighlightedButton(null), 400);
        handleSeek("forward");
        return;
      }

      // LEFT button - Backward 10 seconds
      if (eventType === "left") {
        setHighlightedButton("backward");
        setTimeout(() => setHighlightedButton(null), 400);
        handleSeek("backward");
        return;
      }

      // UP button - Show/Focus quality settings
      if (eventType === "up") {
        if (!showControls) {
          setShowControls(true);
        }
        setFocusedControl("quality");
        console.log("🎚️ Quality settings focused");
        return;
      }

      // DOWN button - Hide controls
      if (eventType === "down") {
        setFocusedControl(null);
        setShowControls(false);
        console.log("👇 Controls hidden");
        return;
      }

      // BACK/MENU button - Exit video
      if (["menu", "back"].includes(eventType)) {
        handleBack();
        return;
      }
    }
  });

  useEffect(() => {
    const detectQualities = async () => {
      console.log("🔍 Detecting video qualities for:", video.videoUrl);
      setIsDetectingQuality(true);

      const qualities = await detectVideoQuality(video.videoUrl);
      setAvailableQualities(qualities);
      setSelectedQuality(qualities[0]);

      console.log("✅ Available qualities:", qualities);
      setIsDetectingQuality(false);
    };

    detectQualities();
  }, [video.videoUrl]);

  // Initialize video and ad scheduling
  useEffect(() => {
    const initializePlayer = async () => {
      console.log("🎬 Initializing Player for video:", video.title);

      const schedule = await VideoService.generateAdSchedule(video);
      setAdSchedule(schedule);

      // await VideoService.incrementVideoWatchCount(video.id);

      setDuration(video.duration);

      setTimeout(() => {
        if (autoPlayAd && adTypes.includes("pre-roll")) {
          loadAd("pre-roll");
        } else {
          loadMain();
        }
      }, 300);
    };

    if (!isDetectingQuality) {
      initializePlayer();
    }
  }, [video.id, isDetectingQuality]);

  // Android TV back button handler
  useEffect(() => {
    if (Platform.OS === "android" && Platform.isTV) {
      const handler = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBack();
        return true;
      });
      return () => handler.remove();
    }
  }, []);

  // Monitor buffering state
  useEffect(() => {
    if (mode === "main" && isVideoLoaded && player && isPlaying) {
      bufferingCheckInterval.current = setInterval(() => {
        const currentPos = Math.floor(player.currentTime || 0);

        if (isPlaying && currentPos === lastCurrentTime.current) {
          consecutiveStallCount.current += 1;

          if (consecutiveStallCount.current >= 2) {
            setIsBuffering(true);
          }
        } else {
          if (consecutiveStallCount.current > 0) {
            consecutiveStallCount.current = 0;
            setIsBuffering(false);
            console.log("✅ Buffering resolved");
          }
          lastCurrentTime.current = currentPos;
        }
      }, 1000);
    }

    return () => {
      if (bufferingCheckInterval.current !== null) {
        clearInterval(bufferingCheckInterval.current);
        bufferingCheckInterval.current = null;
      }
    };
  }, [mode, isVideoLoaded, isPlaying, player]);

  // Enhanced time tracking with better mid-roll ad detection and view tracking
  useEffect(() => {
    if (mode === "main" && isPlaying && isVideoLoaded) {
      timeInterval.current = setInterval(() => {
        const currentPlayerTime = Math.floor(player.currentTime || 0);
        setCurrentTime(currentPlayerTime);

        // Track view after 10 seconds (only once)
        if (currentPlayerTime >= 10 && !hasTrackedView) {
          console.log("📊 10 seconds reached, tracking video view...");
          VideoService.incrementVideoWatchCount(video.id);
          setHasTrackedView(true);
        }

        // Mid-roll ad detection
        if (adTypes.includes("mid-roll")) {
          const nextAd = VideoService.getNextScheduledAd(
            adSchedule,
            currentPlayerTime
          );

          if (nextAd) {
            console.log(
              "⏯ Mid-roll ad triggered:",
              nextAd.ad.title,
              "at",
              currentPlayerTime
            );

            const updatedSchedule = adSchedule.map((item) =>
              item === nextAd ? { ...item, triggered: true } : item
            );
            setAdSchedule(updatedSchedule);

            // Save CURRENT position before showing ad
            const savePosition = currentPlayerTime;
            setSavedPlayTime(savePosition);
            console.log("💾 Saved position before ad:", savePosition);

            player.pause();
            setIsPlaying(false);

            // Pass saved position to loadAd function
            setTimeout(() => loadAd("mid-roll", nextAd.ad, savePosition), 500);
          }
        }

        // Video end detection
        if (currentPlayerTime >= duration - 2) {
          handleVideoEnd();
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
  }, [mode, isPlaying, isVideoLoaded, duration, adSchedule, hasTrackedView]);

  // Auto-hide controls - Only hide when playing
  useEffect(() => {
    // When paused, ensure controls are visible
    if (mode === "main" && !isPlaying) {
      setShowControls(true);
      if (controlsTimeout.current !== null) {
        clearTimeout(controlsTimeout.current);
        controlsTimeout.current = null;
      }
      return;
    }

    // When focused on a control, keep controls visible
    if (focusedControl) {
      if (controlsTimeout.current !== null) {
        clearTimeout(controlsTimeout.current);
        controlsTimeout.current = null;
      }
      return;
    }

    // Only auto-hide when video is playing and no focus
    if (mode === "main" && showControls && isPlaying) {
      if (controlsTimeout.current !== null) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeout.current !== null) {
        clearTimeout(controlsTimeout.current);
        controlsTimeout.current = null;
      }
    };
  }, [mode, showControls, isPlaying, focusedControl]);

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

  async function loadAd(
    type: "pre-roll" | "mid-roll",
    specificAd?: AdData,
    adSavedPosition?: number
  ) {
    console.log(`🔁 Loading ${type} Ad`);
    console.log(`💾 Ad saved position parameter:`, adSavedPosition);

    const selectedAd =
      specificAd || (await VideoService.getRandomAd(type, video));

    if (!selectedAd) {
      console.log(`No ${type} ad available, proceeding...`);
      if (type === "pre-roll") {
        loadMain();
      } else if (type === "mid-roll") {
        if (adSavedPosition !== undefined && adSavedPosition > 0) {
          resumeMainVideo(adSavedPosition);
        } else {
          resumeMainVideo();
        }
      }
      return;
    }

    setMode("loading");
    setAd(selectedAd);
    setCurrentAdType(type);
    setAdTimer(0);
    setCanSkip(false);
    setCurrentTime(0);
    setDuration(selectedAd.duration || 15);
    setIsPlaying(false);
    setIsVideoLoaded(false);
    setIsBuffering(false);
    consecutiveStallCount.current = 0;

    try {
      console.log("🎥 Parsing VAST URL:", selectedAd.vastUrl);

      const actualVideoUrl = await VideoService.parseVastXml(
        selectedAd.vastUrl
      );

      if (!actualVideoUrl) {
        console.warn("⚠️ Failed to extract video from VAST, skipping ad...");
        if (type === "mid-roll") {
          if (adSavedPosition !== undefined && adSavedPosition > 0) {
            resumeMainVideo(adSavedPosition);
          } else {
            resumeMainVideo();
          }
        } else {
          setTimeout(() => handleAdComplete(), 200);
        }
        return;
      }

      console.log("🎥 Loading ad video source:", actualVideoUrl);

      player.pause();
      player.muted = false;
      player.volume = 1.0;

      await new Promise((resolve) => setTimeout(resolve, 50));

      await player.replaceAsync(actualVideoUrl);
      setIsVideoLoaded(true);

      setTimeout(() => {
        setMode("ad");
        player.currentTime = 0;
        player.muted = false;
        player.volume = 1.0;

        player.play();
        setIsPlaying(true);
        startAdCountdown(selectedAd, type, adSavedPosition);
        console.log(`▶️ ${type} ad playback started: "${selectedAd.title}"`);
      }, 300);
    } catch (error) {
      console.warn("⚠️ Ad load error, continuing with content...", error);
      if (type === "mid-roll") {
        if (adSavedPosition !== undefined && adSavedPosition > 0) {
          resumeMainVideo(adSavedPosition);
        } else {
          resumeMainVideo();
        }
      } else {
        setTimeout(() => handleAdComplete(), 200);
      }
    }
  }

  function startAdCountdown(
    adData: AdData,
    adType: "pre-roll" | "mid-roll" = "pre-roll",
    adSavedPosition?: number
  ) {
    adInterval.current = setInterval(() => {
      setAdTimer((timer) => {
        const skipAfter = adData.skipAfter || 5;
        if (timer + 1 >= skipAfter) {
          setCanSkip(true);
        }
        return timer + 1;
      });
    }, 1000);

    const adDuration = adData.duration || 15;
    adTimeout.current = setTimeout(() => {
      console.log("⏹ Ad auto-completed");
      handleAdComplete(adType, adSavedPosition);
    }, adDuration * 1000);
  }

  function skipAd() {
    if (!canSkip) return;
    console.log("⏭ Skip Ad");
    clearAdTimers();
    player.pause();
    setIsPlaying(false);
    // Pass savedPlayTime when skipping mid-roll ad
    if (currentAdType === "mid-roll") {
      handleAdComplete(currentAdType, savedPlayTime);
    } else {
      handleAdComplete();
    }
  }

  function handleAdComplete(
    adType?: "pre-roll" | "mid-roll",
    adSavedPosition?: number
  ) {
    const type = adType || currentAdType;
    console.log("✅ Ad completed, type:", type);
    console.log("💾 Ad saved position in handleAdComplete:", adSavedPosition);
    clearAdTimers();

    if (type === "pre-roll") {
      transitionToMain();
    } else if (type === "mid-roll") {
      console.log(
        `🔍 Checking saved position: ${adSavedPosition} vs video duration: ${video.duration}`
      );

      if (
        adSavedPosition !== undefined &&
        adSavedPosition > 0 &&
        adSavedPosition <= video.duration
      ) {
        console.log("✅ Valid saved position, resuming from:", adSavedPosition);
        resumeMainVideo(adSavedPosition);
      } else {
        console.warn(
          `⚠️ Invalid saved position (${adSavedPosition}), loading from start`
        );
        loadMain();
      }
    }
  }

  function transitionToMain() {
    console.log("🔄 Transitioning to Main Video");
    clearAdTimers();
    setMode("loading");
    setAd(null);
    setCanSkip(false);
    setCurrentTime(0);
    setShowControls(false);
    setIsPlaying(false);
    setIsVideoLoaded(false);
    setIsBuffering(false);
    consecutiveStallCount.current = 0;

    setTimeout(() => {
      loadMain();
    }, 200);
  }
  async function resumeMainVideo(positionToResume?: number) {
    // Use passed position parameter, fallback to savedPlayTime, then to 0
    const targetPosition =
      positionToResume !== undefined ? positionToResume : savedPlayTime;

    console.log(
      "🔁 Resuming Main Video from time:",
      targetPosition,
      "(passed:",
      positionToResume,
      ", saved:",
      savedPlayTime,
      ")"
    );
    clearAdTimers();
    setMode("loading");
    setAd(null);
    setCanSkip(false);
    setShowControls(false);
    setIsVideoLoaded(false);
    setIsPlaying(false);
    setIsBuffering(false);
    consecutiveStallCount.current = 0;

    try {
      player.pause();
      player.muted = false;
      player.volume = 1.0;

      await new Promise((resolve) => setTimeout(resolve, 100));

      await player.replaceAsync(video.videoUrl);
      setDuration(video.duration);
      setIsVideoLoaded(true);

      await new Promise((resolve) => setTimeout(resolve, 400));

      let resumePosition = targetPosition;

      if (resumePosition < 0) {
        resumePosition = 0;
      } else if (resumePosition > video.duration - 1) {
        resumePosition = video.duration - 1;
      }

      console.log(
        "⏩ Seeking to position:",
        resumePosition,
        "| Duration:",
        video.duration
      );

      player.currentTime = resumePosition;
      setCurrentTime(resumePosition);
      lastCurrentTime.current = resumePosition;

      await new Promise((resolve) => setTimeout(resolve, 300));

      player.muted = false;
      player.volume = 1.0;

      setMode("main");
      player.play();
      setIsPlaying(true);
      setShowControls(true);

      console.log("▶️ Main video resumed at", resumePosition, "seconds");
    } catch (error) {
      console.error("❌ Error resuming main video", error);
      setErrorMessage("Failed to resume video");
      setMode("error");
    }
  }

  async function loadMain() {
    console.log("🔄 Loading Main Video:", video.title);
    setMode("loading");
    setIsPlaying(false);
    setIsVideoLoaded(false);
    setIsBuffering(false);
    setHasTrackedView(false); // Reset view tracking
    consecutiveStallCount.current = 0;

    try {
      player.pause();
      player.muted = false;
      player.volume = 1.0;

      await new Promise((resolve) => setTimeout(resolve, 50));

      await player.replaceAsync(video.videoUrl);
      setDuration(video.duration);
      setIsVideoLoaded(true);

      setTimeout(() => {
        setMode("main");
        player.currentTime = 0;
        setCurrentTime(0);
        lastCurrentTime.current = 0;

        player.muted = false;
        player.volume = 1.0;

        player.play();
        setIsPlaying(true);
        setShowControls(true);
        console.log("▶️ Main video playback started");
      }, 300);
    } catch (error) {
      console.error("❌ Main video load error", error);
      setErrorMessage(
        `Failed to load video: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMode("error");
    }
  }

  function handleVideoEnd() {
    console.log("⏹ Video ended");
    setIsPlaying(false);
    onVideoEnd?.();
  }

function togglePlayPause() {
  console.log("⏯ Toggle play/pause, current state:", isPlaying);
  if (mode !== "main" || !isVideoLoaded) return;

  if (isPlaying) {
    // Pausing - keep controls visible
    player.pause();
    setIsPlaying(false);
    setShowControls(true);
  } else {
    // Playing - show controls briefly, then auto-hide
    player.play();
    setIsPlaying(true);
    setShowControls(true);
  }
}

  function handleSeek(direction: "backward" | "forward") {
    if (mode !== "main" || !isVideoLoaded) return;

    const seekAmount = 10;
    const newTime =
      direction === "forward"
        ? Math.min(currentTime + seekAmount, duration)
        : Math.max(currentTime - seekAmount, 0);

    console.log(`⏩ Seeking ${direction} to:`, newTime);

    setSeekDirection(direction);
    setTimeout(() => setSeekDirection(null), 800);
    player.currentTime = newTime;
    setCurrentTime(newTime);
    lastCurrentTime.current = newTime;
    consecutiveStallCount.current = 0;
    setShowControls(true);
  }

function handleScreen() {
  console.log("👆 Screen tapped, mode:", mode);
  if (mode === "ad" && canSkip) {
    skipAd();
  } else if (mode === "main" && isVideoLoaded) {
    // If paused, always show controls
    if (!isPlaying) {
      setShowControls(true);
    } else {
      // If playing, toggle controls
      setShowControls((prev) => !prev);
    }
  }
}

  function handleBack() {
    console.log("🔙 Back Button Pressed");
    clearAdTimers();

    if (timeInterval.current !== null) {
      clearInterval(timeInterval.current);
      timeInterval.current = null;
    }

    if (bufferingCheckInterval.current !== null) {
      clearInterval(bufferingCheckInterval.current);
      bufferingCheckInterval.current = null;
    }

    player.pause();
    onBack?.();
  }

  function retryLoading() {
    console.log("🔄 Retrying video load");
    setMode("loading");
    setErrorMessage("");
    setIsVideoLoaded(false);
    setIsBuffering(false);
    consecutiveStallCount.current = 0;
    setTimeout(() => loadMain(), 500);
  }

  function handleQualityChange(quality: VideoQuality) {
    console.log("🎬 Changing quality to:", quality.label);
    setSelectedQuality(quality);
    setShowQualityModal(false);

    if (quality.value === "auto") {
      console.log("ℹ️ Auto quality selected - player will adapt automatically");
    } else {
      const qualityUrl = getQualityUrl(video.videoUrl, quality);

      if (qualityUrl !== video.videoUrl) {
        const currentPlaybackTime = currentTime;

        setMode("loading");
        setIsVideoLoaded(false);
        setIsBuffering(false);
        consecutiveStallCount.current = 0;

        setTimeout(async () => {
          try {
            player.pause();
            await new Promise((resolve) => setTimeout(resolve, 100));

            await player.replaceAsync(qualityUrl);
            setIsVideoLoaded(true);

            await new Promise((resolve) => setTimeout(resolve, 300));

            player.currentTime = currentPlaybackTime;
            setCurrentTime(currentPlaybackTime);
            lastCurrentTime.current = currentPlaybackTime;

            setMode("main");
            if (isPlaying) {
              player.play();
            }
          } catch (error) {
            console.error("❌ Quality change error:", error);
            setMode("main");
            player.replaceAsync(video.videoUrl);
          }
        }, 200);
      } else {
        console.log("ℹ️ Backend doesn't support this quality variant");
      }
    }
  }

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  // Show loading while detecting quality
  if (isDetectingQuality) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
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
        <Pressable style={styles.overlay} onPress={handleScreen} />
      </View>

      {/* Loading State */}
      {(mode === "loading" || !isVideoLoaded) && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {mode === "loading" ? "Loading..." : "Loading..."}
          </Text>
        </View>
      )}

      {/* Buffering Indicator */}
      {isBuffering && isVideoLoaded && mode === "main" && isPlaying && (
        <View style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.bufferingText}>Loading...</Text>
        </View>
      )}

      {/* Seek Indicator */}
      {seekDirection && (
        <View
          style={[
            styles.seekIndicator,
            {
              left: seekDirection === "forward" ? "70%" : "30%",
            },
          ]}
        >
          <Ionicons
            name={seekDirection === "forward" ? "play-forward" : "play-back"}
            size={48 * scale}
            color="#fff"
          />
          <Text style={styles.seekText}>
            {seekDirection === "forward" ? "+10s" : "-10s"}
          </Text>
        </View>
      )}

      {/* Error State */}
      {mode === "error" && (
        <View style={styles.loading}>
          <Text style={styles.errorText}>Error: {errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ad Overlay */}
      {mode === "ad" && ad && isVideoLoaded && (
        <View style={styles.adOverlay}>
          <View style={styles.adBanner}>
            <Text style={styles.adLabel}>
              {currentAdType === "pre-roll" && "Advertisement"}
              {currentAdType === "mid-roll" && "⏸ Commercial Break"}
            </Text>
            <Text style={styles.adTitle}>{ad.title}</Text>
            {ad.advertiser && (
              <Text style={styles.adAdvertiser}>by {ad.advertiser}</Text>
            )}
            {currentAdType === "mid-roll" && (
              <Text style={styles.adResume}>
                Video will resume in{" "}
                {Math.max(0, (ad.duration || 15) - adTimer)}s
              </Text>
            )}
          </View>

          <View style={styles.adControls}>
            <TouchableOpacity
              style={[
                styles.skipBtn,
                canSkip ? styles.skipActive : styles.skipInactive,
              ]}
              onPress={() => canSkip && skipAd()}
              disabled={!canSkip}
            >
              <Text style={styles.skipText}>
                {canSkip
                  ? "Skip Ad ⏭"
                  : `Skip in ${Math.max(0, (ad.skipAfter || 5) - adTimer)}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Video Controls */}
      {mode === "main" && showControls && isVideoLoaded && (
        <View style={styles.controls}>
          <View style={styles.topRow}>
            <AnimatedButton
              style={styles.backBtn}
              onPress={handleBack}
              isFocused={focusedControl === "back"}
            >
              <Ionicons name="arrow-back" size={24 * scale} color="#fff" />
            </AnimatedButton>
            <View style={styles.info}>
              <Text style={styles.title}>{video.title}</Text>
              <Text style={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
            </View>
            {availableQualities.length > 1 && (
              <AnimatedButton
                style={[
                  styles.qualityBtn,
                  focusedControl === "quality" && styles.focusedButton,
                ]}
                onPress={() => {
                  setShowQualityModal(true);
                  setSelectedQualityIndex(
                    availableQualities.findIndex(
                      (q) => q.value === selectedQuality.value
                    )
                  );
                }}
                isFocused={focusedControl === "quality"}
              >
                <Ionicons name="settings" size={24 * scale} color="#fff" />
                <Text style={styles.qualityLabel}>{selectedQuality.label}</Text>
              </AnimatedButton>
            )}
          </View>

          <View style={styles.midRow}>
            <AnimatedButton
              style={[
                styles.ctrlBtn,
                focusedControl === "backward" && styles.focusedButton,
              ]}
              onPress={() => handleSeek("backward")}
              isHighlighted={highlightedButton === "backward"}
              isFocused={focusedControl === "backward"}
            >
              <Ionicons name="play-back" size={24 * scale} color="#fff" />
            </AnimatedButton>

            <AnimatedButton
              style={[
                styles.playBtn,
                focusedControl === "play" && styles.focusedButton,
              ]}
              onPress={togglePlayPause}
              isHighlighted={highlightedButton === "play"}
              isFocused={focusedControl === "play"}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28 * scale}
                color="#fff"
              />
            </AnimatedButton>

            <AnimatedButton
              style={[
                styles.ctrlBtn,
                focusedControl === "forward" && styles.focusedButton,
              ]}
              onPress={() => handleSeek("forward")}
              isHighlighted={highlightedButton === "forward"}
              isFocused={focusedControl === "forward"}
            >
              <Ionicons name="play-forward" size={24 * scale} color="#fff" />
            </AnimatedButton>
          </View>

          <View style={styles.botRow}>
            <View style={styles.progress}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${
                      duration > 0 ? (currentTime / duration) * 100 : 0
                    }%`,
                  },
                ]}
              />
              {adSchedule.map((scheduleItem, index) => (
                <View
                  key={index}
                  style={[
                    styles.adMarker,
                    {
                      left: `${(scheduleItem.timePosition / duration) * 100}%`,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Quality Selection Modal */}
      {availableQualities.length > 1 && (
        <Modal
          visible={showQualityModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowQualityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.qualityModal}>
              <Text style={styles.modalTitle}>Select Quality</Text>
              <Text style={styles.qualityNote}>
                Use ↑↓ to navigate, SELECT to choose
              </Text>
              {availableQualities.map((item, index) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.qualityOption,
                    selectedQuality.value === item.value &&
                      styles.qualityOptionSelected,
                    selectedQualityIndex === index &&
                      styles.qualityOptionFocused,
                  ]}
                  onPress={() => handleQualityChange(item)}
                >
                  <View>
                    <Text
                      style={[
                        styles.qualityOptionText,
                        (selectedQuality.value === item.value ||
                          selectedQualityIndex === index) &&
                          styles.qualityOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.bitrate > 0 && (
                      <Text style={styles.bitrateText}>
                        {item.bitrate / 1000} Mbps
                      </Text>
                    )}
                  </View>
                  {selectedQuality.value === item.value && (
                    <Ionicons
                      name="checkmark"
                      size={24 * scale}
                      color="#007AFF"
                    />
                  )}
                  {selectedQualityIndex === index &&
                    selectedQuality.value !== item.value && (
                      <Ionicons
                        name="chevron-forward"
                        size={20 * scale}
                        color="#007AFF"
                      />
                    )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowQualityModal(false)}
              >
                <Text style={styles.modalCloseBtnText}>
                  Press BACK to Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// Styles Hook
const useVideoPlayerStyles = () => {
  const scale = useScale();
  const { width, height } = Dimensions.get("window");

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },
    videoContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    video: {
      width,
      height,
      backgroundColor: "#000",
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    loading: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: "#fff",
      fontSize: 18 * scale,
      marginTop: 12 * scale,
      fontWeight: "600",
    },
    bufferingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    },
    bufferingText: {
      color: "#fff",
      fontSize: 16 * scale,
      marginTop: 12 * scale,
      fontWeight: "600",
    },
    seekIndicator: {
      position: "absolute",
      top: "52%",
      transform: [{ translateX: -50 * scale }, { translateY: -50 * scale }],
      backgroundColor: "rgba(0, 0, 0, 0.24)",
      padding: 20 * scale,
      borderRadius: 20 * scale,
      alignItems: "center",
      zIndex: 1000,
    },
    seekText: {
      color: "#fff",
      fontSize: 12 * scale,
      fontWeight: "bold",
      marginTop: 8 * scale,
    },
    errorText: {
      color: "#ff6b6b",
      fontSize: 16 * scale,
      textAlign: "center",
      marginBottom: 20 * scale,
      paddingHorizontal: 20 * scale,
    },
    retryButton: {
      backgroundColor: "#007AFF",
      paddingHorizontal: 20 * scale,
      paddingVertical: 10 * scale,
      borderRadius: 8 * scale,
    },
    retryText: {
      color: "#fff",
      fontSize: 16 * scale,
      fontWeight: "600",
    },
    adOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "space-between",
      padding: 30 * scale,
    },
    adBanner: {
      backgroundColor: "rgba(255,193,7,0.95)",
      padding: 16 * scale,
      borderRadius: 10 * scale,
    },
    adLabel: {
      fontSize: 12 * scale,
      fontWeight: "bold",
      color: "#333",
    },
    adTitle: {
      fontSize: 16 * scale,
      fontWeight: "bold",
      color: "#333",
      marginTop: 4 * scale,
    },
    adAdvertiser: {
      fontSize: 14 * scale,
      color: "#666",
      marginTop: 2 * scale,
      fontStyle: "italic",
    },
    adResume: {
      fontSize: 12 * scale,
      color: "#555",
      marginTop: 4 * scale,
      fontWeight: "500",
    },
    adControls: {
      alignItems: "flex-end",
      gap: 10 * scale,
    },
    skipBtn: {
      padding: 12 * scale,
      borderRadius: 8 * scale,
    },
    skipActive: {
      backgroundColor: "rgba(0,122,255,0.9)",
    },
    skipInactive: {
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    skipText: {
      color: "#fff",
      fontSize: 14 * scale,
      fontWeight: "600",
    },
    controls: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "space-between",
      padding: 30 * scale,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backBtn: {
      padding: 8 * scale,
      backgroundColor: "rgba(0,0,0,0.7)",
      borderRadius: 16 * scale,
    },
    qualityBtn: {
      padding: 8 * scale,
      backgroundColor: "rgba(0,0,0,0.7)",
      borderRadius: 16 * scale,
      flexDirection: "row",
      alignItems: "center",
      gap: 6 * scale,
    },
    qualityLabel: {
      color: "#fff",
      fontSize: 12 * scale,
      fontWeight: "600",
    },
    info: {
      flex: 1,
      marginLeft: 16 * scale,
      marginRight: 16 * scale,
    },
    title: {
      color: "#fff",
      fontSize: 18 * scale,
      fontWeight: "bold",
    },
    time: {
      color: "#ddd",
      fontSize: 14 * scale,
    },
    midRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 40 * scale,
    },
    ctrlBtn: {
      padding: 10 * scale,
      backgroundColor: "rgba(0,0,0,0.7)",
      borderRadius: 20 * scale,
    },
    playBtn: {
      padding: 14 * scale,
      backgroundColor: "rgba(0,0,0,0.8)",
      borderRadius: 25 * scale,
    },
    botRow: {
      alignItems: "center",
    },
    progress: {
      width: "100%",
      height: 3 * scale,
      backgroundColor: "rgba(255,255,255,0.3)",
      borderRadius: 2 * scale,
      overflow: "hidden",
      position: "relative",
    },
    fill: {
      height: "100%",
      backgroundColor: "#007AFF",
    },
    adMarker: {
      position: "absolute",
      top: 0,
      width: 2 * scale,
      height: "100%",
      backgroundColor: "#FFD700",
      zIndex: 2,
    },
    focusedButton: {
      borderWidth: 2 * scale,
      borderColor: "#007AFF",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    qualityModal: {
      backgroundColor: "#1a1a1a",
      borderRadius: 12 * scale,
      padding: 20 * scale,
      width: "80%",
      maxHeight: "60%",
    },
    modalTitle: {
      color: "#fff",
      fontSize: 18 * scale,
      fontWeight: "bold",
      marginBottom: 8 * scale,
      textAlign: "center",
    },
    qualityNote: {
      color: "#aaa",
      fontSize: 14 * scale,
      marginBottom: 16 * scale,
      textAlign: "center",
    },
    qualityOption: {
      paddingVertical: 14 * scale,
      paddingHorizontal: 16 * scale,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.1)",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    qualityOptionSelected: {
      backgroundColor: "rgba(0,122,255,0.2)",
    },
    qualityOptionFocused: {
      backgroundColor: "rgba(0,122,255,0.3)",
      borderWidth: 2,
      borderColor: "#007AFF",
    },
    qualityOptionText: {
      color: "#ddd",
      fontSize: 16 * scale,
      fontWeight: "500",
    },
    qualityOptionTextSelected: {
      color: "#007AFF",
      fontWeight: "600",
    },
    bitrateText: {
      color: "#888",
      fontSize: 12 * scale,
      marginTop: 4 * scale,
    },
    modalCloseBtn: {
      marginTop: 16 * scale,
      paddingVertical: 12 * scale,
      backgroundColor: "#007AFF",
      borderRadius: 8 * scale,
      alignItems: "center",
    },
    modalCloseBtnText: {
      color: "#fff",
      fontSize: 16 * scale,
      fontWeight: "600",
    },
  });
};
