// app/(tabs)/index.tsx

import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { VideoGrid } from "@/components/VideoGrid";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoService, VideoData } from "@/services/VideoService";
import { ThemedView } from "@/components/ThemedView";
import { useScale } from "@/hooks/useScale";

export default function HomeScreen() {
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [videos,setVideos] = useState<VideoData[]>([]);
  const styles = useHomeScreenStyles();

  useEffect(()=>{

    let isMounted= true;
    VideoService.getVideos()
    .then(data => {
      if(isMounted)setVideos(data);
    }).catch(err=>{
      console.log(err);
      if(isMounted) setVideos([]);
    });
    return ()=>{
      isMounted =false
    }
  },[]);

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
        <Text style={styles.headerTitle}>
          YogaLand <Text style={{ color: "orange" }}>TV</Text>
        </Text>
      </View>

      <VideoGrid videos={videos} onVideoSelect={handleVideoSelect} />
    </ThemedView>
  );
}

const useHomeScreenStyles = () => {
  const scale = useScale();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0000",
    },
    header: {
      padding: 20 * scale,
      paddingTop: 20 * scale,
      backgroundColor: "#0000",
      borderBottomWidth: 0.4,
      borderBottomColor: "#00000046",
    },
    headerTitle: {
      fontSize: 22 * scale,
      fontWeight: "bold",
      color: "#ffff",
    },
  });
};
