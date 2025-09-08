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

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

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
      const updateData = {
        ...editForm,
        video_url: editForm.video_url || undefined
      };
      const { error } = await updateHighlight(editingHighlight, updateData);
      if (error) throw error;
      
      await fetchData();
      setEditingHighlight(null);
      setEditForm({});
      toast.success('Highlight updated successfully!');
    } catch (err: any) {
      toast.error('Error updating highlight: ' + err.message);
    }
  };

  const handleCancel = () => {
    setEditingHighlight(null);
    setEditForm({});
  };

  const handleAddHighlight = async () => {
    try {
      const highlightData = {
        player_id: parseInt(newHighlightForm.player_id),
        title: newHighlightForm.title,
        highlight_date: newHighlightForm.highlight_date,
        type: newHighlightForm.type,
        video_url: newHighlightForm.video_url || undefined
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
      setShowAddForm(false);
      toast.success('Highlight added successfully!');
    } catch (err: any) {
      toast.error('Error adding highlight: ' + err.message);
    }
  };

  const handleDeleteHighlight = async (highlightId: number) => {
    if (confirm('Are you sure you want to delete this highlight?')) {
      try {
        const { error } = await deleteHighlight(highlightId);
        if (error) throw error;
        
        await fetchData();
        toast.success('Highlight deleted successfully!');
      } catch (err: any) {
        toast.error('Error deleting highlight: ' + err.message);
      }
    }
  };

  const handleVideoUpload = (file: File, isNewHighlight = false) => {
    if (file && file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const videoUrl = e.target?.result as string;
        if (isNewHighlight) {
          setNewHighlightForm(prev => ({ ...prev, video_url: videoUrl }));
        } else {
          setEditForm(prev => ({ ...prev, video_url: videoUrl }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select a valid video file.');
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
        <section className="py-8 bg-gray-50">
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
                      onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0], true)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                    <p className="text-xs text-gray-500 mt-1">Supported formats: MP4, MOV, AVI (max 100MB)</p>
                  </div>
                  
                  {newHighlightForm.video_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Video Preview</label>
                      <video
                        src={newHighlightForm.video_url}
                        controls
                        className="w-full h-40 bg-gray-200 rounded border"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHighlight}
                  className="px-6 py-2 bg-team-red text-white rounded hover:bg-red-700 cursor-pointer"
                  disabled={!newHighlightForm.player_id || !newHighlightForm.title}
                >
                  Add Highlight
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
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

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
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input
                            type="date"
                            value={editForm.highlight_date || ''}
                            onChange={(e) => handleFormChange('highlight_date', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={editForm.type || ''}
                            onChange={(e) => handleFormChange('type', e.target.value)}
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Update Video</label>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0], false)}
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                        
                        {editForm.video_url && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Video</label>
                            <video
                              src={editForm.video_url}
                              controls
                              className="w-full h-40 bg-gray-200 rounded border"
                            >
                              Your browser does not support the video tag.
                            </video>
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