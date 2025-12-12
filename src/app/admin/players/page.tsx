'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from "next/image";
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
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
    saves?: number;
    clean_sheets?: number;
  };
  [key: string]: any;
}

interface NewPlayerForm {
  name: string;
  jersey_number: string;
  position: string;
  birth_year: number;
  photo_url: string;
  description: string;
  strengths: string;
  areas_to_improve: string;
  coach_notes: string;
  stats: {
    goals: number;
    assists: number;
    games_played: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    clean_sheets: number;
  };
  [key: string]: any;
}

function PlayersAdminContent() {
  const searchParams = useSearchParams();
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<EditPlayerForm>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [newPlayerForm, setNewPlayerForm] = useState<NewPlayerForm>({
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

  // Check URL params for actions
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddForm(true);
    }
    const editId = searchParams.get('edit');
    if (editId) {
      const player = players.find(p => p.id === parseInt(editId));
      if (player) {
        handleEdit(player);
      }
    }
  }, [searchParams, players]);

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

  // Filter players based on search and position
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.jersey_number.toString().includes(searchQuery);
    const matchesPosition = positionFilter === 'All' || player.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  // Get unique positions
  const positions = ['All', ...Array.from(new Set(players.map(p => p.position)))];

  const handleEdit = (player: AdminPlayer) => {
    setEditingPlayer(player.id);
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
        strengths: editForm.strengths ? editForm.strengths.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined,
        areas_to_improve: editForm.areas_to_improve ? editForm.areas_to_improve.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined
      };

      const { stats, ...playerWithoutStats } = playerData;

      const { error: playerError } = await updatePlayer(editingPlayer, playerWithoutStats);
      if (playerError) throw playerError;

      if (stats) {
        const { error: statsError } = await createOrUpdatePlayerStats({
          player_id: editingPlayer,
          ...stats,
          season: '2024-2025'
        });
        if (statsError) throw statsError;
      }

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
        birth_year: newPlayerForm.birth_year,
        photo_url: newPlayerForm.photo_url,
        description: newPlayerForm.description,
        strengths: newPlayerForm.strengths ? newPlayerForm.strengths.split(',').map(s => s.trim()).filter(s => s) : undefined,
        areas_to_improve: newPlayerForm.areas_to_improve ? newPlayerForm.areas_to_improve.split(',').map(s => s.trim()).filter(s => s) : undefined,
        coach_notes: newPlayerForm.coach_notes
      };

      const { data: createdPlayer, error: playerError } = await createPlayer(playerData);
      if (playerError) throw playerError;

      if (createdPlayer && newPlayerForm.stats) {
        const { error: statsError } = await createOrUpdatePlayerStats({
          player_id: createdPlayer.id,
          ...newPlayerForm.stats,
          season: '2024-2025'
        });
        if (statsError) throw statsError;
      }

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
    if (confirm('Are you sure you want to delete this player? This cannot be undone.')) {
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

  const handlePhotoUpload = async (file: File, isNewPlayer = false) => {
    if (file && file.type.startsWith('image/')) {
      try {
        // Get presigned URL
        const presignedResponse = await fetch('/api/presigned-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            folder: 'players'
          })
        });

        const presignedData = await presignedResponse.json();

        if (!presignedData.success) {
          throw new Error(presignedData.error || 'Failed to get upload URL');
        }

        // Upload to S3
        const uploadResponse = await fetch(presignedData.presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const photoUrl = presignedData.publicUrl;

        if (isNewPlayer) {
          setNewPlayerForm(prev => ({ ...prev, photo_url: photoUrl }));
        } else {
          setEditForm(prev => ({ ...prev, photo_url: photoUrl }));
        }
        toast.success('Photo uploaded successfully!');
      } catch (err: any) {
        toast.error('Error uploading photo: ' + err.message);
      }
    } else {
      toast.error('Please select a valid image file.');
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Players</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchPlayers}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Players</h1>
            <p className="text-gray-600 mt-1">Manage your team roster</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="mt-4 md:mt-0 bg-team-blue hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{showAddForm ? 'Cancel' : 'Add Player'}</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or jersey number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {positions.map((position) => (
                <button
                  key={position}
                  onClick={() => setPositionFilter(position)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    positionFilter === position
                      ? 'bg-team-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Showing {filteredPlayers.length} of {players.length} players
          </p>
        </div>

        {/* Add New Player Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Player</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Basic Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newPlayerForm.name}
                    onChange={(e) => handleNewPlayerChange('name', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jersey # *</label>
                    <input
                      type="number"
                      value={newPlayerForm.jersey_number}
                      onChange={(e) => handleNewPlayerChange('jersey_number', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Year</label>
                    <input
                      type="number"
                      value={newPlayerForm.birth_year}
                      onChange={(e) => handleNewPlayerChange('birth_year', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select
                    value={newPlayerForm.position}
                    onChange={(e) => handleNewPlayerChange('position', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="Forward">Forward</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Defender">Defender</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Winger">Winger</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], true)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                  {newPlayerForm.photo_url && newPlayerForm.photo_url !== '/logo.png' && (
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
                <h3 className="text-lg font-semibold text-gray-700">Initial Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
                    <input
                      type="number"
                      value={newPlayerForm.stats.goals}
                      onChange={(e) => handleNewPlayerChange('stats.goals', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assists</label>
                    <input
                      type="number"
                      value={newPlayerForm.stats.assists}
                      onChange={(e) => handleNewPlayerChange('stats.assists', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Games</label>
                    <input
                      type="number"
                      value={newPlayerForm.stats.games_played}
                      onChange={(e) => handleNewPlayerChange('stats.games_played', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yellow Cards</label>
                    <input
                      type="number"
                      value={newPlayerForm.stats.yellow_cards}
                      onChange={(e) => handleNewPlayerChange('stats.yellow_cards', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newPlayerForm.description}
                  onChange={(e) => handleNewPlayerChange('description', e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                  placeholder="Brief description of the player"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strengths (comma separated)</label>
                  <input
                    type="text"
                    value={newPlayerForm.strengths}
                    onChange={(e) => handleNewPlayerChange('strengths', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    placeholder="Speed, Ball control"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Areas to Improve (comma separated)</label>
                  <input
                    type="text"
                    value={newPlayerForm.areas_to_improve}
                    onChange={(e) => handleNewPlayerChange('areas_to_improve', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue"
                    placeholder="Passing, Defense"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!newPlayerForm.name || !newPlayerForm.jersey_number}
                className="px-4 py-2 bg-team-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Player
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading players...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Players Found</h3>
            <p className="text-gray-500">
              {searchQuery || positionFilter !== 'All'
                ? 'Try adjusting your search or filter'
                : 'Add your first player to get started'
              }
            </p>
          </div>
        ) : (
          /* Players Grid */
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => (
              <div key={player.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {editingPlayer === player.id ? (
                  /* Edit Form */
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-900">Edit Player</h3>
                      <div className="flex gap-2">
                        <button onClick={handleSave} className="text-green-600 hover:text-green-700 font-medium text-sm">Save</button>
                        <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700 font-medium text-sm">Cancel</button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Name"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={editForm.jersey_number || ''}
                          onChange={(e) => handleFormChange('jersey_number', parseInt(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Jersey #"
                        />
                        <select
                          value={editForm.position || ''}
                          onChange={(e) => handleFormChange('position', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="Forward">Forward</option>
                          <option value="Midfielder">Midfielder</option>
                          <option value="Defender">Defender</option>
                          <option value="Goalkeeper">Goalkeeper</option>
                          <option value="Winger">Winger</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Goals</label>
                          <input
                            type="number"
                            value={editForm.stats?.goals || 0}
                            onChange={(e) => handleFormChange('stats.goals', parseInt(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Assists</label>
                          <input
                            type="number"
                            value={editForm.stats?.assists || 0}
                            onChange={(e) => handleFormChange('stats.assists', parseInt(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Games</label>
                          <input
                            type="number"
                            value={editForm.stats?.games_played || 0}
                            onChange={(e) => handleFormChange('stats.games_played', parseInt(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Yellow</label>
                          <input
                            type="number"
                            value={editForm.stats?.yellow_cards || 0}
                            onChange={(e) => handleFormChange('stats.yellow_cards', parseInt(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Photo</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], false)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <>
                    <div className="flex items-center p-4 border-b border-gray-100">
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <Image
                          src={player.photo_url || '/logo.png'}
                          alt={player.name}
                          fill
                          className="rounded-full object-cover border-2 border-team-blue"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-team-red text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                          {player.jersey_number}
                        </div>
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{player.name}</h3>
                        <p className="text-sm text-team-blue font-medium">{player.position}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-2 text-center mb-4">
                        <div>
                          <div className="text-lg font-bold text-gray-900">{player.player_stats?.[0]?.goals || 0}</div>
                          <div className="text-xs text-gray-500">Goals</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{player.player_stats?.[0]?.assists || 0}</div>
                          <div className="text-xs text-gray-500">Assists</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{player.player_stats?.[0]?.games_played || 0}</div>
                          <div className="text-xs text-gray-500">Games</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{player.player_stats?.[0]?.yellow_cards || 0}</div>
                          <div className="text-xs text-gray-500">Yellow</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(player)}
                          className="flex-1 bg-team-blue text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function PlayersAdmin() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </AdminLayout>
    }>
      <PlayersAdminContent />
    </Suspense>
  );
}
