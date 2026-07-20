import type { PodcastSource } from "../local/local-media-types";

export const curatedPodcasts: PodcastSource[] = [
  {
    id: "japanese-with-shun",
    title: "Japanese with Shun",
    description: "Beginner-friendly Japanese listening practice.",
    feedUrl: "https://feeds.redcircle.com/e8ab057c-683d-4375-a197-2dcc42d4f851",
    source: "curated",
  },
  {
    id: "nihongo-con-teppei",
    title: "Nihongo con Teppei",
    description: "Short conversational Japanese episodes.",
    feedUrl: "https://nihongoconteppei.com/feed/podcast",
    source: "curated",
  },
];
