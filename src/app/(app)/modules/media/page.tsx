import { PodcastMediaExperience } from "@/modules/media/components/podcast-media-experience";

export default async function MediaModulePage({
  searchParams,
}: {
  searchParams: Promise<{ podcast?: string }>;
}) {
  const { podcast } = await searchParams;
  return <PodcastMediaExperience initialPodcastId={podcast} />;
}
