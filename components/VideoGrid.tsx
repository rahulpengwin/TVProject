
// components/VideoGrid.tsx
import React, { useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { VideoData } from "@/services/VideoService";
import { useScale } from "@/hooks/useScale";
import Icon from "react-native-vector-icons/FontAwesome";

interface VideoGridProps {
  videos: VideoData[];
  onVideoSelect: (video: VideoData) => void;
  featuredVideo?: VideoData;
}

export function VideoGrid({
  videos,
  onVideoSelect,
  featuredVideo,
}: VideoGridProps) {
  const scale = useScale();
  const styles = useVideoGridStyles();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(
    new Set()
  );

  const handleVideoPress = (video: VideoData) => {
    onVideoSelect(video);
  };

  const handleImageError = (videoId: string) => {
    setImageLoadErrors((prev) => new Set([...prev, videoId]));
  };

  const renderFeaturedVideo = () => {
    if (!featuredVideo) return null;

    const focused = focusedItem === `featured-${featuredVideo.id}`;
    const hasImageError = imageLoadErrors.has(featuredVideo.id);
    return (
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <Pressable
          style={[styles.featuredCard, focused && styles.featuredCardFocused]}
          onPress={() => handleVideoPress(featuredVideo)}
          onFocus={() => setFocusedItem(`featured-${featuredVideo.id}`)}
          onBlur={() => setFocusedItem(null)}
          focusable={Platform.isTV}
        >
          <View style={{ position: "relative" }}>
            {!hasImageError ? (
              <Image
                source={{ uri: featuredVideo.thumbnail }}
                style={styles.featuredThumbnail}
                resizeMode="cover"
                onError={() => handleImageError(featuredVideo.id)}
              />
            ) : (
              <View
                style={[styles.featuredThumbnail, styles.placeholderContainer]}
              >
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle}>{featuredVideo.title}</Text>
              <Text style={styles.featuredDescription}>
                {featuredVideo.description}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

const renderVideoItem = ({
  item,
  index,
}: {
  item: VideoData;
  index: number;
}) => {
  const gap = 12 * scale;
  const itemsPerRow = 3;
  const isLastInRow = (index + 1) % itemsPerRow === 0;

  const focused = focusedItem === item.id;
  const hasImageError = imageLoadErrors.has(item.id);

  return (
    <Pressable
      style={[
        styles.videoCard,
        !isLastInRow && { marginRight: gap },
        focused && styles.videoCardFocused,
      ]}
      onPress={() => handleVideoPress(item)}
      onFocus={() => setFocusedItem(item.id)}
      onBlur={() => setFocusedItem(null)}
      focusable={Platform.isTV}
    >
      <View style={{ position: "relative" }}>
        {!hasImageError ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => handleImageError(item.id)}
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderContainer]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {focused && (
          <View style={styles.playIconOverlay}>
            <Icon name="play" size={40} color="orange" />
          </View>
        )}

        {item.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {Math.floor(item.duration / 60)}:
              {String(Math.floor(item.duration % 60)).padStart(2, "0")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.videoInfo}>
        <Text style={styles.title}>{item.title}</Text>
      </View>
    </Pressable>
  );
};

  const getItemLayout = (_: any, index: number) => {
    const { width } = Dimensions.get("window");
    const sidePadding = 20 * scale;
    const gap = 12 * scale;
    const itemsPerRow = 3;
    const cardWidth =
      (width - sidePadding * 2 - gap * (itemsPerRow - 1)) / itemsPerRow;
    const itemHeight = cardWidth * 0.6 + 100 * scale;
    return {
      length: itemHeight,
      offset: itemHeight * Math.floor(index / itemsPerRow),
      index,
    };
  };

  return (
    <View style={styles.container}>
      {renderFeaturedVideo()}
      <View style={styles.gridSection}>
        <Text style={styles.sectionTitle}>Welcome to Your Yoga Journey</Text>
        <Text style={styles.subsection}>
          Stream high-quality yoga sessions anytime, anywhere. From beginner
          flows to advance practices
        </Text>
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
          getItemLayout={getItemLayout}
          removeClippedSubviews={Platform.isTV}
          maxToRenderPerBatch={Platform.isTV ? 12 : 9}
          windowSize={Platform.isTV ? 5 : 3}
        />
      </View>
    </View>
  );
}

const useVideoGridStyles = () => {
  const scale = useScale();
  const { width } = Dimensions.get("window");
  const sidePadding = 20 * scale;
  const gap = 12 * scale;
  const itemsPerRow = 3;
  const cardWidth =
    (width - sidePadding * 2 - gap * (itemsPerRow - 1)) / itemsPerRow;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#ffff",
    },
    featuredSection: {
      padding: 20 * scale,
      backgroundColor: "#ffff",
    },
    sectionTitle: {
      fontSize: Platform.isTV ? 24 * scale : 20 * scale,
      fontWeight: "bold",
      color: "#0000",
      marginBottom: 15 * scale,
      marginTop: 15 * scale,
      textAlign: "center",
    },
    subsection: {
      fontSize: Platform.isTV ? 16 * scale : 14 * scale,
      fontWeight: "normal",
      color: "#0000",
      marginBottom: 15 * scale,
      textAlign: "center",
    },
    featuredCard: {
      backgroundColor: "#ffff",
      borderRadius: 5 * scale,
      shadowColor: "#0000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      overflow: "hidden",
    },
    featuredCardFocused: {
      transform: [{ scale: Platform.isTV ? 1.03 : 1.02 }],
      shadowOpacity: 0.25,
      elevation: 12,
    },
    featuredThumbnail: {
      width: "100%",
      height: Platform.isTV ? 300 * scale : 200 * scale,
    },
    featuredInfo: {
      padding: 20 * scale,
    },
    featuredTitle: {
      fontSize: Platform.isTV ? 28 * scale : 20 * scale,
      fontWeight: "bold",
      color: "#0000",
      marginBottom: 8 * scale,
    },
    featuredDescription: {
      fontSize: Platform.isTV ? 20 * scale : 16 * scale,
      color: "#0000",
      marginBottom: 12 * scale,
      lineHeight: Platform.isTV ? 28 * scale : 22 * scale,
    },
    featuredMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 15 * scale,
    },
    featuredCategory: {
      fontSize: Platform.isTV ? 18 * scale : 14 * scale,
      color: "#007AFF",
      fontWeight: "600",
    },
    gridSection: {
      flex: 1,
      backgroundColor: "#ffff",
    },
    grid: {
      paddingHorizontal: sidePadding,
      paddingVertical: 20 * scale,
      paddingBottom: 100 * scale,
    },
    row: {
      flexDirection: "row",
      justifyContent: "flex-start",
      marginBottom: gap,
    },
    playIconOverlay: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: [{ translateX: -20 }, { translateY: -20 }],
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    durationBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: "#000000ff", // light gray
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      opacity: 0.8,
      zIndex: 10,
    },

    durationText: {
      color: "#ffff",
      fontSize: 12,
      fontWeight: "600",
    },

    videoCard: {
      width: cardWidth,
      backgroundColor: "#ffff",
       borderRadius: 12 * scale,
      shadowColor: "#0000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      overflow: "hidden",
      marginBottom: gap,
      borderWidth: 3, // Add border to unfocused state
      borderColor: "transparent", // Transparent so it doesn't show
    },
    videoCardFocused: {
      transform: [{ scale: Platform.isTV ? 1.08 : 1.05 }],
      shadowOpacity: 0.2,
      elevation: 8,
      borderWidth: 2,
      borderColor: "orange",
      borderRadius: 10,
    },
    thumbnail: {
      width: "100%",
      height: cardWidth * 0.6,
      backgroundColor: "#f0f0f063",
    },
    placeholderContainer: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#e0e0e0",
    },
    placeholderText: {
      color: "#999",
      fontSize: 12 * scale,
      fontWeight: "500",
    },
    videoInfo: {
      padding: 6 * scale,
    },
    title: {
      fontSize: Platform.isTV ? 18 * scale : 14 * scale,
      fontWeight: "bold",
      color: "#0000",
      marginBottom: 8 * scale,
      lineHeight: Platform.isTV ? 24 * scale : 18 * scale,
    },
    metaInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4 * scale,
    },
    category: {
      fontSize: Platform.isTV ? 16 * scale : 12 * scale,
      color: "#007AFF",
      fontWeight: "500",
    },
    year: {
      fontSize: Platform.isTV ? 14 * scale : 11 * scale,
      color: "#aaa",
    },
  });
};
