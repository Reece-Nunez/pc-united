'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageUpload from "@/components/ImageUpload";
import toast from 'react-hot-toast';
import { 
  getNews, 
  createNews, 
  updateNews, 
  deleteNews,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getSchedule,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  News, 
  Event, 
  Schedule, 
  Announcement 
} from "@/lib/supabase";

type ActiveTab = 'news' | 'events' | 'schedule' | 'announcements';

interface NewsForm extends Omit<News, 'id' | 'created_at' | 'updated_at'> {
  [key: string]: any;
}

interface EventForm extends Omit<Event, 'id' | 'created_at' | 'updated_at'> {
  [key: string]: any;
}

interface ScheduleForm extends Omit<Schedule, 'id' | 'created_at' | 'updated_at'> {
  [key: string]: any;
}

interface AnnouncementForm extends Omit<Announcement, 'id' | 'created_at' | 'updated_at'> {
  [key: string]: any;
}

export default function TeamAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('news');
  const [loading, setLoading] = useState(false);

  // Data states
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Form states
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [newsForm, setNewsForm] = useState<NewsForm>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    author: '',
    published: false,
    publish_date: ''
  });

  const [eventForm, setEventForm] = useState<EventForm>({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    location: '',
    event_type: 'other',
    featured_image: '',
    registration_required: false,
    registration_link: '',
    max_participants: undefined
  });

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    opponent: '',
    game_date: '',
    location: '',
    home_game: true,
    game_type: 'league',
    season: '2024-2025',
    our_score: undefined,
    opponent_score: undefined,
    status: 'scheduled',
    notes: ''
  });

  const [announcementForm, setAnnouncementForm] = useState<AnnouncementForm>({
    title: '',
    content: '',
    announcement_type: 'general',
    priority: 1,
    active: true,
    expires_at: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [newsResult, eventsResult, scheduleResult, announcementsResult] = await Promise.all([
        getNews(),
        getEvents(),
        getSchedule(),
        getActiveAnnouncements()
      ]);

      if (!newsResult.error) setNews(newsResult.data || []);
      if (!eventsResult.error) setEvents(eventsResult.data || []);
      if (!scheduleResult.error) setSchedule(scheduleResult.data || []);
      if (!announcementsResult.error) setAnnouncements(announcementsResult.data || []);
    } catch (error: any) {
      toast.error(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (form: any, setForm: Function, field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = {
        ...newsForm,
        slug: newsForm.slug || generateSlug(newsForm.title),
        publish_date: newsForm.publish_date || new Date().toISOString()
      };

      if (editingNews) {
        const result = await updateNews(editingNews.id, formData);
        if (result.error) throw new Error(result.error.message);
        toast.success('News article updated successfully!');
        setEditingNews(null);
      } else {
        const result = await createNews(formData);
        if (result.error) throw new Error(result.error.message);
        toast.success('News article created successfully!');
      }
      
      setNewsForm({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featured_image: '',
        author: '',
        published: false,
        publish_date: ''
      });
      
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingEvent) {
        const result = await updateEvent(editingEvent.id, eventForm);
        if (result.error) throw new Error(result.error.message);
        toast.success('Event updated successfully!');
        setEditingEvent(null);
      } else {
        const result = await createEvent(eventForm);
        if (result.error) throw new Error(result.error.message);
        toast.success('Event created successfully!');
      }
      
      setEventForm({
        title: '',
        description: '',
        event_date: '',
        end_date: '',
        location: '',
        event_type: 'other',
        featured_image: '',
        registration_required: false,
        registration_link: '',
        max_participants: undefined
      });
      
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingSchedule) {
        const result = await updateScheduleItem(editingSchedule.id, scheduleForm);
        if (result.error) throw new Error(result.error.message);
        toast.success('Schedule item updated successfully!');
        setEditingSchedule(null);
      } else {
        const result = await createScheduleItem(scheduleForm);
        if (result.error) throw new Error(result.error.message);
        toast.success('Schedule item created successfully!');
      }
      
      setScheduleForm({
        opponent: '',
        game_date: '',
        location: '',
        home_game: true,
        game_type: 'league',
        season: '2024-2025',
        our_score: undefined,
        opponent_score: undefined,
        status: 'scheduled',
        notes: ''
      });
      
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingAnnouncement) {
        const result = await updateAnnouncement(editingAnnouncement.id, announcementForm);
        if (result.error) throw new Error(result.error.message);
        toast.success('Announcement updated successfully!');
        setEditingAnnouncement(null);
      } else {
        const result = await createAnnouncement(announcementForm);
        if (result.error) throw new Error(result.error.message);
        toast.success('Announcement created successfully!');
      }
      
      setAnnouncementForm({
        title: '',
        content: '',
        announcement_type: 'general',
        priority: 1,
        active: true,
        expires_at: ''
      });
      
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: ActiveTab, id: number) => {
    if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
    
    setLoading(true);
    try {
      let result;
      switch (type) {
        case 'news':
          result = await deleteNews(id);
          break;
        case 'events':
          result = await deleteEvent(id);
          break;
        case 'schedule':
          result = await deleteScheduleItem(id);
          break;
        case 'announcements':
          result = await deleteAnnouncement(id);
          break;
      }
      
      if (result.error) throw new Error(result.error.message);
      toast.success(`${type.slice(0, -1)} deleted successfully!`);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: ActiveTab, item: any) => {
    switch (type) {
      case 'news':
        setEditingNews(item);
        setNewsForm({ ...item });
        break;
      case 'events':
        setEditingEvent(item);
        setEventForm({ 
          ...item,
          event_date: item.event_date ? new Date(item.event_date).toISOString().slice(0, 16) : '',
          end_date: item.end_date ? new Date(item.end_date).toISOString().slice(0, 16) : ''
        });
        break;
      case 'schedule':
        setEditingSchedule(item);
        setScheduleForm({ 
          ...item,
          game_date: item.game_date ? new Date(item.game_date).toISOString().slice(0, 16) : ''
        });
        break;
      case 'announcements':
        setEditingAnnouncement(item);
        setAnnouncementForm({ 
          ...item,
          expires_at: item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 16) : ''
        });
        break;
    }
  };

  const cancelEdit = () => {
    setEditingNews(null);
    setEditingEvent(null);
    setEditingSchedule(null);
    setEditingAnnouncement(null);
    setNewsForm({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featured_image: '',
      author: '',
      published: false,
      publish_date: ''
    });
    setEventForm({
      title: '',
      description: '',
      event_date: '',
      end_date: '',
      location: '',
      event_type: 'other',
      featured_image: '',
      registration_required: false,
      registration_link: '',
      max_participants: undefined
    });
    setScheduleForm({
      opponent: '',
      game_date: '',
      location: '',
      home_game: true,
      game_type: 'league',
      season: '2024-2025',
      our_score: undefined,
      opponent_score: undefined,
      status: 'scheduled',
      notes: ''
    });
    setAnnouncementForm({
      title: '',
      content: '',
      announcement_type: 'general',
      priority: 1,
      active: true,
      expires_at: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-6 md:py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-team-blue mb-2">Team Content Administration</h1>
          <p className="text-gray-600 text-sm md:text-base">Manage news, events, schedules, and announcements for the team.</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 md:mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap gap-2 sm:gap-4 md:gap-8">
              {[
                { id: 'news', label: 'News' },
                { id: 'events', label: 'Events' },
                { id: 'schedule', label: 'Schedule' },
                { id: 'announcements', label: 'Announcements' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`py-2 px-3 md:px-4 border-b-2 font-medium text-xs sm:text-sm md:text-base ${
                    activeTab === tab.id
                      ? 'border-team-blue text-team-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-center md:text-left">
              {activeTab === 'news' && (editingNews ? 'Edit News Article' : 'Add New News Article')}
              {activeTab === 'events' && (editingEvent ? 'Edit Event' : 'Add New Event')}
              {activeTab === 'schedule' && (editingSchedule ? 'Edit Schedule Item' : 'Add New Schedule Item')}
              {activeTab === 'announcements' && (editingAnnouncement ? 'Edit Announcement' : 'Add New Announcement')}
            </h2>

            {/* News Form */}
            {activeTab === 'news' && (
              <form onSubmit={handleNewsSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newsForm.title}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug (URL friendly)</label>
                  <input
                    type="text"
                    value={newsForm.slug}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'slug', e.target.value)}
                    placeholder="Auto-generated from title if left empty"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                  <textarea
                    value={newsForm.excerpt || ''}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'excerpt', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea
                    value={newsForm.content}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'content', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
                  <ImageUpload
                    currentImageUrl={newsForm.featured_image}
                    onImageChange={(url) => handleFormChange(newsForm, setNewsForm, 'featured_image', url)}
                    placeholder="Upload or enter URL for featured image"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                  <input
                    type="text"
                    value={newsForm.author || ''}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'author', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                  <input
                    type="datetime-local"
                    value={newsForm.publish_date ? new Date(newsForm.publish_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'publish_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="published"
                    checked={newsForm.published}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'published', e.target.checked)}
                    className="h-4 w-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
                    Published
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-team-blue text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-team-blue disabled:opacity-50 text-sm md:text-base"
                  >
                    {editingNews ? 'Update Article' : 'Create Article'}
                  </button>
                  {(editingNews) && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Events Form */}
            {activeTab === 'events' && (
              <form onSubmit={handleEventSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={eventForm.description || ''}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventForm.event_date}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'event_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={eventForm.end_date || ''}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={eventForm.location || ''}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'event_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="game">Game</option>
                    <option value="practice">Practice</option>
                    <option value="tournament">Tournament</option>
                    <option value="meeting">Meeting</option>
                    <option value="social">Social</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image</label>
                  <ImageUpload
                    currentImageUrl={eventForm.featured_image}
                    onImageChange={(url) => handleFormChange(eventForm, setEventForm, 'featured_image', url)}
                    placeholder="Upload or enter URL for event image"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="registration_required"
                    checked={eventForm.registration_required}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'registration_required', e.target.checked)}
                    className="h-4 w-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="registration_required" className="ml-2 block text-sm text-gray-700">
                    Registration Required
                  </label>
                </div>

                {eventForm.registration_required && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Link</label>
                      <input
                        type="url"
                        value={eventForm.registration_link || ''}
                        onChange={(e) => handleFormChange(eventForm, setEventForm, 'registration_link', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                      <input
                        type="number"
                        value={eventForm.max_participants || ''}
                        onChange={(e) => handleFormChange(eventForm, setEventForm, 'max_participants', parseInt(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-team-blue text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-team-blue disabled:opacity-50 text-sm md:text-base"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                  {(editingEvent) && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Schedule Form */}
            {activeTab === 'schedule' && (
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opponent</label>
                  <input
                    type="text"
                    value={scheduleForm.opponent}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'opponent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Game Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.game_date}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'game_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={scheduleForm.location}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="home_game"
                    checked={scheduleForm.home_game}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'home_game', e.target.checked)}
                    className="h-4 w-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="home_game" className="ml-2 block text-sm text-gray-700">
                    Home Game
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Game Type</label>
                  <select
                    value={scheduleForm.game_type}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'game_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="league">League</option>
                    <option value="friendly">Friendly</option>
                    <option value="tournament">Tournament</option>
                    <option value="playoff">Playoff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
                  <input
                    type="text"
                    value={scheduleForm.season}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'season', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Our Score</label>
                    <input
                      type="number"
                      min="0"
                      value={scheduleForm.our_score || ''}
                      onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'our_score', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opponent Score</label>
                    <input
                      type="number"
                      min="0"
                      value={scheduleForm.opponent_score || ''}
                      onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'opponent_score', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={scheduleForm.status}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={scheduleForm.notes || ''}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-team-blue text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-team-blue disabled:opacity-50 text-sm md:text-base"
                  >
                    {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                  </button>
                  {(editingSchedule) && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Announcements Form */}
            {activeTab === 'announcements' && (
              <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea
                    value={announcementForm.content}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'content', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Announcement Type</label>
                  <select
                    value={announcementForm.announcement_type}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'announcement_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="celebration">Celebration</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'priority', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expires At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={announcementForm.expires_at || ''}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'expires_at', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={announcementForm.active}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'active', e.target.checked)}
                    className="h-4 w-4 text-team-blue border-gray-300 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-team-blue text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-team-blue disabled:opacity-50 text-sm md:text-base"
                  >
                    {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                  </button>
                  {(editingAnnouncement) && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* List Section */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-center md:text-left">
              {activeTab === 'news' && `News Articles (${news.length})`}
              {activeTab === 'events' && `Events (${events.length})`}
              {activeTab === 'schedule' && `Schedule Items (${schedule.length})`}
              {activeTab === 'announcements' && `Announcements (${announcements.length})`}
            </h2>

            <div className="space-y-3 md:space-y-4 max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto">
              {/* News List */}
              {activeTab === 'news' && news.map((article) => (
                <div key={article.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base">{article.title}</h3>
                      {article.excerpt && <p className="text-xs md:text-sm text-gray-600 mt-1">{article.excerpt}</p>}
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                        <span>By: {article.author || 'Unknown'}</span>
                        <span>{article.published ? 'Published' : 'Draft'}</span>
                        <span>{article.publish_date ? new Date(article.publish_date).toLocaleDateString() : 'No date'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit('news', article)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('news', article.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 bg-red-50 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Events List */}
              {activeTab === 'events' && events.map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base">{event.title}</h3>
                      {event.description && <p className="text-xs md:text-sm text-gray-600 mt-1">{event.description}</p>}
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                        <span className="capitalize">{event.event_type}</span>
                        <span>{new Date(event.event_date).toLocaleDateString()}</span>
                        {event.location && <span>{event.location}</span>}
                        {event.registration_required && <span>Registration Required</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit('events', event)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('events', event.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 bg-red-50 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Schedule List */}
              {activeTab === 'schedule' && schedule.map((game) => (
                <div key={game.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base">vs {game.opponent}</h3>
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(game.game_date).toLocaleDateString()}</span>
                        <span>{game.location}</span>
                        <span>{game.home_game ? 'Home' : 'Away'}</span>
                        <span className="capitalize">{game.game_type}</span>
                        <span className="capitalize">{game.status.replace('_', ' ')}</span>
                        {game.our_score !== null && game.our_score !== undefined && 
                         game.opponent_score !== null && game.opponent_score !== undefined && (
                          <span className="font-semibold text-xs sm:text-sm">
                            {game.our_score} - {game.opponent_score}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit('schedule', game)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('schedule', game.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 bg-red-50 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Announcements List */}
              {activeTab === 'announcements' && announcements.map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base">{announcement.title}</h3>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">{announcement.content}</p>
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                        <span className="capitalize">{announcement.announcement_type}</span>
                        <span>Priority: {announcement.priority === 1 ? 'Low' : announcement.priority === 2 ? 'Medium' : 'High'}</span>
                        <span>{announcement.active ? 'Active' : 'Inactive'}</span>
                        {announcement.expires_at && (
                          <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit('announcements', announcement)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('announcements', announcement.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 bg-red-50 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty states */}
              {activeTab === 'news' && news.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No news articles found. Create your first article above.
                </div>
              )}
              {activeTab === 'events' && events.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No events found. Create your first event above.
                </div>
              )}
              {activeTab === 'schedule' && schedule.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No schedule items found. Create your first game above.
                </div>
              )}
              {activeTab === 'announcements' && announcements.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No announcements found. Create your first announcement above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}