export interface RssPodcastEpisode {
  id: string;
  title: string;
  description?: string;
  audioUrl: string;
  durationMs?: number;
  imageUrl?: string;
  publishedAt?: string;
}

export interface RssPodcastFeed {
  title: string;
  description?: string;
  imageUrl?: string;
  episodes: RssPodcastEpisode[];
}
