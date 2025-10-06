// services/VideoService.ts

export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  videoSource: string;
  category: string;
  genre?: string;
  rating?: string;
  year?: number;
}

export interface AdData {
  id: string;
  title: string;
  videoSource: string;
  duration: number;
  skipAfter: number;
  advertiser?: string;
  clickThroughUrl?: string;
  type: 'pre-roll' | 'mid-roll' | 'post-roll' | 'banner' | 'overlay';
  frequency?: number;
  targetCategory?: string[];
}

export interface AdSchedule {
  timePosition: number;
  ad: AdData;
  triggered: boolean;
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
    // Pre-roll ads
    {
      id: 'preroll1',
      title: 'Premium Streaming Service',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 15,
      skipAfter: 5,
      advertiser: 'StreamPlus',
      clickThroughUrl: 'https://streamplus.com',
      type: 'pre-roll',
      frequency: 1
    },
    {
      id: 'preroll2',
      title: 'Smart TV Promotion',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 20,
      skipAfter: 5,
      advertiser: 'TechBrand',
      clickThroughUrl: 'https://techbrand.com',
      type: 'pre-roll',
      frequency: 2
    },
    
    // Enhanced Mid-roll ads with more variety
    {
      id: 'midroll1',
      title: 'Energy Drink Commercial',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: 20,
      skipAfter: 5,
      advertiser: 'PowerBoost',
      clickThroughUrl: 'https://powerboost.com',
      type: 'mid-roll',
      frequency: 1
    },
    {
      id: 'midroll2',
      title: 'Online Learning Platform',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      duration: 18,
      skipAfter: 6,
      advertiser: 'EduPlatform',
      clickThroughUrl: 'https://eduplatform.com',
      type: 'mid-roll',
      frequency: 1,
      targetCategory: ['Technology', 'Documentary']
    },
    {
      id: 'midroll3',
      title: 'Fast Food Chain',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      duration: 15,
      skipAfter: 5,
      advertiser: 'BurgerKing',
      clickThroughUrl: 'https://burgerking.com',
      type: 'mid-roll',
      frequency: 1,
      targetCategory: ['Lifestyle', 'Entertainment']
    },
    {
      id: 'midroll4',
      title: 'Mobile Gaming App',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      duration: 25,
      skipAfter: 8,
      advertiser: 'GameStudio',
      clickThroughUrl: 'https://gamestudio.com',
      type: 'mid-roll',
      frequency: 2
    },
    {
      id: 'midroll5',
      title: 'Car Insurance Ad',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 30,
      skipAfter: 10,
      advertiser: 'SafeInsurance',
      clickThroughUrl: 'https://safeinsurance.com',
      type: 'mid-roll',
      frequency: 3
    },
    {
      id: 'midroll6',
      title: 'Fitness App Promotion',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 22,
      skipAfter: 7,
      advertiser: 'FitNow',
      clickThroughUrl: 'https://fitnow.com',
      type: 'mid-roll',
      frequency: 2,
      targetCategory: ['Entertainment', 'Lifestyle']
    },
    
    // Post-roll ads
    {
      id: 'postroll1',
      title: 'Subscribe to Premium',
      videoSource: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 10,
      skipAfter: 3,
      advertiser: 'Our Platform',
      clickThroughUrl: 'https://ourplatform.com/premium',
      type: 'post-roll',
      frequency: 1
    }
  ];

  private static videoWatchCount: { [key: string]: number } = {};
  private static lastAdShown: { [key: string]: string } = {};

  static getVideos(): VideoData[] {
    return this.videos;
  }

  static getVideosByCategory(category: string): VideoData[] {
    return this.videos.filter(video => video.category === category);
  }

  static getCategories(): string[] {
    return [...new Set(this.videos.map(video => video.category))];
  }

  static getRandomAd(type: 'pre-roll' | 'mid-roll' | 'post-roll' = 'pre-roll', videoData?: VideoData): AdData | null {
    let availableAds = this.ads.filter(ad => ad.type === type);
    
    if (videoData && videoData.category) {
      const categoryFilteredAds = availableAds.filter(ad => 
        !ad.targetCategory || ad.targetCategory.includes(videoData.category)
      );
      if (categoryFilteredAds.length > 0) {
        availableAds = categoryFilteredAds;
      }
    }
    
    const videoKey = videoData ? videoData.id : 'global';
    const watchCount = this.videoWatchCount[videoKey] || 0;
    
    availableAds = availableAds.filter(ad => {
      const frequency = ad.frequency || 1;
      return watchCount % frequency === 0;
    });
    
    if (availableAds.length === 0) return null;
    
    const lastAd = this.lastAdShown[type];
    if (availableAds.length > 1 && lastAd) {
      availableAds = availableAds.filter(ad => ad.id !== lastAd);
    }
    
    const selectedAd = availableAds[Math.floor(Math.random() * availableAds.length)];
    this.lastAdShown[type] = selectedAd.id;
    
    return selectedAd;
  }

  // Enhanced mid-roll ad scheduling - More random and YouTube-like
  static generateAdSchedule(videoData: VideoData): AdSchedule[] {
    const schedule: AdSchedule[] = [];
    const videoDuration = videoData.duration;
    
    // Only add mid-roll ads for videos longer than 3 minutes
    if (videoDuration < 180) return schedule;
    
    // Calculate number of ads based on video length (1 ad per 2-4 minutes)
    const adFrequency = 120 + Math.random() * 120; // 2-4 minutes between ads
    const maxAds = Math.floor(videoDuration / adFrequency);
    const numAds = Math.min(maxAds, 4); // Maximum 4 mid-roll ads per video
    
    console.log(`📺 Scheduling ${numAds} mid-roll ads for ${videoDuration}s video`);
    
    for (let i = 0; i < numAds; i++) {
      // Divide video into segments and place ads randomly within each segment
      const segmentStart = Math.floor((videoDuration / numAds) * i) + 60; // Start after 1 minute
      const segmentEnd = Math.floor((videoDuration / numAds) * (i + 1)) - 60; // End 1 minute before segment end
      
      // Random position within the segment
      const adPosition = segmentStart + Math.random() * (segmentEnd - segmentStart);
      
      const ad = this.getRandomAd('mid-roll', videoData);
      if (ad) {
        schedule.push({
          timePosition: Math.floor(adPosition),
          ad,
          triggered: false
        });
        console.log(`🎯 Mid-roll ad "${ad.title}" scheduled at ${Math.floor(adPosition)}s`);
      }
    }
    
    // Sort by time position
    schedule.sort((a, b) => a.timePosition - b.timePosition);
    
    return schedule;
  }

  // Add method to get next ad that should be played
  static getNextScheduledAd(schedule: AdSchedule[], currentTime: number): AdSchedule | null {
    return schedule.find(item => 
      !item.triggered && 
      currentTime >= item.timePosition &&
      currentTime <= item.timePosition + 2 // 2-second window
    ) || null;
  }

  static incrementVideoWatchCount(videoId: string): void {
    this.videoWatchCount[videoId] = (this.videoWatchCount[videoId] || 0) + 1;
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

  static addAd(adData: Omit<AdData, 'id'>): AdData {
    const newId = `${adData.type}_${this.ads.length + 1}`;
    const newAd: AdData = {
      id: newId,
      ...adData
    };
    this.ads.push(newAd);
    return newAd;
  }

  static getAdsByType(type: AdData['type']): AdData[] {
    return this.ads.filter(ad => ad.type === type);
  }

  static resetWatchCounts(): void {
    this.videoWatchCount = {};
    this.lastAdShown = {};
  }
}