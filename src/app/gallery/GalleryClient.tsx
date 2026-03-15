'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getNews, getEvents, getHighlights, getGalleryImagesWithTags, getPlayers, News, Event } from '@/lib/supabase';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SkeletonNewsCard } from '@/components/Skeleton';

interface GalleryItem {
  id: string;
  src: string;
  title: string;
  category: 'highlights' | 'news' | 'events' | 'gallery';
  date?: string;
  taggedPlayerIds?: number[];
}

interface PlayerOption {
  id: number;
  name: string;
}

export default function GalleryClient() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'highlights' | 'news' | 'events' | 'gallery'>('all');
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [playerFilter, setPlayerFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    async function fetchMedia() {
      try {
        const [newsRes, eventsRes, highlightsRes, galleryRes, playersRes] = await Promise.all([
          getNews(),
          getEvents(),
          getHighlights(),
          getGalleryImagesWithTags(),
          getPlayers(),
        ]);

        if (playersRes.data) {
          setPlayers(playersRes.data.map((p: any) => ({ id: p.id, name: p.name })));
        }

        const gallery: GalleryItem[] = [];

        // News images
        if (newsRes.data) {
          newsRes.data.forEach((article: News) => {
            if (article.featured_image) {
              gallery.push({
                id: `news-${article.id}`,
                src: article.featured_image,
                title: article.title,
                category: 'news',
                date: article.publish_date || article.created_at,
              });
            }
          });
        }

        // Event images
        if (eventsRes.data) {
          eventsRes.data.forEach((event: Event) => {
            if (event.featured_image) {
              gallery.push({
                id: `event-${event.id}`,
                src: event.featured_image,
                title: event.title,
                category: 'events',
                date: event.event_date,
              });
            }
          });
        }

        // Highlight thumbnails (from video URLs that are images or have poster frames)
        if (highlightsRes.data) {
          highlightsRes.data.forEach((h: any) => {
            if (h.video_url) {
              // YouTube thumbnails
              const ytMatch = h.video_url.match(
                /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
              );
              if (ytMatch) {
                gallery.push({
                  id: `highlight-${h.id}`,
                  src: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
                  title: h.title || 'Game Highlight',
                  category: 'highlights',
                  date: h.highlight_date,
                });
              }
            }
          });
        }

        // Gallery uploads
        if (galleryRes.data) {
          galleryRes.data.forEach((img: any) => {
            const taggedPlayerIds = (img.gallery_image_tags || []).map((t: any) => t.player_id);
            gallery.push({
              id: `gallery-${img.id}`,
              src: img.image_url,
              title: img.title,
              category: 'gallery',
              date: img.created_at,
              taggedPlayerIds,
            });
          });
        }

        // Sort by date (most recent first)
        gallery.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setItems(gallery);
      } catch (err) {
        console.error('Failed to fetch gallery:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMedia();
  }, []);

  const categoryFiltered = filter === 'all' ? items : items.filter((i) => i.category === filter);
  const filtered = playerFilter === 'all'
    ? categoryFiltered
    : categoryFiltered.filter((i) => i.taggedPlayerIds && i.taggedPlayerIds.includes(playerFilter as number));

  const filters = [
    { key: 'all' as const, label: 'All' },
    { key: 'highlights' as const, label: 'Highlights' },
    { key: 'news' as const, label: 'News' },
    { key: 'events' as const, label: 'Events' },
    { key: 'gallery' as const, label: 'Gallery' },
  ];

  return (
    <>
      {/* Filter Tabs */}
      <section className="py-6 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2 md:gap-4">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-team-blue text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {players.length > 0 && (
            <div className="flex justify-center mt-4">
              <select
                value={playerFilter === 'all' ? 'all' : String(playerFilter)}
                onChange={(e) => setPlayerFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none"
              >
                <option value="all">All Players</option>
                {players.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonNewsCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-gray-500">No photos found yet.</p>
              <p className="text-gray-400 mt-2">Photos from games, news, and events will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setLightbox(item)}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-gray-200 cursor-pointer"
                >
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium line-clamp-2">{item.title}</p>
                      <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full capitalize">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            aria-label="Close"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
          <div
            className="relative max-w-4xl w-full max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.src}
              alt={lightbox.title}
              width={1200}
              height={800}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="text-center mt-4">
              <p className="text-white font-medium">{lightbox.title}</p>
              {lightbox.date && (
                <p className="text-gray-400 text-sm mt-1">
                  {new Date(lightbox.date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
