'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import DropZone from '@/components/admin/DropZone';
import { getGalleryImagesWithTags, createGalleryImage, deleteGalleryImage, GalleryImage, createAdminNotification, getPlayers, tagPlayerInImage, untagPlayerFromImage } from '@/lib/supabase';
import { uploadToS3Direct } from '@/lib/s3';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { logActivity } from '@/lib/audit';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

interface TaggedImage extends GalleryImage {
  gallery_image_tags?: {
    player_id: number;
    players: { id: number; name: string };
  }[];
}

interface Player {
  id: number;
  name: string;
}

export default function GalleryAdminPage() {
  return (
    <Suspense fallback={<AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const [images, setImages] = useState<TaggedImage[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GalleryImage['category']>('other');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState('all');
  const [taggingImageId, setTaggingImageId] = useState<number | null>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const userEmail = useCurrentUser();

  const fetchImages = async () => {
    const { data } = await getGalleryImagesWithTags();
    setImages((data as TaggedImage[]) || []);
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await getPlayers();
    if (data) {
      setPlayers(data.map((p: any) => ({ id: p.id, name: p.name })));
    }
  };

  useEffect(() => {
    fetchImages();
    fetchPlayers();
  }, []);

  // Close tag dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTaggingImageId(null);
      }
    }
    if (taggingImageId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [taggingImageId]);

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast.error('Please provide a title and select an image');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const result = await uploadToS3Direct(selectedFile, 'team-images', (progress) => {
      setUploadProgress(progress);
    });

    if (!result.success || !result.url) {
      toast.error(result.error || 'Upload failed');
      setUploading(false);
      return;
    }

    const { error } = await createGalleryImage({
      title: title.trim(),
      image_url: result.url,
      category,
      uploaded_by: userEmail || undefined,
    });

    if (error) {
      toast.error('Failed to save image');
    } else {
      toast.success('Image uploaded!');
      logActivity('create', 'gallery', title.trim() || selectedFile.name, userEmail, { title: title.trim(), category });
      createAdminNotification({ type: 'gallery', title: `Gallery Image Uploaded: ${title.trim() || selectedFile.name}`, message: `A new ${category} image "${title.trim()}" was added to the gallery.`, link: '/admin/gallery' });
      setTitle('');
      setCategory('other');
      setSelectedFile(null);
      fetchImages();
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleDelete = async (image: GalleryImage) => {
    if (!confirm(`Delete "${image.title}"?`)) return;

    const { error } = await deleteGalleryImage(image.id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Image deleted');
      logActivity('delete', 'gallery', image.title || image.id, userEmail, { title: image.title });
      setImages((prev) => prev.filter((i) => i.id !== image.id));
    }
  };

  const handleTagToggle = async (imageId: number, playerId: number, isCurrentlyTagged: boolean) => {
    if (isCurrentlyTagged) {
      const { error } = await untagPlayerFromImage(imageId, playerId);
      if (error) {
        toast.error('Failed to remove tag');
        return;
      }
    } else {
      const { error } = await tagPlayerInImage(imageId, playerId);
      if (error) {
        toast.error('Failed to tag player');
        return;
      }
    }
    // Update local state
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== imageId) return img;
        const tags = img.gallery_image_tags || [];
        if (isCurrentlyTagged) {
          return { ...img, gallery_image_tags: tags.filter((t) => t.player_id !== playerId) };
        } else {
          const player = players.find((p) => p.id === playerId);
          return {
            ...img,
            gallery_image_tags: [...tags, { player_id: playerId, players: { id: playerId, name: player?.name || '' } }],
          };
        }
      })
    );
  };

  const getTaggedPlayerIds = (image: TaggedImage): number[] => {
    return (image.gallery_image_tags || []).map((t) => t.player_id);
  };

  const getTaggedPlayerNames = (image: TaggedImage): string[] => {
    return (image.gallery_image_tags || []).map((t) => t.players?.name).filter(Boolean);
  };

  const filtered = filter === 'all' ? images : images.filter((i) => i.category === filter);
  const categories = ['all', 'game', 'practice', 'event', 'team', 'other'];

  const categoryColors: Record<string, string> = {
    game: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    practice: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    event: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    team: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Gallery Manager</h1>

        {/* Upload Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Image</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Image title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GalleryImage['category'])}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none text-sm"
                >
                  <option value="game">Game</option>
                  <option value="practice">Practice</option>
                  <option value="event">Event</option>
                  <option value="team">Team</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !title.trim()}
                className="w-full bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
            <DropZone
              onFileSelect={setSelectedFile}
              accept="image/*"
              maxSizeMB={10}
              label="Drop image here or click to browse"
              uploading={uploading}
              uploadProgress={uploadProgress}
              previewType="image"
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === cat
                  ? 'bg-team-blue text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat} {cat !== 'all' && `(${images.filter((i) => i.category === cat).length})`}
              {cat === 'all' && `(${images.length})`}
            </button>
          ))}
        </div>

        {/* Image Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading images...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-500">No images found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((image) => {
              const taggedIds = getTaggedPlayerIds(image);
              const taggedNames = getTaggedPlayerNames(image);
              return (
                <div key={image.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden group">
                  <div className="aspect-square relative">
                    <Image
                      src={image.image_url}
                      alt={image.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => handleDelete(image)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{image.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${categoryColors[image.category] || categoryColors.other}`}>
                        {image.category}
                      </span>
                      {image.created_at && (
                        <span className="text-xs text-gray-400">{new Date(image.created_at).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Tagged player chips */}
                    {taggedNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {taggedNames.map((name) => (
                          <span
                            key={name}
                            className="inline-block text-xs bg-team-blue/10 text-team-blue dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tag Players button and dropdown */}
                    <div className="relative mt-2">
                      <button
                        onClick={() => setTaggingImageId(taggingImageId === image.id ? null : image.id)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-team-blue dark:hover:text-blue-400 transition-colors font-medium"
                      >
                        Tag Players
                      </button>
                      {taggingImageId === image.id && (
                        <div
                          ref={tagDropdownRef}
                          className="absolute left-0 bottom-full mb-1 z-20 w-56 max-h-48 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
                        >
                          {players.length === 0 ? (
                            <p className="p-2 text-xs text-gray-400">No players found</p>
                          ) : (
                            players.map((player) => {
                              const isTagged = taggedIds.includes(player.id);
                              return (
                                <label
                                  key={player.id}
                                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isTagged}
                                    onChange={() => handleTagToggle(image.id, player.id, isTagged)}
                                    className="rounded border-gray-300 text-team-blue focus:ring-team-blue"
                                  />
                                  {player.name}
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
