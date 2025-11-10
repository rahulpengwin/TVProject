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
  type: 'pre-roll' | 'mid-roll';
  vastUrl: string;
  active: boolean;
  createdAt: string;
  // Computed/fallback fields
  videoSource?: string;
  duration?: number;
  skipAfter?: number;
  advertiser?: string;
  frequency?: number;
}

export interface AdSchedule {
  timePosition: number;
  ad: AdData;
  triggered: boolean;
}

export class VideoService {
  private static baseURL = 'https://yogalandadmin.netlify.app/';
  
  private static videosCache: VideoData[] | null = null;
  private static videosCacheTimestamp = 0;
  
  private static adsCache: AdData[] | null = null;
  private static adsCacheTimestamp = 0;
  
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private static apiClient = axios.create({
    baseURL: this.baseURL,
    timeout: 50000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  private static videoWatchCount: { [key: string]: number } = {};
  private static lastAdShown: { [key: string]: string } = {};

  // Default ad values for fallback
  private static defaultAdValues = {
    duration: 15,
    skipAfter: 5,
    frequency: 1,
    advertiser: 'Advertiser',
  };

  // ✅ Check if videos cache is valid
  private static isVideosCacheValid(): boolean {
    return (
      this.videosCache !== null &&
      Date.now() - this.videosCacheTimestamp < this.cacheTimeout
    );
  }

  // ✅ Check if ads cache is valid
  private static isAdsCacheValid(): boolean {
    return (
      this.adsCache !== null &&
      Date.now() - this.adsCacheTimestamp < this.cacheTimeout
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
    if (!forceRefresh && this.isVideosCacheValid()) {
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
      this.videosCacheTimestamp = Date.now();

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
  // ✅ Increment video watch count (tracking via API)
  static async incrementVideoWatchCount(videoId: string): Promise<void> {
  try {
    console.log(`📊 [VideoService] Tracking view for video: ${videoId}`);
    
    // API call to increment view count
    const response = await this.apiClient.put(`api/videos/${videoId}/views`);
    
    if (response.status === 200) {
      console.log(`✅ Video view posted successfully for ${videoId}`);
    } else {
      console.warn(`⚠️ Failed to post video view for ${videoId}: ${response.statusText}`);
    }
    
  } catch (error) {
    console.warn(`❌ [VideoService] Failed to track video view for ${videoId}:`, error);
  }
}

  // ✅ Clear cache
  static clearCache(): void {
    this.videosCache = null;
    this.videosCacheTimestamp = 0;
    this.adsCache = null;
    this.adsCacheTimestamp = 0;
    console.log('[VideoService] Video and ads cache cleared');
  }

  // ============ AD METHODS ============

  // ✅ Parse VAST XML and extract video URL
  static async parseVastXml(vastUrl: string): Promise<string | null> {
    try {
      console.log(`🔍 [VideoService] Parsing VAST XML from: ${vastUrl}`);
      
      const response = await fetch(vastUrl);
      const vastXML = await response.text();
      
      // Simple XML parsing for React Native
      // Extract MediaFile URL from VAST XML
      const mediaFileMatch = vastXML.match(/<MediaFile[^>]*>(.*?)<\/MediaFile>/i);
      
      if (mediaFileMatch && mediaFileMatch[1]) {
        const videoUrl = mediaFileMatch[1].trim();
        console.log(`✅ [VideoService] Extracted video URL: ${videoUrl}`);
        return videoUrl;
      }
      
      console.warn('⚠️ [VideoService] No MediaFile found in VAST XML');
      return null;
    } catch (error) {
      console.error('❌ [VideoService] Failed to parse VAST XML:', error);
      return null;
    }
  }

  // ✅ Fetch all ads from API - only return active ads with fallback values
  static async getAds(forceRefresh = false): Promise<AdData[]> {
    if (!forceRefresh && this.isAdsCacheValid()) {
      console.log('[VideoService] Returning ads from cache');
      return this.adsCache!;
    }

    try {
      console.log(`[VideoService] Fetching ads from: ${this.baseURL}api/ads`);

      const response: AxiosResponse<AdData[]> = await this.apiClient.get('api/ads');
      const allAds = response.data;

      // Filter to only show active ads and apply fallback values
      const activeAds = allAds
        .filter(ad => ad.active === true)
        .map(ad => ({
          ...ad,
          videoSource: ad.vastUrl, // This will be parsed later
          duration:  this.defaultAdValues.duration,
          skipAfter:  this.defaultAdValues.skipAfter,
          frequency:  this.defaultAdValues.frequency,
          advertiser: this.defaultAdValues.advertiser,
        }));

      console.log(`[VideoService] Successfully fetched ${allAds.length} ads, ${activeAds.length} are active`);

      this.adsCache = activeAds;
      this.adsCacheTimestamp = Date.now();

      return activeAds;
    } catch (error) {
      console.error('[VideoService] Failed to fetch ads, returning empty array:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  // ✅ Get random ad by type
  static async getRandomAd(
    type: 'pre-roll' | 'mid-roll',
    videoData?: VideoData
  ): Promise<AdData | null> {
    const ads = await this.getAds();
    let availableAds = ads.filter(ad => ad.type === type);
    
    if (availableAds.length === 0) {
      console.warn(`[VideoService] No ${type} ads available`);
      return null;
    }
    
    const videoKey = videoData ? videoData.id : 'global';
    const watchCount = this.videoWatchCount[videoKey] || 0;
    
    // Filter by frequency
    availableAds = availableAds.filter(ad => {
      const frequency = ad.frequency || 1;
      return watchCount % frequency === 0;
    });
    
    if (availableAds.length === 0) return null;
    
    // Avoid showing same ad consecutively
    const lastAd = this.lastAdShown[type];
    if (availableAds.length > 1 && lastAd) {
      availableAds = availableAds.filter(ad => ad.id !== lastAd);
    }
    
    const selectedAd = availableAds[Math.floor(Math.random() * availableAds.length)];
    this.lastAdShown[type] = selectedAd.id;
    
    console.log(`🎬 [VideoService] Selected ${type} ad: "${selectedAd.title}"`);
    
    return selectedAd;
  }

  // ✅ Generate ad schedule for mid-roll ads
  static async generateAdSchedule(videoData: VideoData): Promise<AdSchedule[]> {
    const schedule: AdSchedule[] = [];
    
    const videoDuration: number = Number(videoData.duration);
    
    // Only add mid-roll ads for videos longer than 3 minutes
    if (videoDuration < 180) {
      console.log(`📺 Video too short (${videoDuration}s) for mid-roll ads`);
      return schedule;
    }
    
    const adFrequency = 120 + Math.random() * 120;
    const maxAds = Math.floor(videoDuration / adFrequency);
    const numAds = Math.min(maxAds, 4);
    
    console.log(`📺 Scheduling ${numAds} mid-roll ads for ${videoDuration}s video`);
    
    for (let i = 0; i < numAds; i++) {
      const segmentStart = Math.floor((videoDuration / numAds) * i) + 60;
      const segmentEnd = Math.floor((videoDuration / numAds) * (i + 1)) - 60;
      const adPosition = segmentStart + Math.random() * (segmentEnd - segmentStart);
      
      const ad = await this.getRandomAd('mid-roll', videoData);
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

  // ✅ Get next scheduled ad
  static getNextScheduledAd(schedule: AdSchedule[], currentTime: number): AdSchedule | null {
    return schedule.find(item => 
      !item.triggered && 
      currentTime >= item.timePosition &&
      currentTime <= item.timePosition + 2
    ) || null;
  }

  // ✅ Get ads by type
  static async getAdsByType(type: AdData['type']): Promise<AdData[]> {
    const ads = await this.getAds();
    return ads.filter(ad => ad.type === type);
  }

  // ✅ Reset watch counts
  static resetWatchCounts(): void {
    this.videoWatchCount = {};
    this.lastAdShown = {};
    console.log('[VideoService] Watch counts reset');
  }
}

export default VideoService;
