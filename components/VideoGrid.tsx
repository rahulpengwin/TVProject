// components/VideoGrid.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  Image,
  Dimensions,
  Platform,
  TVEventHandler,
  HWEvent,
  ActivityIndicator
} from 'react-native';
import { VideoData } from '@/services/VideoService';
import { useScale } from '@/hooks/useScale';

interface VideoGridProps {
  videos: VideoData[];
  onVideoSelect: (video: VideoData) => void;
  featuredVideo?: VideoData;
}

export function VideoGrid({ videos, onVideoSelect, featuredVideo }: VideoGridProps) {
  const scale = useScale();
  const styles = useVideoGridStyles();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  const handleVideoPress = (video: VideoData) => {
    onVideoSelect(video);
  };

  const handleImageError = (videoId: string) => {
    setImageLoadErrors(prev => new Set([...prev, videoId]));
  };

  const renderFeaturedVideo = () => {
    if (!featuredVideo) return null;

    const focused = focusedItem === `featured-${featuredVideo.id}`;
    const hasImageError = imageLoadErrors.has(featuredVideo.id);

    return (
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <Pressable
          style={[
            styles.featuredCard,
            focused && styles.featuredCardFocused
          ]}
          onPress={() => handleVideoPress(featuredVideo)}
          onFocus={() => setFocusedItem(`featured-${featuredVideo.id}`)}
          onBlur={() => setFocusedItem(null)}
          focusable={Platform.isTV}
        >
          {!hasImageError ? (
            <Image
              source={{ uri: featuredVideo.thumbnail }}
              style={styles.featuredThumbnail}
              resizeMode="cover"
              onError={() => handleImageError(featuredVideo.id)}
            />
          ) : (
            <View style={[styles.featuredThumbnail, styles.placeholderContainer]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          <View style={styles.featuredInfo}>
            <Text style={styles.featuredTitle}>{featuredVideo.title}</Text>
            <Text style={styles.featuredDescription}>{featuredVideo.description}</Text>
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredCategory}>{featuredVideo.category}</Text>
              {featuredVideo.year && (
                <Text style={styles.featuredYear}>{featuredVideo.year}</Text>
              )}
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderVideoItem = ({ item, index }: { item: VideoData; index: number }) => {
    const focused = focusedItem === item.id;
    const hasImageError = imageLoadErrors.has(item.id);

    return (
      <Pressable
        style={[
          styles.videoCard,
          focused && styles.videoCardFocused,
          focusedItem === item.id && styles.videoCardFocused
        ]}
        onPress={() => handleVideoPress(item)}
        onFocus={() => setFocusedItem(item.id)}
        onBlur={() => setFocusedItem(null)}
        focusable={Platform.isTV}
      >
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
        <View style={styles.videoInfo}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.metaInfo}>
            <Text style={styles.category}>{item.category}</Text>
            {item.year && (
              <Text style={styles.year}>{item.year}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const getItemLayout = (data: any, index: number) => {
    const { width } = Dimensions.get('window');
    const itemsPerRow = Platform.isTV ? 4 : 3;
    const itemWidth = (width - (40 * scale) - ((itemsPerRow - 1) * 15 * scale)) / itemsPerRow;
    const itemHeight = itemWidth * 0.75 + 100 * scale; // Aspect ratio + info height
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
        <Text style={styles.sectionTitle}>All Videos</Text>
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={item => item.id}
          numColumns={Platform.isTV ? 4 : 3}
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
  const { width } = Dimensions.get('window');
  const itemsPerRow = Platform.isTV ? 4 : 3;
  const cardWidth = (width - (40 * scale) - ((itemsPerRow - 1) * 15 * scale)) / itemsPerRow;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    featuredSection: {
      padding: 20 * scale,
      backgroundColor: '#fff',
    },
    sectionTitle: {
      fontSize: Platform.isTV ? 32 * scale : 24 * scale,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 15 * scale,
    },
    featuredCard: {
      backgroundColor: '#fff',
      borderRadius: 15 * scale,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      overflow: 'hidden',
    },
    featuredCardFocused: {
      transform: [{ scale: Platform.isTV ? 1.03 : 1.02 }],
      shadowOpacity: 0.25,
      elevation: 12,
    },
    featuredThumbnail: {
      width: '100%',
      height: Platform.isTV ? 300 * scale : 200 * scale,
    },
    featuredInfo: {
      padding: 20 * scale,
    },
    featuredTitle: {
      fontSize: Platform.isTV ? 28 * scale : 20 * scale,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 8 * scale,
    },
    featuredDescription: {
      fontSize: Platform.isTV ? 20 * scale : 16 * scale,
      color: '#666',
      marginBottom: 12 * scale,
      lineHeight: Platform.isTV ? 28 * scale : 22 * scale,
    },
    featuredMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15 * scale,
    },
    featuredCategory: {
      fontSize: Platform.isTV ? 18 * scale : 14 * scale,
      color: '#007AFF',
      fontWeight: '600',
    },
    featuredYear: {
      fontSize: Platform.isTV ? 18 * scale : 14 * scale,
      color: '#999',
    },
    gridSection: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    grid: {
      padding: 20 * scale,
    },
    row: {
      justifyContent: 'space-between',
      marginBottom: 20 * scale,
    },
    videoCard: {
      width: cardWidth,
      backgroundColor: '#fff',
      borderRadius: 12 * scale,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    videoCardFocused: {
      transform: [{ scale: Platform.isTV ? 1.08 : 1.05 }],
      shadowOpacity: 0.2,
      elevation: 8,
    },
    thumbnail: {
      width: '100%',
      height: cardWidth * 0.6,
      backgroundColor: '#f0f0f0',
    },
    placeholderContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e0e0e0',
    },
    placeholderText: {
      color: '#999',
      fontSize: 12 * scale,
      fontWeight: '500',
    },
    videoInfo: {
      padding: 12 * scale,
    },
    title: {
      fontSize: Platform.isTV ? 18 * scale : 14 * scale,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 8 * scale,
      lineHeight: Platform.isTV ? 24 * scale : 18 * scale,
    },
    metaInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4 * scale,
    },
    category: {
      fontSize: Platform.isTV ? 16 * scale : 12 * scale,
      color: '#007AFF',
      fontWeight: '500',
    },
    year: {
      fontSize: Platform.isTV ? 14 * scale : 11 * scale,
      color: '#aaa',
    },
  });
};