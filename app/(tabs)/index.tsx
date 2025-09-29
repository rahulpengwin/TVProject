// app/(tabs)/index.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { VideoGrid } from '@/components/VideoGrid';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoService, VideoData } from '@/services/VideoService';
import { ThemedView } from '@/components/ThemedView';
import { useScale } from '@/hooks/useScale';

export default function HomeScreen() {
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [videos] = useState(VideoService.getVideos());
  const styles = useHomeScreenStyles();

  const handleVideoSelect = (video: VideoData) => {
    setSelectedVideo(video);
  };

  const handleVideoEnd = () => {
    setSelectedVideo(null);
  };

  const handleBack = () => {
    setSelectedVideo(null);
  };

  if (selectedVideo) {
    return (
      <VideoPlayer 
        video={selectedVideo}
        onVideoEnd={handleVideoEnd}
        onBack={handleBack}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>StreamTV</Text>
        <Text style={styles.headerSubtitle}>Watch your favorite content</Text>
      </View>
      
      <VideoGrid 
        videos={videos}
        onVideoSelect={handleVideoSelect}
      />
    </ThemedView>
  );
}

const useHomeScreenStyles = () => {
  const scale = useScale();
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    header: {
      padding: 20 * scale,
      paddingTop: 50 * scale,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
      fontSize: 28 * scale,
      fontWeight: 'bold',
      color: '#333',
    },
    headerSubtitle: {
      fontSize: 16 * scale,
      color: '#666',
      marginTop: 5 * scale,
    },
  });
};
