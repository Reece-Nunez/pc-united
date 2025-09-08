'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import toast from 'react-hot-toast';
import { 
  getPlayers, 
  createPlayer, 
  updatePlayer, 
  deletePlayer, 
  createOrUpdatePlayerStats,
  Player 
} from "@/lib/supabase";

interface AdminPlayer extends Player {
  player_stats?: Array<{
    goals: number;
    assists: number;
    games_played: number;
    yellow_cards: number;
    red_cards: number;
    saves?: number;
    clean_sheets?: number;
  }>;
  highlights?: Array<{
    id: number;
    title: string;
    highlight_date: string;
    type: string;
  }>;
}

interface EditPlayerForm extends Omit<AdminPlayer, 'strengths' | 'areas_to_improve'> {
  strengths: string;
  areas_to_improve: string;
  stats: {
    goals: number;
    assists: number;
    games_played: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    clean_sheets: number;
  };
}
export default function AdminPage() {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<EditPlayerForm>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    name: '',
    jersey_number: '',
    position: 'Forward',
    birth_year: 2016,
    photo_url: '/logo.png',
    description: '',
    strengths: '',
    areas_to_improve: '',
    coach_notes: '',
    stats: {
      goals: 0,
      assists: 0,
      games_played: 0,
      yellow_cards: 0,
      red_cards: 0,
      saves: 0,
      clean_sheets: 0
    }
  });

  // Fetch players on component mount
  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setLoading(true);
      const { data, error } = await getPlayers();
      if (error) {
        setError(error.message);
      } else if (data) {
        setPlayers(data);
      }
    } catch (err) {
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (player: AdminPlayer) => {
    setEditingPlayer(player.id);
    // Exclude highlights and player_stats from the edit form since they're handled separately
    const { highlights, player_stats, ...playerData } = player;
    setEditForm({
      ...playerData,
      strengths: player.strengths?.join(', ') || '',
      areas_to_improve: player.areas_to_improve?.join(', ') || '',
      stats: player.player_stats?.[0] || {
        goals: 0,
        assists: 0,
        games_played: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        clean_sheets: 0
      }
    });
  };

  const handleSave = async () => {
    if (!editingPlayer) return;
    
    try {
      const playerData = {
        ...editForm,
        strengths: editForm.strengths ? editForm.strengths.split(',').map((s: string) => s.trim()).filter((s: string) => s) : null,
        areas_to_improve: editForm.areas_to_improve ? editForm.areas_to_improve.split(',').map((s: string) => s.trim()).filter((s: string) => s) : null
      };
      
      // Remove stats from player data
      const { stats, ...playerWithoutStats } = playerData;
      
      // Update player
      const { error: playerError } = await updatePlayer(editingPlayer, playerWithoutStats);
      if (playerError) throw playerError;
      
      // Update stats
      if (stats) {
        const { error: statsError } = await createOrUpdatePlayerStats({
          player_id: editingPlayer,
          ...stats,
          season: '2024-2025'
        });
        if (statsError) throw statsError;
      }
      
      // Refresh players list
      await fetchPlayers();
      setEditingPlayer(null);
      setEditForm({});
      toast.success('Player updated successfully!');
    } catch (err: any) {
      toast.error('Error updating player: ' + err.message);
    }
  };

  const handleCancel = () => {
    setEditingPlayer(null);
    setEditForm({});
  };

  const handleFormChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEditForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setEditForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleNewPlayerChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setNewPlayerForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setNewPlayerForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAddPlayer = async () => {
    try {
      const playerData = {
        name: newPlayerForm.name,
        jersey_number: parseInt(newPlayerForm.jersey_number as string),
        position: newPlayerForm.position,
        birth_year: parseInt(newPlayerForm.birth_year as string),
        photo_url: newPlayerForm.photo_url,
        description: newPlayerForm.description,
        strengths: newPlayerForm.strengths ? newPlayerForm.strengths.split(',').map(s => s.trim()).filter(s => s) : null,
        areas_to_improve: newPlayerForm.areas_to_improve ? newPlayerForm.areas_to_improve.split(',').map(s => s.trim()).filter(s => s) : null,
        coach_notes: newPlayerForm.coach_notes
      };
      
      // Create player
      const { data: createdPlayer, error: playerError } = await createPlayer(playerData);
      if (playerError) throw playerError;
      
      // Create stats
      if (createdPlayer && newPlayerForm.stats) {
        const { error: statsError } = await createOrUpdatePlayerStats({
          player_id: createdPlayer.id,
          ...newPlayerForm.stats,
          season: '2024-2025'
        });
        if (statsError) throw statsError;
      }
      
      // Refresh players list and reset form
      await fetchPlayers();
      setNewPlayerForm({
        name: '',
        jersey_number: '',
        position: 'Forward',
        birth_year: 2016,
        photo_url: '/logo.png',
        description: '',
        strengths: '',
        areas_to_improve: '',
        coach_notes: '',
        stats: {
          goals: 0,
          assists: 0,
          games_played: 0,
          yellow_cards: 0,
          red_cards: 0,
          saves: 0,
          clean_sheets: 0
        }
      });
      setShowAddForm(false);
      toast.success('Player added successfully!');
    } catch (err: any) {
      toast.error('Error adding player: ' + err.message);
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    if (confirm('Are you sure you want to delete this player?')) {
      try {
        const { error } = await deletePlayer(playerId);
        if (error) throw error;
        
        await fetchPlayers();
        toast.success('Player deleted successfully!');
      } catch (err: any) {
        toast.error('Error deleting player: ' + err.message);
      }
    }
  };

  const handlePhotoUpload = (file: File, isNewPlayer = false) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoUrl = e.target?.result as string;
        if (isNewPlayer) {
          setNewPlayerForm(prev => ({ ...prev, photo_url: photoUrl }));
        } else {
          setEditForm(prev => ({ ...prev, photo_url: photoUrl }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select a valid image file.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-20 text-center">
          <h1 className="text-4xl font-bold text-team-blue mb-4">Loading Players...</h1>
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
          <h1 className="text-4xl font-bold text-team-blue mb-4">Error Loading Players</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please ensure Supabase is properly configured.</p>
          <button 
            onClick={fetchPlayers}
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
              <h1 className="text-4xl font-bold mb-2">Player Admin Panel</h1>
              <p className="text-blue-100">Edit player information, stats, and details. Changes are temporary and only saved in browser session.</p>
            </div>
            <div className="space-x-4">
              <Link
                href="/admin/highlights"
                className="bg-team-orange hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 cursor-pointer inline-block"
              >
                Manage Highlights
              </Link>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-team-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 cursor-pointer"
              >
                {showAddForm ? 'Cancel' : 'Add New Player'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Add New Player Form */}
      {showAddForm && (
        <section className="py-8 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-team-blue mb-6">Add New Player</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-team-blue">Basic Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newPlayerForm.name}
                      onChange={(e) => handleNewPlayerChange('name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jersey Number *</label>
                    <input
                      type="number"
                      value={newPlayerForm.jersey_number}
                      onChange={(e) => handleNewPlayerChange('jersey_number', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <select
                      value={newPlayerForm.position}
                      onChange={(e) => handleNewPlayerChange('position', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="Forward">Forward</option>
                      <option value="Midfielder">Midfielder</option>
                      <option value="Defender">Defender</option>
                      <option value="Goalkeeper">Goalkeeper</option>
                      <option value="Winger">Winger</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
                    <input
                      type="number"
                      value={newPlayerForm.birth_year}
                      onChange={(e) => handleNewPlayerChange('birth_year', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Player Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], true)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                    {newPlayerForm.photo_url && (
                      <div className="mt-2">
                        <Image
                          src={newPlayerForm.photo_url}
                          alt="Preview"
                          width={60}
                          height={60}
                          className="rounded-full object-cover border-2 border-team-blue"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-team-blue">Initial Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
                      <input
                        type="number"
                        value={newPlayerForm.stats.goals}
                        onChange={(e) => handleNewPlayerChange('stats.goals', parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assists</label>
                      <input
                        type="number"
                        value={newPlayerForm.stats.assists}
                        onChange={(e) => handleNewPlayerChange('stats.assists', parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Games Played</label>
                      <input
                        type="number"
                        value={newPlayerForm.stats.games_played}
                        onChange={(e) => handleNewPlayerChange('stats.games_played', parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Yellow Cards</label>
                      <input
                        type="number"
                        value={newPlayerForm.stats.yellow_cards}
                        onChange={(e) => handleNewPlayerChange('stats.yellow_cards', parseInt(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description and Development */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newPlayerForm.description}
                    onChange={(e) => handleNewPlayerChange('description', e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Brief description of the player's playing style and abilities"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Strengths (comma separated)</label>
                    <textarea
                      value={newPlayerForm.strengths}
                      onChange={(e) => handleNewPlayerChange('strengths', e.target.value)}
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Speed, Ball control, Shooting"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Areas to Improve (comma separated)</label>
                    <textarea
                      value={newPlayerForm.areas_to_improve}
                      onChange={(e) => handleNewPlayerChange('areas_to_improve', e.target.value)}
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Passing accuracy, Defense"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coach Notes</label>
                  <textarea
                    value={newPlayerForm.coach_notes}
                    onChange={(e) => handleNewPlayerChange('coach_notes', e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Coach's observations and notes about the player"
                  />
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
                  onClick={handleAddPlayer}
                  className="px-6 py-2 bg-team-red text-white rounded hover:bg-red-700 cursor-pointer"
                  disabled={!newPlayerForm.name || !newPlayerForm.jersey_number}
                >
                  Add Player
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Players List */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {players.map((player) => (
              <div key={player.id} className="bg-gray-50 rounded-lg p-6 shadow-lg">
                {editingPlayer === player.id ? (
                  // Edit Form
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-bold text-team-blue">Editing: {player.name}</h3>
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
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-team-blue">Basic Information</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Jersey Number</label>
                          <input
                            type="number"
                            value={editForm.jersey_number || ''}
                            onChange={(e) => handleFormChange('jersey_number', parseInt(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                          <select
                            value={editForm.position || ''}
                            onChange={(e) => handleFormChange('position', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                          >
                            <option value="Forward">Forward</option>
                            <option value="Midfielder">Midfielder</option>
                            <option value="Defender">Defender</option>
                            <option value="Goalkeeper">Goalkeeper</option>
                            <option value="Winger">Winger</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
                          <input
                            type="number"
                            value={editForm.birth_year || ''}
                            onChange={(e) => handleFormChange('birth_year', parseInt(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Player Photo</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], false)}
                            className="w-full p-2 border border-gray-300 rounded"
                          />
                          {editForm.photo_url && (
                            <div className="mt-2">
                              <Image
                                src={editForm.photo_url}
                                alt="Current photo"
                                width={80}
                                height={80}
                                className="rounded-full object-cover border-2 border-team-blue"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-team-blue">Statistics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
                            <input
                              type="number"
                              value={editForm.stats?.goals || 0}
                              onChange={(e) => handleFormChange('stats.goals', parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assists</label>
                            <input
                              type="number"
                              value={editForm.stats?.assists || 0}
                              onChange={(e) => handleFormChange('stats.assists', parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Games Played</label>
                            <input
                              type="number"
                              value={editForm.stats?.games_played || 0}
                              onChange={(e) => handleFormChange('stats.games_played', parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Yellow Cards</label>
                            <input
                              type="number"
                              value={editForm.stats?.yellow_cards || 0}
                              onChange={(e) => handleFormChange('stats.yellow_cards', parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          {editForm.position === 'Goalkeeper' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Saves</label>
                                <input
                                  type="number"
                                  value={editForm.stats?.saves || 0}
                                  onChange={(e) => handleFormChange('stats.saves', parseInt(e.target.value) || 0)}
                                  className="w-full p-2 border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Clean Sheets</label>
                                <input
                                  type="number"
                                  value={editForm.stats?.clean_sheets || 0}
                                  onChange={(e) => handleFormChange('stats.clean_sheets', parseInt(e.target.value) || 0)}
                                  className="w-full p-2 border border-gray-300 rounded"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description and Development */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => handleFormChange('description', e.target.value)}
                          rows={3}
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Strengths (comma separated)</label>
                          <textarea
                            value={editForm.strengths || ''}
                            onChange={(e) => handleFormChange('strengths', e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded"
                            placeholder="Clinical finishing, Ball control, Speed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Areas to Improve (comma separated)</label>
                          <textarea
                            value={editForm.areas_to_improve || ''}
                            onChange={(e) => handleFormChange('areas_to_improve', e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded"
                            placeholder="Passing accuracy, Defensive work rate"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coach Notes</label>
                        <textarea
                          value={editForm.coach_notes || ''}
                          onChange={(e) => handleFormChange('coach_notes', e.target.value)}
                          rows={3}
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="relative w-16 h-16">
                        <Image
                          src={player.photo_url || '/logo.png'}
                          alt={`${player.name} photo`}
                          fill
                          className="rounded-full object-cover border-2 border-team-blue"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-team-red text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                          {player.jersey_number}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-team-blue">{player.name}</h3>
                        <p className="text-team-red font-semibold">{player.position}</p>
                        <p className="text-sm text-gray-500">Born {player.birth_year} • {player.player_stats?.[0]?.games_played || 0} games</p>
                      </div>
                    </div>
                    <div className="space-x-3">
                      <button
                        onClick={() => handleEdit(player)}
                        className="bg-team-blue text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
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