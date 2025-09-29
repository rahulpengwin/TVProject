// services/VideoService.ts
export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: any; // For local images
  duration: number;
  videoSource: any; // For local video files
  category: string;
}

export interface AdData {
  id: string;
  title: string;
  videoSource: any; // For local ad videos
  duration: number;
  skipAfter: number;
}

export class VideoService {
  private static videos: VideoData[] = [
    {
      id: '1',
      title: 'Nature Documentary',
      description: 'Beautiful nature scenes from around the world',
      thumbnail: require('../assets/videos/thumbnails/video1.jpg'),
      duration: 600,
      
      videoSource: require('../assets/videos/video1.mp4'),
      category: 'Documentary'
    },
    {
      id: '2', 
      title: 'Cooking Tutorial',
      description: 'Learn to cook amazing dishes',
      thumbnail: require('../assets/videos/thumbnails/video2.jpg'),
      duration: 480,
      videoSource: require('../assets/videos/video2.mp4'),
      category: 'Lifestyle'
    },
    // {
    //   id: '3',
    //   title: 'Music Performance',
    //   description: 'Live music concert highlights',
    //   thumbnail: require('../assets/videos/thumbnails/music_thumb.jpg'),
    //   duration: 720,
    //   videoSource: require('../assets/videos/music_performance.mp4'),
    //   category: 'Music'
    // },
    // {
    //   id: '4',
    //   title: 'Tech Review',
    //   description: 'Latest technology product reviews',
    //   thumbnail: require('../assets/videos/thumbnails/tech_thumb.jpg'),
    //   duration: 540,
    //   videoSource: require('../assets/videos/tech_review.mp4'),
    //   category: 'Technology'
    // },
    // {
    //   id: '5',
    //   title: 'Travel Vlog',
    //   description: 'Explore amazing destinations',
    //   thumbnail: require('../assets/videos/thumbnails/travel_thumb.jpg'),
    //   duration: 660,
    //   videoSource: require('../assets/videos/travel_vlog.mp4'),
    //   category: 'Travel'
    // }
  ];

  private static ads: AdData[] = [
    {
      id: 'ad1',
      title: 'Product Advertisement',
      videoSource: require('../assets/ads/sample_ad.mp4'),
      duration: 15,
      skipAfter: 5
    },
    // {
    //   id: 'ad2',
    //   title: 'Service Promotion',
    //   videoSource: require('../assets/ads/service_ad.mp4'),
    //   duration: 20,
    //   skipAfter: 5
    // },
    // {
    //   id: 'ad3',
    //   title: 'Brand Commercial',
    //   videoSource: require('../assets/ads/brand_ad.mp4'),
    //   duration: 12,
    //   skipAfter: 5
    // }
  ];

  static getVideos(): VideoData[] {
    return this.videos;
  }

  static getVideosByCategory(category: string): VideoData[] {
    return this.videos.filter(video => video.category === category);
  }

  static getCategories(): string[] {
    return [...new Set(this.videos.map(video => video.category))];
  }

  static getRandomAd(): AdData {
    return this.ads[Math.floor(Math.random() * this.ads.length)];
  }

  static getVideoById(id: string): VideoData | undefined {
    return this.videos.find(video => video.id === id);
  }
}
