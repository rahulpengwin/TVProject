// services/VideoService.ts
import axios, { AxiosResponse } from 'axios';

export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  videoUrl: string;
  views: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  private static baseURL = 'https://yogalandadmin.netlify.app/';
  
  private static videosCache: VideoData[] | null = null;
  private static cacheTimestamp = 0;
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private static apiClient = axios.create({
    baseURL: this.baseURL,
    timeout: 50000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Static ads data (unchanged)
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
    
    // Mid-roll ads
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
      targetCategory: ['Technology', 'Yoga']
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

  // ✅ Check if cache is valid
  private static isCacheValid(): boolean {
    return (
      this.videosCache !== null &&
      Date.now() - this.cacheTimestamp < this.cacheTimeout
    );
  }

  // ✅ Centralized error handler
  private static handleError(error: any, context: string): never {
    console.error(`${context} Error:`, error);

    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error(
          `Network connection failed. Check if API server is running at ${this.baseURL}`
        );
      }

      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 404:
          throw new Error(`Resource not found: ${message}`);
        case 500:
          throw new Error(`Server error: ${message}`);
        default:
          throw new Error(`API Error ${status}: ${message}`);
      }
    }

    throw new Error(`Unexpected error: ${error.message || 'Unknown error'}`);
  }

  // ✅ Fetch all videos from API - only return active videos
  static async getVideos(forceRefresh = false): Promise<VideoData[]> {
    if (!forceRefresh && this.isCacheValid()) {
      console.log('[VideoService] Returning videos from cache');
      return this.videosCache!;
    }

    try {
      console.log(`[VideoService] Fetching videos from: ${this.baseURL}api/videos`);

      const response: AxiosResponse<VideoData[]> = await this.apiClient.get('api/videos');
      const allVideos = response.data;

      // Filter to only show active videos
      const activeVideos = allVideos.filter(video => video.active === true);

      console.log(`[VideoService] Successfully fetched ${allVideos.length} videos, ${activeVideos.length} are active`);

      this.videosCache = activeVideos;
      this.cacheTimestamp = Date.now();

      return activeVideos;
    } catch (error) {
      this.handleError(error, 'Get Videos');
    }
  }

  // ✅ Fetch single video by ID from API
  static async getVideoById(id: string): Promise<VideoData | null> {
    try {
      const response: AxiosResponse<VideoData> = await this.apiClient.get(`api/videos/${id}`);
      const video = response.data;
      
      // Only return if video is active
      if (video.active) {
        return video;
      }
      
      console.warn(`[VideoService] Video with ID ${id} is not active`);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn(`[VideoService] Video with ID ${id} not found`);
        return null;
      }
      this.handleError(error, `Get Video ${id}`);
    }
  }

  // ✅ Get videos by category
  static async getVideosByCategory(category: string): Promise<VideoData[]> {
    const videos = await this.getVideos();
    return videos;
  }


  // ✅ Get featured videos
  static async getFeaturedVideos(): Promise<VideoData[]> {
    const videos = await this.getVideos();
    return videos.slice(0, 3);
  }

  // ✅ Search videos
  static async searchVideos(query: string): Promise<VideoData[]> {
    const videos = await this.getVideos();
    const lowercaseQuery = query.toLowerCase();
    return videos.filter(video =>
      video.title.toLowerCase().includes(lowercaseQuery) ||
      video.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  // ✅ Increment video watch count (tracking locally)
  static async incrementVideoWatchCount(videoId: string): Promise<void> {
    try {
      console.log(`📊 [VideoService] Tracking view for video: ${videoId}`);
      
      const viewData = {
        videoId,
        timestamp: Date.now(),
        viewedAt: new Date().toISOString()
      };
      
      this.videoWatchCount[videoId] = (this.videoWatchCount[videoId] || 0) + 1;
      
      // Optional: You can add API call here when backend is ready
      // await this.apiClient.post(`api/videos/watch/${videoId}`);
      
    } catch (error) {
      console.warn(`[VideoService] Failed to track video view for ${videoId}:`, error);
    }
  }

  // ✅ Clear cache
  static clearCache(): void {
    this.videosCache = null;
    this.cacheTimestamp = 0;
    console.log('[VideoService] Video cache cleared');
  }

  // ✅ Check API health
  static async checkApiHealth(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('api/health');
      return response.status === 200;
    } catch (error) {
      console.warn('[VideoService] /health failed, trying /videos');
      try {
        await this.apiClient.get('api/videos');
        return true;
      } catch (fallbackError) {
        console.error('[VideoService] API is not accessible:', fallbackError);
        return false;
      }
    }
  }

  // ✅ Validate video URL
  static async validateVideoUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============ AD METHODS (UNCHANGED) ============

  static getRandomAd(type: 'pre-roll' | 'mid-roll' | 'post-roll' = 'pre-roll', videoData?: VideoData): AdData | null {
    let availableAds = this.ads.filter(ad => ad.type === type);
    
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

  static generateAdSchedule(videoData: VideoData): AdSchedule[] {
    const schedule: AdSchedule[] = [];
    
    // // Convert duration string to seconds if needed
    // let videoDuration: number;
    // if (typeof videoData.duration === 'string') {
    //   // Parse duration string like "10:30" to seconds
    //   const parts = videoData.duration.split(':');
    //   videoDuration = parseInt(parts[0]) * 60 + (parts[1] ? parseInt(parts[1]) : 0);
    // } else {
    //   videoDuration = Number(videoData.duration);
    // }

      // Duration is already in seconds as a number
      const videoDuration: number = Number(videoData.duration);
    
    // Only add mid-roll ads for videos longer than 3 minutes
    if (videoDuration < 180) return schedule;
    
    const adFrequency = 120 + Math.random() * 120;
    const maxAds = Math.floor(videoDuration / adFrequency);
    const numAds = Math.min(maxAds, 4);
    
    console.log(`📺 Scheduling ${numAds} mid-roll ads for ${videoDuration}s video`);
    
    for (let i = 0; i < numAds; i++) {
      const segmentStart = Math.floor((videoDuration / numAds) * i) + 60;
      const segmentEnd = Math.floor((videoDuration / numAds) * (i + 1)) - 60;
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
    
    schedule.sort((a, b) => a.timePosition - b.timePosition);
    return schedule;
  }

  static getNextScheduledAd(schedule: AdSchedule[], currentTime: number): AdSchedule | null {
    return schedule.find(item => 
      !item.triggered && 
      currentTime >= item.timePosition &&
      currentTime <= item.timePosition + 2
    ) || null;
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

export default VideoService;
