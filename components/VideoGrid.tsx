// components/VideoGrid.tsx
import React from 'react';
import { View, FlatList, StyleSheet, Pressable, Text, Image, Dimensions } from 'react-native';
import { VideoData } from '@/services/VideoService';
import { useScale } from '@/hooks/useScale';

interface VideoGridProps {
  videos: VideoData[];
  onVideoSelect: (video: VideoData) => void;
}

export function VideoGrid({ videos, onVideoSelect }: VideoGridProps) {
  const scale = useScale();
  const styles = useVideoGridStyles();

  const renderVideoItem = ({ item }: { item: VideoData }) => (
    <Pressable 
      style={({ focused }) => [
        styles.videoCard,
        focused && styles.videoCardFocused
      ]}
      onPress={() => onVideoSelect(item)}
    >
      {/* Fixed: Use item.thumbnail directly for local images */}
      <Image source={item.thumbnail} style={styles.thumbnail} resizeMode="cover" />
      <View style={styles.videoInfo}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.duration}>
          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <FlatList
      data={videos}
      renderItem={renderVideoItem}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={styles.row}
    />
  );
}

const useVideoGridStyles = () => {
  const scale = useScale();
  const { width } = Dimensions.get('window');
  const cardWidth = (width - 80 * scale) / 3; // Adjusted for better spacing
  
  return StyleSheet.create({
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
      elevation: 3,
      overflow: 'hidden', // Ensures border radius works properly
    },
    videoCardFocused: {
      transform: [{ scale: 1.05 }],
      shadowOpacity: 0.2,
      elevation: 6,
    },
    thumbnail: {
      width: '100%',
      height: 120 * scale,
      backgroundColor: '#f0f0f0', // Fallback background
    },
    videoInfo: {
      padding: 12 * scale,
    },
    title: {
      fontSize: 14 * scale,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 5 * scale,
    },
    category: {
      fontSize: 12 * scale,
      color: '#666',
      marginBottom: 5 * scale,
    },
    duration: {
      fontSize: 12 * scale,
      color: '#999',
    },
  });
};
