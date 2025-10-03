// services/VideoService.ts

export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string; // Changed to string for external URLs
  duration: number;
  videoSource: string; // Changed to string for external URLs
  category: string;
  genre?: string;
  rating?: string;
  year?: number;
}

export interface AdData {
  id: string;
  title: string;
  videoSource: string; // Changed to string for external URLs
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
      thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
      duration: 600,
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      category: 'Documentary',
      genre: 'Nature',
      rating: 'PG',
      year: 2023
    },
    {
      id: '2',
      title: 'Cooking Tutorial',
      description: 'Learn to cook amazing dishes',
      thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
      duration: 480,
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      category: 'Lifestyle',
      genre: 'Cooking',
      rating: 'G',
      year: 2023
    },
    {
      id: '3',
      title: 'Wildlife Adventure',
      description: 'Explore the animal kingdom',
      thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
      duration: 540,
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      category: 'Documentary',
      genre: 'Wildlife',
      rating: 'PG',
      year: 2024
    },
    {
      id: '4',
      title: 'Cooking Masterclass',
      description: 'Advanced cooking techniques',
      thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
      duration: 720,
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      category: 'Lifestyle',
      genre: 'Education',
      rating: 'G',
      year: 2024
    },
    {
      id: '5',
      title: 'Nature Sounds',
      description: 'Relaxing natural environments',
      thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
      duration: 480,
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      category: 'Entertainment',
      genre: 'Relaxation',
      rating: 'G',
      year: 2023
    },
    {
      id: '6',
      title: 'Sci-Fi Adventure',
      description: 'Journey through space and time',
      thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
      duration: 540,
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      category: 'Entertainment',
      genre: 'Sci-Fi',
      rating: 'PG-13',
      year: 2024
    },
    {
      id: '7',
      title: 'Tech Innovation',
      description: 'Latest technology trends and innovations',
      thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg',
      duration: 450,
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      category: 'Technology',
      genre: 'Education',
      rating: 'G',
      year: 2024
    }
  ];

  private static ads: AdData[] = [
    {
      id: 'ad1',
      title: 'Premium Streaming Service',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
      duration: 15,
      skipAfter: 5,
      advertiser: 'StreamPlus',
      clickThroughUrl: 'https://streamplus.com'
    },
    {
      id: 'ad2',
      title: 'Smart TV Promotion',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      duration: 20,
      skipAfter: 5,
      advertiser: 'TechBrand',
      clickThroughUrl: 'https://techbrand.com'
    },
    {
      id: 'ad3',
      title: 'Food Delivery App',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
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

  // Additional methods for external content management
  static async validateVideoUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  static addCustomVideo(videoData: Omit<VideoData, 'id'>): VideoData {
    const newId = (this.videos.length + 1).toString();
    const newVideo: VideoData = {
      id: newId,
      ...videoData
    };
    this.videos.push(newVideo);
    return newVideo;
  }

  static removeVideo(id: string): boolean {
    const index = this.videos.findIndex(video => video.id === id);
    if (index !== -1) {
      this.videos.splice(index, 1);
      return true;
    }
    return false;
  }
}