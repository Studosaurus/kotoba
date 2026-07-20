import type { PodcastSource } from "../local/local-media-types";

export const curatedPodcasts: PodcastSource[] = [
  {
    id: "japanese-with-shun",
    title: "Japanese with Shun",
    description: "Beginner-friendly Japanese listening practice.",
    feedUrl: "https://feeds.redcircle.com/e8ab057c-683d-4375-a197-2dcc42d4f851",
    source: "curated",
    difficulty: 2,
    learningFeatures: ["Clear speech", "N5–N4", "Solo host"],
  },
  {
    id: "nihongo-con-teppei",
    title: "Nihongo con Teppei",
    description: "Short conversational Japanese episodes.",
    feedUrl: "https://nihongoconteppei.com/feed/podcast",
    source: "curated",
    difficulty: 2,
    learningFeatures: ["Short episodes", "Clear speech", "Natural Japanese"],
  },
  {
    id: "nhk-easy-japanese",
    title: "Easy Japanese: Conversation Lessons",
    description: "Structured lessons for first-time Japanese learners from NHK WORLD-JAPAN.",
    feedUrl: "https://www3.nhk.or.jp/nhkworld/lesson/en/rss/podcast.xml",
    source: "curated",
    difficulty: 1,
    learningFeatures: ["Guided lessons", "Slow speech", "Explanations"],
    attribution: "Official NHK WORLD-JAPAN feed",
  },
  {
    id: "hiki-biki-archive",
    title: "ひいきびいき",
    description: "Approachable, natural conversation between two native Japanese speakers.",
    feedUrl: "https://fourble.co.uk/hikibiki-240623-0.rss",
    source: "curated",
    difficulty: 3,
    learningFeatures: ["Natural conversation", "Two hosts", "Long episodes"],
    availability: "archive",
    attribution: "Community archive provided through Fourble",
  },
];
