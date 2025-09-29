
// services/VideoService.ts

export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: any; // For local images
  duration: number;
  videoSource: any; // For local video files
  category: string;
  genre?: string;
  rating?: string;
  year?: number;
}

export interface AdData {
  id: string;
  title: string;
  videoSource: any; // For local ad videos
  duration: number;
  skipAfter: number;
  advertiser?: string;
  clickThroughUrl?: string;
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
      category: 'Documentary',
      genre: 'Nature',
      rating: 'PG',
      year: 2023
    },
    {
      id: '2',
      title: 'Cooking Tutorial',
      description: 'Learn to cook amazing dishes',
      thumbnail: require('../assets/videos/thumbnails/video2.jpg'),
      duration: 480,
      videoSource: require('../assets/videos/video2.mp4'),
      category: 'Lifestyle',
      genre: 'Cooking',
      rating: 'G',
      year: 2023
    },
    // Using the same assets for additional content with different titles
    {
      id: '3',
      title: 'Wildlife Adventure',
      description: 'Explore the animal kingdom',
      thumbnail: require('../assets/videos/thumbnails/video1.jpg'), // Reusing existing thumbnail
      duration: 540,
      videoSource: require('../assets/videos/video1.mp4'), // Reusing existing video
      category: 'Documentary',
      genre: 'Wildlife',
      rating: 'PG',
      year: 2024
    },
    {
      id: '4',
      title: 'Cooking Masterclass',
      description: 'Advanced cooking techniques',
      thumbnail: require('../assets/videos/thumbnails/video2.jpg'), // Reusing existing thumbnail
      duration: 720,
      videoSource: require('../assets/videos/video2.mp4'), // Reusing existing video
      category: 'Lifestyle',
      genre: 'Education',
      rating: 'G',
      year: 2024
    },
    {
      id: '5',
      title: 'Nature Sounds',
      description: 'Relaxing natural environments',
      thumbnail: require('../assets/videos/thumbnails/video1.jpg'), // Reusing existing thumbnail
      duration: 480,
      videoSource: require('../assets/videos/video1.mp4'), // Reusing existing video
      category: 'Entertainment',
      genre: 'Relaxation',
      rating: 'G',
      year: 2023
    }
  ];

  private static ads: AdData[] = [
    {
      id: 'ad1',
      title: 'Premium Streaming Service',
      videoSource: require('../assets/ads/sample_ad.mp4'), // Using existing ad file
      duration: 15,
      skipAfter: 5,
      advertiser: 'StreamPlus',
      clickThroughUrl: 'https://streamplus.com'
    },
    // Create multiple ads using the same video file but different metadata
    {
      id: 'ad2',
      title: 'Smart TV Promotion',
      videoSource: require('../assets/ads/sample_ad.mp4'), // Reusing existing ad
      duration: 20,
      skipAfter: 5,
      advertiser: 'TechBrand',
      clickThroughUrl: 'https://techbrand.com'
    },
    {
      id: 'ad3',
      title: 'Food Delivery App',
      videoSource: require('../assets/ads/sample_ad.mp4'), // Reusing existing ad
      duration: 12,
      skipAfter: 5,
      advertiser: 'QuickEats',
      clickThroughUrl: 'https://quickeats.com'
    }
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

  static getFeaturedVideos(): VideoData[] {
    return this.videos.slice(0, 3);
  }

  static searchVideos(query: string): VideoData[] {
    const lowercaseQuery = query.toLowerCase();
    return this.videos.filter(video =>
      video.title.toLowerCase().includes(lowercaseQuery) ||
      video.description.toLowerCase().includes(lowercaseQuery) ||
      video.category.toLowerCase().includes(lowercaseQuery)
    );
  }
}