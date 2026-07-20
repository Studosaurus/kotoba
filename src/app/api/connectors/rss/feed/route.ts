import { NextResponse, type NextRequest } from "next/server";
import type { RssPodcastEpisode, RssPodcastFeed } from "@/connectors/rss/types";

const MAX_FEED_BYTES = 2_000_000;
const MAX_EPISODES_PER_FEED = 500;

export async function GET(request: NextRequest) {
  const feedUrl = request.nextUrl.searchParams.get("url");

  if (!feedUrl) {
    return NextResponse.json({ error: "Missing feed URL." }, { status: 400 });
  }

  let url: URL;

  try {
    url = new URL(feedUrl);
  } catch {
    return NextResponse.json({ error: "Invalid feed URL." }, { status: 400 });
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return NextResponse.json({ error: "Feed URL must be HTTP or HTTPS." }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch podcast feed." }, { status: 502 });
    }

    const body = await response.text();

    if (body.length > MAX_FEED_BYTES) {
      return NextResponse.json({ error: "Podcast feed is too large." }, { status: 413 });
    }

    return NextResponse.json(parsePodcastFeed(body));
  } catch {
    return NextResponse.json({ error: "Could not read podcast feed." }, { status: 502 });
  }
}

function parsePodcastFeed(xml: string): RssPodcastFeed {
  const channel = firstMatch(xml, /<channel[\s\S]*?<\/channel>/i) ?? xml;
  const imageUrl =
    firstMatch(channel, /<itunes:image[^>]+href=["']([^"']+)["'][^>]*>/i) ??
    firstMatch(channel, /<image>[\s\S]*?<url>([\s\S]*?)<\/url>[\s\S]*?<\/image>/i);

  return {
    title: decodeXml(firstTag(channel, "title") ?? "Podcast"),
    description: cleanDescription(firstTag(channel, "description")),
    imageUrl,
    episodes: parseEpisodes(channel),
  };
}

function parseEpisodes(channel: string): RssPodcastEpisode[] {
  return Array.from(channel.matchAll(/<item[\s\S]*?<\/item>/gi))
    .map((match, index): RssPodcastEpisode | null => {
      const item = match[0];
      const audioUrl = firstMatch(item, /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i);

      if (!audioUrl) {
        return null;
      }

      return {
        id: firstTag(item, "guid") ?? `${index}-${audioUrl}`,
        title: decodeXml(firstTag(item, "title") ?? "Episode"),
        description: cleanDescription(firstTag(item, "description")),
        audioUrl,
        durationMs: parseDuration(firstTag(item, "itunes:duration")),
        imageUrl: firstMatch(item, /<itunes:image[^>]+href=["']([^"']+)["'][^>]*>/i),
        publishedAt: parseDate(firstTag(item, "pubDate")),
      } satisfies RssPodcastEpisode;
    })
    .filter((episode): episode is RssPodcastEpisode => Boolean(episode))
    .slice(0, MAX_EPISODES_PER_FEED);
}

function firstTag(xml: string, tag: string) {
  return firstMatch(xml, new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
}

function firstMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1]?.trim();
}

function cleanDescription(value?: string) {
  if (!value) {
    return undefined;
  }

  return decodeXml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value: string) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replace(/&#(\d+);/g, (_, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) => String.fromCodePoint(parseInt(codePoint, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function parseDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const time = Date.parse(decodeXml(value));
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function parseDuration(value?: string) {
  if (!value) {
    return undefined;
  }

  const parts = value.split(":").map(Number);

  if (parts.some(Number.isNaN)) {
    const seconds = Number(value);
    return Number.isNaN(seconds) ? undefined : seconds * 1000;
  }

  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return seconds * 1000;
}
