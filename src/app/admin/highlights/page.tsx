'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import toast from 'react-hot-toast';
import { 
  getHighlights, 
  getPlayers,
  createHighlight, 
  updateHighlight, 
  deleteHighlight,
  Highlight 
} from "@/lib/supabase";
import { uploadToS3, deleteFromS3, isS3Configured } from "@/lib/s3";

interface HighlightWithPlayer extends Highlight {
  players?: {
    name: string;
  };
}
export default function HighlightsAdmin() {
  const [highlights, setHighlights] = useState<HighlightWithPlayer[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState<Partial<HighlightWithPlayer>>({});
  const [newHighlightForm, setNewHighlightForm] = useState({
    player_id: '',
    title: '',
    highlight_date: new Date().toISOString().split('T')[0],
    type: 'goal' as const,
    video_url: null as string | null
  });
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadingForEdit, setUploadingForEdit] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [editSelectedVideoFile, setEditSelectedVideoFile] = useState<File | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (editPreviewUrl) {
        URL.revokeObjectURL(editPreviewUrl);
      }
    };
  }, [previewUrl, editPreviewUrl]);

  async function fetchData() {
    try {
      setLoading(true);
      const [highlightsResult, playersResult] = await Promise.all([
        getHighlights(),
        getPlayers()
      ]);
      
      if (highlightsResult.error) {
        setError(highlightsResult.error.message);
      } else if (highlightsResult.data) {
        setHighlights(highlightsResult.data);
      }
      
      if (playersResult.error) {
        setError(playersResult.error.message);
      } else if (playersResult.data) {
        setPlayers(playersResult.data);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (highlight: HighlightWithPlayer) => {
    setEditingHighlight(highlight.id);
    setEditForm(highlight);
  };

  const handleSave = async () => {
    if (!editingHighlight) return;
    
    try {
      let videoUrl = editForm.video_url;
      
      // Upload to S3 if we have a selected video file
      if (editSelectedVideoFile && isS3Configured()) {
        setUploadingForEdit(true);
        setUploadProgress(0);
        
        const result = await uploadToS3(editSelectedVideoFile, 'highlights', (progress) => {
          setUploadProgress(progress);
        });
        
        if (result.success && result.url) {
          videoUrl = result.url;
          toast.success('Video uploaded to S3 successfully!');
        } else {
          throw new Error(result.error || 'S3 upload failed');
        }
      }
      
      const updateData = {
        ...editForm,
        video_url: videoUrl || undefined
      };
      const { error } = await updateHighlight(editingHighlight, updateData);
      if (error) throw error;
      
      await fetchData();
      setEditingHighlight(null);
      setEditForm({});
      // Clean up preview URL and file
      if (editPreviewUrl) {
        URL.revokeObjectURL(editPreviewUrl);
        setEditPreviewUrl(null);
      }
      setEditSelectedVideoFile(null);
      toast.success('Highlight updated successfully!');
    } catch (err: any) {
      toast.error('Error updating highlight: ' + err.message);
    } finally {
      setUploadingForEdit(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setEditingHighlight(null);
    setEditForm({});
    // Clean up edit preview URL and file
    if (editPreviewUrl) {
      URL.revokeObjectURL(editPreviewUrl);
      setEditPreviewUrl(null);
    }
    setEditSelectedVideoFile(null);
  };

  const handleAddHighlight = async () => {
    try {
      let videoUrl = newHighlightForm.video_url;
      
      // Upload to S3 if we have a selected video file
      if (selectedVideoFile && isS3Configured()) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const result = await uploadToS3(selectedVideoFile, 'highlights', (progress) => {
          setUploadProgress(progress);
        });
        
        if (result.success && result.url) {
          videoUrl = result.url;
          toast.success('Video uploaded to S3 successfully!');
        } else {
          throw new Error(result.error || 'S3 upload failed');
        }
      }
      
      const highlightData = {
        player_id: parseInt(newHighlightForm.player_id),
        title: newHighlightForm.title,
        highlight_date: newHighlightForm.highlight_date,
        type: newHighlightForm.type,
        video_url: videoUrl || undefined
      };
      
      const { error } = await createHighlight(highlightData);
      if (error) throw error;
      
      await fetchData();
      setNewHighlightForm({
        player_id: '',
        title: '',
        highlight_date: new Date().toISOString().split('T')[0],
        type: 'goal',
        video_url: null
      });
      // Clean up preview URL and file
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedVideoFile(null);
      setShowAddForm(false);
      toast.success('Highlight added successfully!');
    } catch (err: any) {
      toast.error('Error adding highlight: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteHighlight = async (highlightId: number) => {
    if (confirm('Are you sure you want to delete this highlight?')) {
      try {
        // Find the highlight to delete
        const highlightToDelete = highlights.find(h => h.id === highlightId);
        
        // Delete from database first
        const { error } = await deleteHighlight(highlightId);
        if (error) throw error;
        
        // If there's a video URL, try to delete from S3
        if (highlightToDelete?.video_url && highlightToDelete.video_url.includes('s3.')) {
          const deleteResult = await deleteFromS3(highlightToDelete.video_url);
          if (!deleteResult.success) {
            console.warn('Failed to delete video from S3:', deleteResult.error);
          }
        }
        
        await fetchData();
        toast.success('Highlight deleted successfully!');
      } catch (err: any) {
        toast.error('Error deleting highlight: ' + err.message);
      }
    }
  };

  const validateVideo = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        console.log('✅ Video validation successful:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        });
        
        // Check if video has actual video track (not just audio)
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.warn('⚠️ Video dimensions show 0x0 - this may be a browser rendering issue, not an invalid file');
          // Don't block upload for now - let user proceed
          // URL.revokeObjectURL(objectUrl);
          // resolve(false);
          // return;
        }
        
        URL.revokeObjectURL(objectUrl);
        resolve(true);
      };
      
      video.onerror = (e) => {
        console.error('❌ Video validation failed:', e);
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      };
      
      video.src = objectUrl;
    });
  };

  const handleVideoSelect = async (file: File, isNewHighlight = false) => {
    if (!file || !file.type.startsWith('video/')) {
      toast.error('Please select a valid video file.');
      return;
    }

    console.log('🎬 Starting video processing:', file.name, file.size, 'bytes', file.type);

    // Validate video file
    const isValidVideo = await validateVideo(file);
    if (!isValidVideo) {
      toast.error('This video file has no video track (audio-only) or is corrupted. Please select a proper video file with both video and audio.');
      return;
    }

    // Create immediate preview with object URL
    const objectUrl = URL.createObjectURL(file);
    console.log('📹 Created object URL:', objectUrl, 'for file:', file.name, file.type);
    
    if (isNewHighlight) {
      // Clean up previous preview URL and file
      if (previewUrl) {
        console.log('🗑️ Cleaning up previous preview URL');
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(objectUrl);
      setSelectedVideoFile(file);
      console.log('✅ Set new preview URL and file for new highlight');
      toast.success('Video selected! It will be uploaded when you click "Add Highlight"');
    } else {
      // Clean up previous preview URL and file
      if (editPreviewUrl) {
        console.log('🗑️ Cleaning up previous edit preview URL');
        URL.revokeObjectURL(editPreviewUrl);
      }
      setEditPreviewUrl(objectUrl);
      setEditSelectedVideoFile(file);
      console.log('✅ Set new preview URL and file for edit');
      toast.success('Video selected! It will be uploaded when you save changes');
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNewFormChange = (field: string, value: any) => {
    setNewHighlightForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Loading Highlights...</h1>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Error Loading Highlights</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please ensure Supabase is properly configured.</p>
          <button 
            onClick={fetchData}
            className="mt-4 bg-team-blue text-white px-6 py-2 rounded hover:bg-blue-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Admin Header */}
      <section className="bg-team-blue text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex items-center mb-4">
                <Link href="/admin" className="text-blue-100 hover:text-white mr-4 cursor-pointer">
                  ← Back to Admin
                </Link>
              </div>
              <h1 className="text-4xl font-bold mb-2">Highlights & Videos</h1>
              <p className="text-blue-100">Manage player highlights and upload game videos. Changes are temporary and only saved in browser session.</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-team-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 cursor-pointer"
            >
              {showAddForm ? 'Cancel' : 'Add New Highlight'}
            </button>
          </div>
        </div>
      </section>

      {/* Add New Highlight Form */}
      {showAddForm && (
        <section className="py-8 bg-gray-50 relative z-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-team-blue mb-6">Add New Highlight</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Player *</label>
                    <select
                      value={newHighlightForm.player_id}
                      onChange={(e) => handleNewFormChange('player_id', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="">Select a player</option>
                      {players.map(player => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newHighlightForm.title}
                      onChange={(e) => handleNewFormChange('title', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Amazing Goal vs Thunder FC"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newHighlightForm.highlight_date}
                      onChange={(e) => handleNewFormChange('highlight_date', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newHighlightForm.type}
                      onChange={(e) => handleNewFormChange('type', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="goal">Goal</option>
                      <option value="assist">Assist</option>
                      <option value="save">Save</option>
                      <option value="defense">Defense</option>
                      <option value="performance">Performance</option>
                      <option value="multiple">Multiple</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Video</label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0], true)}
                      className="w-full p-2 border border-gray-300 rounded"
                      disabled={false}
                    />
                    <p className="text-xs text-gray-500 mt-1">Supported formats: MP4, MOV, AVI (max 100MB)</p>
                    
                    {selectedVideoFile && (
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <div className="text-sm text-blue-700">
                          📁 Selected: {selectedVideoFile.name}
                        </div>
                        <div className="text-xs text-blue-600">
                          Will upload to S3 when you click "Add Highlight"
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {(previewUrl || newHighlightForm.video_url) && (
                    <div className="relative z-10">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video Preview</label>
                      <video
                        src={previewUrl || newHighlightForm.video_url || ''}
                        className="w-full h-40 rounded border"
                        controls
                        muted
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className="text-xs text-gray-500 mt-1">
                        Source: {previewUrl ? 'Local preview' : newHighlightForm.video_url ? 'S3 URL' : 'No source'}
                      </div>
                      <div className="text-xs text-blue-500 mt-1">
                        URL: {previewUrl || newHighlightForm.video_url || 'None'}
                      </div>
                      {previewUrl && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⏳ Preview (video will be uploaded to S3 when you save)
                        </p>
                      )}
                      {newHighlightForm.video_url && !previewUrl && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Uploaded to S3
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress indicator for new highlight */}
              {isUploading && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>
                      {uploadProgress < 100 ? 'Uploading to S3...' : 'Upload Complete! Creating highlight...'}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-team-red h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 cursor-pointer"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHighlight}
                  className={`px-6 py-2 text-white rounded transition-colors ${
                    isUploading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-team-red hover:bg-red-700 cursor-pointer'
                  }`}
                  disabled={!newHighlightForm.player_id || !newHighlightForm.title || isUploading}
                >
                  {isUploading ? 'Creating Highlight...' : 'Add Highlight'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Highlights List */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {highlights.map((highlight) => (
              <div key={highlight.id} className="bg-gray-50 rounded-lg p-6 shadow-lg">
                {editingHighlight === highlight.id ? (
                  // Edit Form
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-bold text-team-blue">Editing: {highlight.title}</h3>
                      <div className="space-x-4">
                        <button
                          onClick={handleSave}
                          className="bg-team-red text-white px-4 py-2 rounded hover:bg-red-700 cursor-pointer"
                          disabled={uploadingForEdit}
                        >
                          {uploadingForEdit ? 'Uploading...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer"
                          disabled={uploadingForEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    
                    {uploadingForEdit && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>
                            {uploadProgress < 100 ? 'Uploading to S3...' : 'Upload Complete!'}
                          </span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              uploadProgress === 100 ? 'bg-green-500' : 'bg-team-blue'
                            }`}
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        {uploadProgress === 100 && (
                          <div className="text-xs text-green-600 mt-1">
                            ✅ Successfully uploaded to S3
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
                          <select
                            value={editForm.player_id || ''}
                            onChange={(e) => handleFormChange('player_id', parseInt(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded"
                          >
                            {players.map(player => (
                              <option key={player.id} value={player.id}>{player.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title || ''}
                            onChange={(e) => handleFormChange('title', e.target.value)}
                            className="w-full p-2 md:p-3 border border-gray-300 rounded text-sm md:text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input
                            type="date"
                            value={editForm.highlight_date || ''}
                            onChange={(e) => handleFormChange('highlight_date', e.target.value)}
                            className="w-full p-2 md:p-3 border border-gray-300 rounded text-sm md:text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={editForm.type || ''}
                            onChange={(e) => handleFormChange('type', e.target.value)}
                            className="w-full p-2 md:p-3 border border-gray-300 rounded text-sm md:text-base"
                          >
                            <option value="goal">Goal</option>
                            <option value="assist">Assist</option>
                            <option value="save">Save</option>
                            <option value="defense">Defense</option>
                            <option value="performance">Performance</option>
                            <option value="multiple">Multiple</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Update Video</label>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0], false)}
                            className="w-full p-2 border border-gray-300 rounded"
                            disabled={false}
                          />
                          
                          {editSelectedVideoFile && (
                            <div className="mt-2 p-2 bg-blue-50 rounded">
                              <div className="text-sm text-blue-700">
                                📁 Selected: {editSelectedVideoFile.name}
                              </div>
                              <div className="text-xs text-blue-600">
                                Will upload to S3 when you save changes
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {(editPreviewUrl || editForm.video_url) && (
                          <div className="relative z-10">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Video</label>
                            <video
                              src={editPreviewUrl || editForm.video_url || ''}
                              className="w-full h-40 rounded border"
                              controls
                              muted
                              preload="metadata"
                            >
                              Your browser does not support the video tag.
                            </video>
                            <div className="text-xs text-blue-500 mt-1">
                              URL: {editPreviewUrl || editForm.video_url || 'None'}
                            </div>
                            {editPreviewUrl && (
                              <p className="text-xs text-orange-600 mt-1">
                                ⏳ Preview (video will be uploaded to S3 when you save)
                              </p>
                            )}
                            {editForm.video_url && !editPreviewUrl && (
                              <p className="text-xs text-green-600 mt-1">
                                ✅ Stored in S3
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-xl font-bold text-team-blue">{highlight.title}</h3>
                          <span className="bg-team-red text-white px-2 py-1 rounded text-xs">
                            {highlight.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600">{highlight.players?.name}</p>
                        <p className="text-sm text-gray-500">{new Date(highlight.highlight_date).toLocaleDateString()}</p>
                        {highlight.video_url && (
                          <p className="text-xs text-green-600 mt-1">✓ Video uploaded</p>
                        )}
                      </div>
                      
                      {highlight.video_url && (
                        <div className="w-32 h-20">
                          <video
                            src={highlight.video_url}
                            className="w-full h-full object-cover rounded border"
                            muted
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-x-3">
                      <button
                        onClick={() => handleEdit(highlight)}
                        className="bg-team-blue text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteHighlight(highlight.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}