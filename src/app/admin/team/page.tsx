'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ImageUpload from "@/components/ImageUpload";
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import AdminLayout from '@/components/AdminLayout';
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
  createAdminNotification,
  getOpponents,
  addOpponent,
  deleteOpponent,
  getSetting,
  getTournamentEvents,
  News,
  Event,
  Schedule,
  Announcement
} from "@/lib/supabase";
import { logActivity } from '@/lib/audit';
import { createClient } from '@/lib/supabase-browser';
import { getSeasonLabel, getCurrentSeason, getAvailableSeasons, isDateInSeason, type Season } from '@/lib/seasons';
import AutocompleteInput from '@/components/admin/AutocompleteInput';
import PlacesAutocomplete from '@/components/admin/PlacesAutocomplete';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

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

function getSeasonFromDate(dateStr: string): string {
  if (!dateStr) return getCurrentSeason().label;
  return getSeasonLabel(dateStr);
}

function TeamAdminContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as ActiveTab | null;
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam || 'news');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // Strip timezone suffix so the value is treated as local time
  // Supabase stores what was entered (e.g. 12:00) but returns it with
  // a +00:00 suffix.  Stripping the suffix lets the datetime-local
  // input show the original value without any UTC conversion.
  const toLocalDateTimeString = (dateString: string): string => {
    if (!dateString) return '';
    // Remove any timezone offset or Z suffix, keep YYYY-MM-DDTHH:MM
    const stripped = dateString.replace(/[+-]\d{2}:?\d{0,2}$|Z$/g, '');
    // Ensure we only return up to minutes (YYYY-MM-DDTHH:MM)
    return stripped.slice(0, 16);
  };

  // Data states
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tournamentEvents, setTournamentEvents] = useState<{id: number, title: string, event_date: string, event_type: string}[]>([]);

  // Form states
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleSeason, setScheduleSeason] = useState<Season>(getCurrentSeason());
  const scheduleSeasons = getAvailableSeasons(8);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [showOpponentManager, setShowOpponentManager] = useState(false);
  const [homeFieldLocation, setHomeFieldLocation] = useState('');
  const [bulkScoreMode, setBulkScoreMode] = useState(false);
  const [bulkScores, setBulkScores] = useState<Record<number, { our: string; opp: string }>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string, variant?: 'danger' | 'warning' | 'info'}>({open: false, title: '', message: '', onConfirm: () => {}});
  const [recapDialog, setRecapDialog] = useState<{open: boolean, onSubmit: (text: string) => void}>({open: false, onSubmit: () => {}});
  const [recapText, setRecapText] = useState('');

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
    season: getSeasonFromDate(''),
    our_score: undefined,
    opponent_score: undefined,
    status: 'scheduled',
    notes: '',
    event_id: undefined as number | undefined
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
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [newsResult, eventsResult, scheduleResult, announcementsResult, opponentsResult, tournamentResult] = await Promise.all([
        getNews(),
        getEvents(),
        getSchedule(),
        getActiveAnnouncements(),
        getOpponents(),
        getTournamentEvents()
      ]);

      if (!newsResult.error) setNews(newsResult.data || []);
      if (!eventsResult.error) setEvents(eventsResult.data || []);
      if (!scheduleResult.error) setSchedule(scheduleResult.data || []);
      if (!announcementsResult.error) setAnnouncements(announcementsResult.data || []);
      if (!opponentsResult.error) setOpponents((opponentsResult.data || []).map(o => o.name));
      if (!tournamentResult.error) setTournamentEvents(tournamentResult.data || []);

      // Load home field setting
      getSetting('home_field_location').then(({ value }) => {
        if (value) setHomeFieldLocation(value);
      });
    } catch (error: any) {
      toast.error(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (_form: any, setForm: Function, field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
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
        logActivity('update', 'news', editingNews.id, userEmail, { title: newsForm.title });
        setEditingNews(null);
      } else {
        const result = await createNews(formData);
        if (result.error) throw new Error(result.error.message);
        toast.success('News article created successfully!');
        logActivity('create', 'news', result.data?.[0]?.id || newsForm.title, userEmail, { title: newsForm.title });
        createAdminNotification({ type: 'news', title: 'News Published: ' + newsForm.title, message: newsForm.excerpt || newsForm.title, link: '/admin/team?tab=news' });

        // Send newsletter to subscribers if published
        if (formData.published) {
          const capturedNewsForm = { ...newsForm };
          const capturedSlug = formData.slug;
          setConfirmDialog({
            open: true,
            title: 'Send Newsletter',
            message: 'This will email all newsletter subscribers. Continue?',
            confirmText: 'Send',
            variant: 'info',
            onConfirm: () => {
              fetch('/api/newsletter/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'news',
                  title: capturedNewsForm.title,
                  excerpt: capturedNewsForm.excerpt,
                  slug: capturedSlug,
                  featuredImage: capturedNewsForm.featured_image,
                  author: capturedNewsForm.author,
                }),
              }).catch(err => console.error('Newsletter send failed:', err));
            },
          });
        }
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
      const sanitizedEvent = {
        ...eventForm,
        end_date: eventForm.end_date || undefined,
      };
      if (editingEvent) {
        const result = await updateEvent(editingEvent.id, sanitizedEvent);
        if (result.error) throw new Error(result.error.message);
        toast.success('Event updated successfully!');
        logActivity('update', 'event', editingEvent.id, userEmail, { title: eventForm.title });
        setEditingEvent(null);
      } else {
        const result = await createEvent(sanitizedEvent);
        if (result.error) throw new Error(result.error.message);
        toast.success('Event created successfully!');
        logActivity('create', 'event', result.data?.[0]?.id || eventForm.title, userEmail, { title: eventForm.title });
        createAdminNotification({ type: 'event', title: 'New Event: ' + eventForm.title, message: eventForm.description || eventForm.title, link: '/admin/team?tab=events' });
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
        logActivity('update', 'schedule', editingSchedule.id, userEmail, { opponent: scheduleForm.opponent });

        // Send game result newsletter if scores were just added
        const hadScores = editingSchedule.our_score != null && editingSchedule.opponent_score != null;
        const hasScores = scheduleForm.our_score != null && scheduleForm.opponent_score != null;
        if (!hadScores && hasScores && scheduleForm.status === 'completed') {
          const gd = new Date(scheduleForm.game_date);
          fetch('/api/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'game_result',
              opponent: scheduleForm.opponent,
              ourScore: scheduleForm.our_score,
              opponentScore: scheduleForm.opponent_score,
              gameDate: gd.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            }),
          }).catch(err => console.error('Newsletter send failed:', err));
        }

        // Prompt for quick game recap if scores were just added
        if (!hadScores && hasScores) {
          const capturedScheduleForm = { ...scheduleForm };
          setConfirmDialog({
            open: true,
            title: 'Create Game Recap',
            message: 'Create a quick news recap for this game?',
            confirmText: 'Create Recap',
            variant: 'info',
            onConfirm: () => {
              setRecapText('');
              setRecapDialog({
                open: true,
                onSubmit: async (text: string) => {
                  if (text) {
                    const recapTitle = `Game Recap: PCU ${capturedScheduleForm.our_score} - ${capturedScheduleForm.opponent_score} vs ${capturedScheduleForm.opponent}`;
                    const recapSlug = recapTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                    await createNews({
                      title: recapTitle,
                      slug: recapSlug,
                      content: text,
                      excerpt: text,
                      published: true,
                      publish_date: new Date().toISOString(),
                      author: 'PCU Staff',
                    });
                    toast.success('Game recap created!');
                    fetchAllData();
                  }
                  setRecapDialog({ open: false, onSubmit: () => {} });
                },
              });
            },
          });
        }

        setEditingSchedule(null);
      } else {
        // Check for duplicate game (same opponent + same date)
        const newDate = scheduleForm.game_date ? scheduleForm.game_date.split('T')[0] : '';
        const duplicate = schedule.find(g =>
          g.opponent.toLowerCase() === scheduleForm.opponent.toLowerCase() &&
          g.game_date && g.game_date.split('T')[0] === newDate
        );

        const doCreateScheduleItem = async () => {
          const result = await createScheduleItem(scheduleForm);
          if (result.error) throw new Error(result.error.message);
          toast.success('Schedule item created successfully!');
          logActivity('create', 'schedule', result.data?.[0]?.id || scheduleForm.opponent, userEmail, { opponent: scheduleForm.opponent });
          createAdminNotification({ type: 'schedule', title: 'New Game: vs ' + scheduleForm.opponent, message: scheduleForm.opponent + ' - ' + scheduleForm.game_date, link: '/admin/team?tab=schedule' });

          // Send newsletter for new game
          const gd = new Date(scheduleForm.game_date);
          fetch('/api/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'game_scheduled',
              opponent: scheduleForm.opponent,
              gameDate: gd.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
              gameTime: gd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              location: scheduleForm.location,
              homeAway: scheduleForm.home_game ? 'Home Game' : 'Away Game',
              gameType: scheduleForm.game_type,
            }),
          }).catch(err => console.error('Newsletter send failed:', err));
        };

        if (duplicate) {
          setConfirmDialog({
            open: true,
            title: 'Duplicate Game',
            message: `A game vs ${scheduleForm.opponent} on ${newDate} already exists. Add anyway?`,
            confirmText: 'Add Anyway',
            variant: 'warning',
            onConfirm: async () => {
              try {
                await doCreateScheduleItem();
                setScheduleForm({
                  opponent: '',
                  game_date: '',
                  location: '',
                  home_game: true,
                  game_type: 'league',
                  season: getSeasonFromDate(''),
                  our_score: undefined,
                  opponent_score: undefined,
                  status: 'scheduled',
                  notes: '',
                  event_id: undefined
                });
                fetchAllData();
              } catch (error: any) {
                toast.error(error.message);
              } finally {
                setLoading(false);
              }
            },
          });
          setLoading(false);
          return;
        }

        await doCreateScheduleItem();
      }
      
      setScheduleForm({
        opponent: '',
        game_date: '',
        location: '',
        home_game: true,
        game_type: 'league',
        season: getSeasonFromDate(''),
        our_score: undefined,
        opponent_score: undefined,
        status: 'scheduled',
        notes: '',
        event_id: undefined
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
      const sanitizedAnnouncement = {
        ...announcementForm,
        expires_at: announcementForm.expires_at || undefined,
      };
      if (editingAnnouncement) {
        const result = await updateAnnouncement(editingAnnouncement.id, sanitizedAnnouncement);
        if (result.error) throw new Error(result.error.message);
        toast.success('Announcement updated successfully!');
        logActivity('update', 'announcement', editingAnnouncement.id, userEmail, { title: announcementForm.title });
        setEditingAnnouncement(null);
      } else {
        const result = await createAnnouncement(sanitizedAnnouncement);
        if (result.error) throw new Error(result.error.message);
        toast.success('Announcement created successfully!');
        logActivity('create', 'announcement', result.data?.[0]?.id || announcementForm.title, userEmail, { title: announcementForm.title });
        createAdminNotification({ type: 'announcement', title: 'New Announcement: ' + announcementForm.title, message: announcementForm.content || announcementForm.title, link: '/admin/team?tab=announcements' });

        // Send newsletter for new announcement
        fetch('/api/newsletter/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'announcement',
            title: announcementForm.title,
            content: announcementForm.content,
            announcementType: announcementForm.announcement_type,
          }),
        }).catch(err => console.error('Newsletter send failed:', err));
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

  const handleBulkScoreSave = async () => {
    const entries = Object.entries(bulkScores).filter(([, s]) => s.our !== '' && s.opp !== '');
    if (entries.length === 0) {
      toast.error('No scores to save');
      return;
    }
    setBulkSaving(true);
    let saved = 0;
    try {
      for (const [idStr, scores] of entries) {
        const id = parseInt(idStr);
        const game = schedule.find(g => g.id === id);
        const hadScores = game && game.our_score != null && game.opponent_score != null;
        const ourScore = parseInt(scores.our);
        const oppScore = parseInt(scores.opp);

        const { error } = await updateScheduleItem(id, {
          our_score: ourScore,
          opponent_score: oppScore,
          status: 'completed',
        });
        if (error) {
          toast.error(`Failed to save score for game #${id}`);
          continue;
        }
        saved++;
        logActivity('update', 'schedule', id, userEmail, { action: 'bulk_score_entry' });

        // Send game result newsletter if scores are new
        if (!hadScores && game) {
          const gd = new Date(game.game_date);
          fetch('/api/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'game_result',
              opponent: game.opponent,
              ourScore,
              opponentScore: oppScore,
              gameDate: gd.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            }),
          }).catch(err => console.error('Newsletter send failed:', err));
        }
      }
      toast.success(`Saved ${saved} score${saved !== 1 ? 's' : ''}`);
      setBulkScores({});
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDelete = async (type: ActiveTab, id: number) => {
    // Look up the item name before deleting
    let itemName = '';
    if (type === 'news') itemName = news.find(n => n.id === id)?.title || '';
    else if (type === 'events') itemName = events.find(e => e.id === id)?.title || '';
    else if (type === 'schedule') itemName = schedule.find(s => s.id === id)?.opponent || '';
    else if (type === 'announcements') itemName = announcements.find(a => a.id === id)?.title || '';

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
      const entityType = type === 'events' ? 'event' : type === 'announcements' ? 'announcement' : type === 'news' ? 'news' : 'schedule';
      const displayName = type === 'schedule' ? `Game vs ${itemName}` : itemName;
      logActivity('delete', entityType, displayName || id, userEmail, { name: itemName });
      createAdminNotification({ type: entityType, title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Deleted: ${displayName || 'Unknown'}`, message: `"${displayName}" was deleted.`, link: `/admin/team?tab=${type}` });
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
          event_date: toLocalDateTimeString(item.event_date || ''),
          end_date: toLocalDateTimeString(item.end_date || '')
        });
        break;
      case 'schedule':
        setEditingSchedule(item);
        setScheduleForm({
          ...item,
          game_date: toLocalDateTimeString(item.game_date || ''),
          event_id: item.event_id || undefined
        });
        break;
      case 'announcements':
        setEditingAnnouncement(item);
        setAnnouncementForm({ 
          ...item,
          expires_at: toLocalDateTimeString(item.expires_at || '')
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
      season: getSeasonFromDate(''),
      our_score: undefined,
      opponent_score: undefined,
      status: 'scheduled',
      notes: '',
      event_id: undefined
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
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">Team Content</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Manage news, events, schedules, and announcements for the team.</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 md:mb-8">
          <div className="border-b border-gray-200 dark:border-gray-600">
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
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 self-start">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={newsForm.title}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug (URL friendly)</label>
                  <input
                    type="text"
                    value={newsForm.slug}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'slug', e.target.value)}
                    placeholder="Auto-generated from title if left empty"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Excerpt</label>
                  <textarea
                    value={newsForm.excerpt || ''}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'excerpt', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                  <textarea
                    value={newsForm.content}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'content', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Featured Image</label>
                  <ImageUpload
                    currentImageUrl={newsForm.featured_image}
                    onImageChange={(url) => handleFormChange(newsForm, setNewsForm, 'featured_image', url)}
                    placeholder="Upload or enter URL for featured image"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Author</label>
                  <input
                    type="text"
                    value={newsForm.author || ''}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'author', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Publish Date</label>
                  <input
                    type="datetime-local"
                    value={toLocalDateTimeString(newsForm.publish_date || '')}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'publish_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="published"
                    checked={newsForm.published}
                    onChange={(e) => handleFormChange(newsForm, setNewsForm, 'published', e.target.checked)}
                    className="h-4 w-4 text-team-blue border-gray-300 dark:border-gray-600 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="published" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
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
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm md:text-base"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={eventForm.description || ''}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventForm.event_date}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'event_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={eventForm.end_date || ''}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <PlacesAutocomplete
                    value={eventForm.location || ''}
                    onChange={(val) => handleFormChange(eventForm, setEventForm, 'location', val)}
                    placeholder="Search for a location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => handleFormChange(eventForm, setEventForm, 'event_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Featured Image</label>
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
                    className="h-4 w-4 text-team-blue border-gray-300 dark:border-gray-600 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="registration_required" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Registration Required
                  </label>
                </div>

                {eventForm.registration_required && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Registration Link</label>
                      <input
                        type="url"
                        value={eventForm.registration_link || ''}
                        onChange={(e) => handleFormChange(eventForm, setEventForm, 'registration_link', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Participants</label>
                      <input
                        type="number"
                        value={eventForm.max_participants || ''}
                        onChange={(e) => handleFormChange(eventForm, setEventForm, 'max_participants', parseInt(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
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
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm md:text-base"
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opponent</label>
                    <button
                      type="button"
                      onClick={() => setShowOpponentManager(!showOpponentManager)}
                      className="text-xs text-team-blue hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      {showOpponentManager ? 'Close' : 'Manage'}
                    </button>
                  </div>
                  {showOpponentManager && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Saved opponents ({opponents.length})</p>
                      {opponents.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No opponents saved yet.</p>
                      ) : (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                          {opponents.map((name) => (
                            <li key={name} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                              <span className="text-gray-800 dark:text-gray-200">{name}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm(`Delete opponent "${name}"? This only removes it from the suggestion list, not from existing games.`)) return;
                                  const { error } = await deleteOpponent(name);
                                  if (error) {
                                    toast.error('Failed to delete opponent');
                                  } else {
                                    setOpponents(prev => prev.filter(o => o !== name));
                                    toast.success(`Removed "${name}"`);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs ml-2"
                              >
                                Delete
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <AutocompleteInput
                    value={scheduleForm.opponent}
                    onChange={(val) => handleFormChange(scheduleForm, setScheduleForm, 'opponent', val)}
                    suggestions={opponents}
                    onNewEntry={async (name) => {
                      const { error } = await addOpponent(name);
                      if (!error && !opponents.includes(name)) {
                        setOpponents(prev => [...prev, name].sort());
                      }
                    }}
                    required
                    placeholder="Type or select a team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Game Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.game_date}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScheduleForm((prev) => ({ ...prev, game_date: val, season: getSeasonFromDate(val) }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <PlacesAutocomplete
                    value={scheduleForm.location}
                    onChange={(val) => handleFormChange(scheduleForm, setScheduleForm, 'location', val)}
                    required
                    placeholder="Search for a location"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="home_game"
                    checked={scheduleForm.home_game}
                    onChange={(e) => {
                      const isHome = e.target.checked;
                      setScheduleForm(prev => ({
                        ...prev,
                        home_game: isHome,
                        location: isHome && homeFieldLocation ? homeFieldLocation : prev.location,
                      }));
                    }}
                    className="h-4 w-4 text-team-blue border-gray-300 dark:border-gray-600 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="home_game" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Home Game
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Game Type</label>
                  <select
                    value={scheduleForm.game_type}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'game_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="league">League</option>
                    <option value="friendly">Friendly</option>
                    <option value="tournament">Tournament</option>
                    <option value="playoff">Playoff</option>
                    <option value="indoor">Indoor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tournament / Event (Optional)</label>
                  <select
                    value={scheduleForm.event_id || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : undefined;
                      setScheduleForm(prev => ({ ...prev, event_id: val }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="">None</option>
                    {tournamentEvents.map(evt => (
                      <option key={evt.id} value={evt.id}>{evt.title} ({new Date(evt.event_date).toLocaleDateString()})</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Link this game to a tournament or event</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Season</label>
                  <input
                    type="text"
                    value={scheduleForm.season}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md bg-gray-50 dark:bg-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-set from game date</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Our Score</label>
                    <input
                      type="number"
                      min="0"
                      value={scheduleForm.our_score || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        setScheduleForm(prev => ({
                          ...prev,
                          our_score: val,
                          ...(val != null && prev.opponent_score != null ? { status: 'completed' as const } : {})
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opponent Score</label>
                    <input
                      type="number"
                      min="0"
                      value={scheduleForm.opponent_score || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        setScheduleForm(prev => ({
                          ...prev,
                          opponent_score: val,
                          ...(val != null && prev.our_score != null ? { status: 'completed' as const } : {})
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={scheduleForm.status}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={scheduleForm.notes || ''}
                    onChange={(e) => handleFormChange(scheduleForm, setScheduleForm, 'notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
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
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm md:text-base"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                  <textarea
                    value={announcementForm.content}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'content', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Announcement Type</label>
                  <select
                    value={announcementForm.announcement_type}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'announcement_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value="general">General</option>
                    <option value="urgent">Urgent</option>
                    <option value="celebration">Celebration</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'priority', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expires At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={announcementForm.expires_at || ''}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'expires_at', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={announcementForm.active}
                    onChange={(e) => handleFormChange(announcementForm, setAnnouncementForm, 'active', e.target.checked)}
                    className="h-4 w-4 text-team-blue border-gray-300 dark:border-gray-600 rounded focus:ring-team-blue"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
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
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* List Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-center md:text-left">
                {activeTab === 'news' && `News Articles (${news.length})`}
                {activeTab === 'events' && `Events (${events.length})`}
                {activeTab === 'schedule' && `Schedule`}
                {activeTab === 'announcements' && `Announcements (${announcements.length})`}
              </h2>
              {activeTab === 'schedule' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setBulkScoreMode(!bulkScoreMode); setBulkScores({}); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      bulkScoreMode
                        ? 'bg-team-blue text-white'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {bulkScoreMode ? 'Cancel' : 'Enter Results'}
                  </button>
                  <select
                    value={scheduleSeason.key}
                    onChange={(e) => {
                      const s = scheduleSeasons.find(s => s.key === e.target.value);
                      if (s) setScheduleSeason(s);
                    }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-team-blue focus:border-team-blue"
                >
                    {scheduleSeasons.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto">
              {/* News List */}
              {activeTab === 'news' && news.map((article) => (
                <div key={article.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{article.title}</h3>
                      {article.excerpt && <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">{article.excerpt}</p>}
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>By: {article.author || 'Unknown'}</span>
                        <span>{article.published ? 'Published' : 'Draft'}</span>
                        <span>{article.publish_date ? new Date(article.publish_date).toLocaleDateString() : 'No date'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit('news', article)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('news', article.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Events List */}
              {activeTab === 'events' && events.map((event) => (
                <div key={event.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{event.title}</h3>
                      {event.description && <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>}
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{event.event_type}</span>
                        <span>{new Date(event.event_date).toLocaleDateString()}</span>
                        {event.location && <span>{event.location}</span>}
                        {event.registration_required && <span>Registration Required</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 sm:ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit('events', event)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('events', event.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Schedule List */}
              {activeTab === 'schedule' && (() => {
                const filteredGames = schedule
                  .filter((g) => g.game_date && isDateInSeason(g.game_date, scheduleSeason))
                  .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());

                const renderGame = (game: typeof schedule[0]) => (
                  <div key={game.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">vs {game.opponent}</h3>
                        <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
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
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete('schedule', game.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );

                if (bulkScoreMode) {
                  const gamesNeedingScores = filteredGames.filter(g =>
                    g.our_score == null || g.opponent_score == null
                  );
                  return (
                    <>
                      {gamesNeedingScores.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">All games in {scheduleSeason.label} already have scores.</p>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {gamesNeedingScores.map(game => (
                              <div key={game.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">vs {game.opponent}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(game.game_date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Us"
                                    value={bulkScores[game.id]?.our ?? ''}
                                    onChange={(e) => setBulkScores(prev => ({
                                      ...prev,
                                      [game.id]: { our: e.target.value, opp: prev[game.id]?.opp ?? '' }
                                    }))}
                                    className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-center text-sm"
                                  />
                                  <span className="text-gray-400 text-sm">-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Them"
                                    value={bulkScores[game.id]?.opp ?? ''}
                                    onChange={(e) => setBulkScores(prev => ({
                                      ...prev,
                                      [game.id]: { our: prev[game.id]?.our ?? '', opp: e.target.value }
                                    }))}
                                    className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-center text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="pt-3">
                            <button
                              onClick={handleBulkScoreSave}
                              disabled={bulkSaving || Object.values(bulkScores).filter(s => s.our !== '' && s.opp !== '').length === 0}
                              className="w-full bg-team-blue text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                            >
                              {bulkSaving ? 'Saving...' : `Save ${Object.values(bulkScores).filter(s => s.our !== '' && s.opp !== '').length} Result${Object.values(bulkScores).filter(s => s.our !== '' && s.opp !== '').length !== 1 ? 's' : ''}`}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  );
                }

                return (
                  <>
                    {filteredGames.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No games in {scheduleSeason.label}.</p>
                    )}
                    {filteredGames.map(renderGame)}
                  </>
                );
              })()}

              {/* Announcements List */}
              {activeTab === 'announcements' && announcements.map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{announcement.title}</h3>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">{announcement.content}</p>
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('announcements', announcement.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty states */}
              {activeTab === 'news' && news.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No news articles found. Create your first article above.
                </div>
              )}
              {activeTab === 'events' && events.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No events found. Create your first event above.
                </div>
              )}
              {activeTab === 'schedule' && schedule.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No schedule items found. Create your first game above.
                </div>
              )}
              {activeTab === 'announcements' && announcements.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No announcements found. Create your first announcement above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
      />
      {/* Recap text input dialog (replaces window.prompt) */}
      {recapDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={() => setRecapDialog({ open: false, onSubmit: () => {} })} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl animate-fade-in-scale p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Game Recap</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter a quick game recap (1-2 sentences):</p>
            <textarea
              value={recapText}
              onChange={(e) => setRecapText(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-team-blue focus:border-transparent"
              rows={3}
              autoFocus
              placeholder="e.g. PCU dominated possession in a strong home victory..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRecapDialog({ open: false, onSubmit: () => {} })}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => recapDialog.onSubmit(recapText)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-150"
              >
                Create Recap
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function TeamAdminPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-team-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </AdminLayout>
    }>
      <TeamAdminContent />
    </Suspense>
  );
}