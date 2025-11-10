import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Text, Image, Dimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { VideoGrid } from "@/components/VideoGrid";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoService, VideoData } from "@/services/VideoService";
import { ThemedView } from "@/components/ThemedView";
import { useScale } from "@/hooks/useScale";

export default function HomeScreen() {
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isFetchingVideos, setIsFetchingVideos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLandingVideo, setShowLandingVideo] = useState(true);
  const [landingVideoEnded, setLandingVideoEnded] = useState(false);
  const styles = useHomeScreenStyles();

  // Landing video player
  const landingPlayer = useVideoPlayer(
    require("@/assets/landingvideo.mp4"),
    (player) => {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  );

  // Auto-play landing video on mount
  useEffect(() => {
    if (showLandingVideo && landingPlayer) {
      console.log("🎬 Playing landing video");
      landingPlayer.play();
    }
  }, [showLandingVideo]);

  // Listen for landing video end
  useEffect(() => {
    if (!landingPlayer) return;

    const checkVideoEnd = setInterval(() => {
      if (
        landingPlayer.currentTime > 0 &&
        landingPlayer.currentTime >= landingPlayer.duration - 0.5
      ) {
        console.log("✅ Landing video ended");
        setShowLandingVideo(false);
        setLandingVideoEnded(true);
        clearInterval(checkVideoEnd);
      }
    }, 500);

    return () => clearInterval(checkVideoEnd);
  }, [landingPlayer]);

  // Fetch videos after landing video
  useEffect(() => {
    if (!landingVideoEnded) return;

    let isMounted = true;

    const fetchVideos = async () => {
      try {
        setIsFetchingVideos(true);
        setError(null);

        const data = await VideoService.getVideos();

        if (isMounted) {
          setVideos(data);
          console.log("✅ Videos loaded successfully:", data.length);
        }
      } catch (err) {
        console.error("❌ Error fetching videos:", err);

        if (isMounted) {
          setVideos([]);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load videos. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setIsFetchingVideos(false);
        }
      }
    };

    fetchVideos();

    return () => {
      isMounted = false;
    };
  }, [landingVideoEnded]);

  const handleVideoSelect = (video: VideoData) => {
    console.log("🎬 Selected video:", video.title);
    setSelectedVideo(video);
  };

  const handleVideoEnd = () => {
    console.log("⏹ Video ended, returning to grid");
    setSelectedVideo(null);
  };

  const handleBack = () => {
    console.log("🔙 Back pressed, returning to grid");
    setSelectedVideo(null);
  };

  const handleRetry = () => {
    console.log("🔄 Retrying video load");
    setIsFetchingVideos(true);
    setError(null);

    VideoService.getVideos()
      .then((data) => {
        setVideos(data);
        console.log("✅ Videos loaded on retry:", data.length);
      })
      .catch((err) => {
        console.error("❌ Error on retry:", err);
        setError("Failed to load videos. Please check your connection.");
        setVideos([]);
      })
      .finally(() => {
        setIsFetchingVideos(false);
      });
  };

  // Show landing video first
  if (showLandingVideo) {
    return (
      <View style={styles.landingContainer}>
        <VideoView
          style={styles.landingVideo}
          player={landingPlayer}
          nativeControls={false}
          contentFit="contain"
        />
      </View>
    );
  }

  // Show video player when video is selected
  if (selectedVideo) {
    return (
      <VideoPlayer
        video={selectedVideo}
        onVideoEnd={handleVideoEnd}
        onBack={handleBack}
      />
    );
  }

  // Show main grid
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Error State */}
      {error && !isFetchingVideos && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryButton} onPress={handleRetry}>
            Retry
          </Text>
        </View>
      )}

      {/* Video Grid */}
      <VideoGrid
        videos={videos}
        onVideoSelect={handleVideoSelect}
        isLoading={isFetchingVideos}
      />
    </ThemedView>
  );
}

const useHomeScreenStyles = () => {
  const scale = useScale();
  const { width, height } = Dimensions.get("window");

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    landingContainer: {
      flex: 1,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
    },
    landingVideo: {
      width,
      height,
      backgroundColor: "#000",
    },
    header: {
      padding: 5 * scale,
      backgroundColor: "#000000ff",
    },
    logo: {
      width: 150 * scale,
      height: 60 * scale,
    },
    errorContainer: {
      padding: 20 * scale,
      margin: 16 * scale,
      backgroundColor: "rgba(27, 22, 22, 0.1)",
      borderRadius: 8 * scale,
      borderLeftWidth: 4,
      borderLeftColor: "#ff6b6b",
      alignItems: "center",
    },
    errorText: {
      fontSize: 14 * scale,
      color: "#ff6b6b",
      textAlign: "center",
      marginBottom: 12 * scale,
      fontWeight: "500",
    },
    retryButton: {
      color: "#007AFF",
      fontSize: 14 * scale,
      fontWeight: "600",
      paddingVertical: 8 * scale,
      paddingHorizontal: 16 * scale,
      backgroundColor: "rgba(0, 122, 255, 0.15)",
      borderRadius: 6 * scale,
      overflow: "hidden",
    },
  });
};
