// components/VideoGrid.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { VideoData } from "@/services/VideoService";
import { useScale } from "@/hooks/useScale";
import Icon from "react-native-vector-icons/FontAwesome";

interface VideoGridProps {
  videos: VideoData[];
  onVideoSelect: (video: VideoData) => void;
  featuredVideo?: VideoData;
  isLoading?: boolean;
}

export function VideoGrid({
  videos,
  onVideoSelect,
  featuredVideo,
  isLoading = false,
}: VideoGridProps) {
  const scale = useScale();
  const styles = useVideoGridStyles();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(
    new Set()
  );
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  // Start with null to show static banner initially
  const [bannerVideo, setBannerVideo] = useState<VideoData | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Update banner when a video is focused (only after user interaction)
  useEffect(() => {
    if (focusedItem) {
      const focusedVideo = videos.find((v) => v.id === focusedItem);
      if (focusedVideo) {
        setHasUserInteracted(true); // Mark that user has interacted
        setBannerVideo(focusedVideo);
      }
    }
  }, [focusedItem, videos]);

  const handleVideoPress = (video: VideoData) => {
    setHasUserInteracted(true); // Mark interaction
    setBannerVideo(video);
    onVideoSelect(video);
  };

  const handleImageError = (videoId: string) => {
    setImageLoadErrors((prev) => new Set([...prev, videoId]));
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  };

  const handleImageLoadStart = (videoId: string) => {
    setLoadingImages((prev) => new Set([...prev, videoId]));
  };

  const handleImageLoadEnd = (videoId: string) => {
    setLoadingImages((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  };

  // Show loading state when videos are being fetched
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  // Show empty state if no videos
  if (!isLoading && videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="video-camera" size={60 * scale} color="#ccc" />
        <Text style={styles.emptyText}>No videos available</Text>
        <Text style={styles.emptySubtext}>
          Check back later for new content
        </Text>
      </View>
    );
  }

  // Determine what to show in banner
  // Show static banner if user hasn't interacted yet
  const showStaticBanner = !hasUserInteracted && !bannerVideo;
  const displayVideo = bannerVideo;
  const hasImageError = displayVideo
    ? imageLoadErrors.has(displayVideo.id)
    : false;
  const isImageLoading = displayVideo
    ? loadingImages.has(displayVideo.id)
    : false;

  return (
    <View style={styles.container}>
      {/* Banner Section */}
      <View style={styles.bannerSection}>
        <View style={styles.bannerContainer}>
          {showStaticBanner ? (
            // Show static banner image
            <Image
              source={require("@/assets/banner.png")}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : displayVideo && !hasImageError ? (
            // Show dynamic video thumbnail
            <>
              <Image
                source={{ uri: displayVideo.thumbnail }}
                style={styles.bannerImage}
                resizeMode="cover"
                onError={() => handleImageError(displayVideo.id)}
                onLoadStart={() => handleImageLoadStart(displayVideo.id)}
                onLoadEnd={() => handleImageLoadEnd(displayVideo.id)}
              />
              {isImageLoading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="large" color="#007AFF" />
                </View>
              )}
            </>
          ) : displayVideo ? (
            // Show placeholder if video thumbnail failed to load
            <View style={[styles.bannerImage, styles.placeholderContainer]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          ) : (
            // Fallback to static banner
            <Image
              source={require("@/assets/banner.png")}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          )}

          {/* Banner Info Overlay - Only show when displaying a video */}
          {displayVideo && !showStaticBanner && (
            <View style={styles.bannerInfoOverlay}>
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {displayVideo.title}
              </Text>
              <Text style={styles.bannerDescription} numberOfLines={3}>
                {displayVideo.description}
              </Text>
              <Pressable
                style={styles.watchNowButton}
                onPress={() => onVideoSelect(displayVideo)}
              >
                <Icon name="play" size={14 * scale} color="#000" />
                <Text style={styles.watchNowText}>Watch Now</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Single Horizontal Video List */}
      <View style={styles.videoListSection}>
        <FlatList
          horizontal
          data={videos}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => {
            const focused = focusedItem === item.id;
            const hasError = imageLoadErrors.has(item.id);
            const isLoading = loadingImages.has(item.id);

            return (
              <Pressable
                style={[styles.videoCard, focused && styles.videoCardFocused]}
                onPress={() => handleVideoPress(item)}
                onFocus={() => setFocusedItem(item.id)}
                onBlur={() => setFocusedItem(null)}
                focusable={Platform.isTV}
              >
                <View style={{ position: "relative" }}>
                  {!hasError ? (
                    <>
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                        onError={() => handleImageError(item.id)}
                        onLoadStart={() => handleImageLoadStart(item.id)}
                        onLoadEnd={() => handleImageLoadEnd(item.id)}
                      />
                      {isLoading && (
                        <View style={styles.thumbnailLoadingOverlay}>
                          <ActivityIndicator size="small" color="#007AFF" />
                        </View>
                      )}
                    </>
                  ) : (
                    <View
                      style={[styles.thumbnail, styles.placeholderContainer]}
                    >
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}

                  {focused && !isLoading && (
                    <View style={styles.playIconOverlay}>
                      <Icon name="play" size={30} color="#ffD700" />
                    </View>
                  )}

                  {item.duration && (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>
                        {Math.floor(item.duration / 60)}:
                        {String(Math.floor(item.duration % 60)).padStart(
                          2,
                          "0"
                        )}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.videoInfo}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const useVideoGridStyles = () => {
  const scale = useScale();
  const { width } = Dimensions.get("window");

  // Calculate card width to fit exactly 3 cards on screen
  const horizontalPadding = 20 * scale;
  const cardGap = 18 * scale;
  const cardWidth = (width - horizontalPadding * 2 - cardGap * 2) / 3;
  const cardHeight = cardWidth * 0.6;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
      padding: 40 * scale,
    },
    loadingText: {
      marginTop: 16 * scale,
      fontSize: 16 * scale,
      color: "#666",
      fontWeight: "500",
    },
    emptyContainer: {
      flex: 1,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
      padding: 40 * scale,
    },
    emptyText: {
      marginTop: 16 * scale,
      fontSize: 18 * scale,
      color: "#fff",
      fontWeight: "600",
    },
    emptySubtext: {
      marginTop: 8 * scale,
      fontSize: 14 * scale,
      color: "#999",
    },
    imageLoadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 5,
    },
    thumbnailLoadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 5,
    },
    bannerSection: {
      width: "100%",
    },
    bannerContainer: {
      width: "100%",
      height: Platform.isTV ? 280 * scale : 220 * scale,
      position: "relative",
    },
    bannerImage: {
      width: "100%",
      height: "100%",
    },
    bannerInfoOverlay: {
      position: "absolute",
      bottom: 0,
      top: 0,
      left: 0,
      right: 0,
      padding: 20 * scale,
      paddingTop: 50 * scale,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
    },
    bannerTitle: {
      fontSize: Platform.isTV ? 26 * scale : 20 * scale,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 6 * scale,
      paddingBottom: 10 * scale,
      width: 350 * scale,
    },
    bannerDescription: {
      width: 400 * scale,
      fontSize: Platform.isTV ? 16 * scale : 13 * scale,
      color: "#ddd",
      lineHeight: Platform.isTV ? 22 * scale : 18 * scale,
      marginBottom: 16 * scale,
    },
    watchNowButton: {
      bottom:50,
      left:20,
      position:"absolute",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffD700",
      paddingVertical: 10 * scale,
      paddingHorizontal: 20 * scale,
      borderRadius: 4 * scale,
      alignSelf: "flex-start",
      gap: 8 * scale,
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    watchNowText: {
      fontSize: Platform.isTV ? 14 * scale : 12 * scale,
      fontWeight: "bold",
      color: "#000",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    videoListSection: {
      flex: 1,
      marginTop: 24 * scale,
    },
    horizontalList: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: 10 * scale,
    },
    videoCard: {
      width: cardWidth,
      backgroundColor: "#1a1a1a",
      borderRadius: 12 * scale,
      overflow: "hidden",
      marginRight: cardGap,
      borderWidth: 3,
      borderColor: "transparent",
    },
    videoCardFocused: {
      transform: [{ scale: Platform.isTV ? 1.08 : 1.05 }],
      borderColor: "#ffD700",
      shadowColor: "#ffD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 8,
    },
    thumbnail: {
      width: "100%",
      height: cardHeight,
      backgroundColor: "#2a2a2a",
    },
    placeholderContainer: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#2a2a2a",
    },
    placeholderText: {
      color: "#999",
      fontSize: 14 * scale,
      fontWeight: "500",
    },
    playIconOverlay: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: [{ translateX: -20 }, { translateY: -20 }],
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
      width: 30,
      height: 30,
      borderRadius: 20,
    },
    durationBadge: {
      position: "absolute",
      bottom: 28,
      right: 10,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      zIndex: 10,
    },
    durationText: {
      color: "#fff",
      fontSize: 12 * scale,
      fontWeight: "600",
    },
    videoInfo: {
      padding: 12 * scale,
    },
    title: {
      fontSize: Platform.isTV ? 18 * scale : 14 * scale,
      fontWeight: "600",
      color: "#fff",
      lineHeight: Platform.isTV ? 24 * scale : 18 * scale,
    },
  });
};
