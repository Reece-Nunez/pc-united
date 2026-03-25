import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  getEventById,
  getScheduleByEventId,
  getGalleryImagesByEventId,
  getHighlightsByEventId,
  Event,
  Schedule,
  GalleryImage,
} from '@/lib/supabase';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{ id: string }>;
}

const parseAsLocalTime = (utcDateString: string): Date => {
  const dateStr = utcDateString.replace(/[+-]\d{2}:?\d{0,2}$|Z$/g, '');
  return new Date(dateStr);
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

const eventTypeLabels: Record<Event['event_type'], string> = {
  game: 'Game',
  practice: 'Practice',
  tournament: 'Tournament',
  meeting: 'Meeting',
  social: 'Social',
  other: 'Event',
};

const statusLabels: Record<Schedule['status'], string> = {
  scheduled: 'Upcoming',
  in_progress: 'In Progress',
  completed: 'Final',
  cancelled: 'Cancelled',
  postponed: 'Postponed',
};

const statusColors: Record<Schedule['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  postponed: 'bg-orange-100 text-orange-800',
};

const highlightTypeLabels: Record<string, string> = {
  goal: 'Goal',
  assist: 'Assist',
  save: 'Save',
  defense: 'Defense',
  performance: 'Performance',
  multiple: 'Multiple',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: event } = await getEventById(Number(id));

  if (!event) {
    return {
      title: 'Event Not Found | Ponca City United FC',
    };
  }

  return {
    title: `${event.title} | Ponca City United FC`,
    description:
      event.description || `View details for ${event.title} on Ponca City United FC`,
    openGraph: {
      title: event.title,
      description:
        event.description || `View details for ${event.title} on Ponca City United FC`,
      images: event.featured_image ? [event.featured_image] : [],
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = Number(id);

  const [
    { data: event, error: eventError },
    { data: scheduleItems },
    { data: galleryImages },
    { data: highlights },
  ] = await Promise.all([
    getEventById(eventId),
    getScheduleByEventId(eventId),
    getGalleryImagesByEventId(eventId),
    getHighlightsByEventId(eventId),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const eventDate = parseAsLocalTime(event.event_date);
  const endDate = event.end_date ? parseAsLocalTime(event.end_date) : null;
  const games = scheduleItems || [];
  const images = galleryImages || [];
  const eventHighlights = highlights || [];
  const isTournament = event.event_type === 'tournament' && games.length >= 2;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-team-blue to-blue-900 text-white">
        {event.featured_image && (
          <div className="absolute inset-0 opacity-30">
            <Image
              src={event.featured_image}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <Link
            href="/team?tab=events"
            className="inline-flex items-center text-blue-200 hover:text-white mb-6 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Events
          </Link>

          <span className="inline-block px-3 py-1 text-sm font-semibold bg-white/20 rounded-full mb-4">
            {eventTypeLabels[event.event_type]}
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-blue-100">
            <span className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' at '}
              {eventDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>

            {endDate && (
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
                Ends{' '}
                {endDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}

            {event.location && (
              <span className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {event.location}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Event Details Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {event.description && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{event.description}</p>
          </div>
        )}

        {event.registration_required && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-team-blue mb-2">
              Registration Required
            </h3>
            <p className="text-gray-600 mb-4">
              This event requires registration to participate.
              {event.max_participants &&
                ` Limited to ${event.max_participants} participants.`}
            </p>
            {event.registration_link && (
              <a
                href={event.registration_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-5 py-2.5 bg-team-blue text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Register Now
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        )}
      </section>

      {/* Games / Results Section */}
      {games.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {event.event_type === 'tournament' ? 'Tournament Games' : 'Games & Results'}
            </h2>

            <div className="space-y-4">
              {games.map((game) => {
                const gameDate = parseAsLocalTime(game.game_date);
                const isWin =
                  game.status === 'completed' &&
                  game.our_score != null &&
                  game.opponent_score != null &&
                  game.our_score > game.opponent_score;
                const isLoss =
                  game.status === 'completed' &&
                  game.our_score != null &&
                  game.opponent_score != null &&
                  game.our_score < game.opponent_score;

                return (
                  <div
                    key={game.id}
                    className={`bg-white rounded-lg shadow-lg p-5 border-l-4 ${
                      isWin
                        ? 'border-green-500'
                        : isLoss
                          ? 'border-red-500'
                          : 'border-team-blue'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">
                            PC United vs {game.opponent}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[game.status]}`}
                          >
                            {statusLabels[game.status]}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {gameDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {' at '}
                          {gameDate.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {' | '}
                          {game.location}
                          {game.home_game ? ' (Home)' : ' (Away)'}
                        </div>
                        {game.notes && (
                          <p className="text-sm text-gray-500 mt-1">{game.notes}</p>
                        )}
                      </div>
                      {game.status === 'completed' &&
                        game.our_score != null &&
                        game.opponent_score != null && (
                          <div className="text-right">
                            <span
                              className={`text-2xl font-bold ${
                                isWin
                                  ? 'text-green-600'
                                  : isLoss
                                    ? 'text-red-600'
                                    : 'text-gray-700'
                              }`}
                            >
                              {game.our_score} - {game.opponent_score}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Tournament Bracket */}
      {isTournament && (
        <section className="py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Tournament Bracket
            </h2>
            <TournamentBracket games={games} />
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {images.length > 0 && (
        <section className={`${isTournament ? 'bg-gray-50' : ''} py-12 md:py-16`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img) => (
                <a
                  key={img.id}
                  href={img.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-lg overflow-hidden shadow-lg"
                >
                  <Image
                    src={img.image_url}
                    alt={img.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                    <span className="text-white text-sm font-medium p-3 opacity-0 group-hover:opacity-100 transition-opacity truncate w-full">
                      {img.title}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Highlights Section */}
      {eventHighlights.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Highlights</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {eventHighlights.map(
                (highlight: {
                  id: number;
                  title: string;
                  description?: string;
                  highlight_date: string;
                  type: string;
                  video_url?: string;
                  players?: { name: string } | null;
                }) => {
                  const highlightDate = parseAsLocalTime(highlight.highlight_date);
                  const videoId = highlight.video_url
                    ? extractYouTubeId(highlight.video_url)
                    : null;

                  return (
                    <div
                      key={highlight.id}
                      className="bg-white rounded-lg shadow-lg overflow-hidden"
                    >
                      {videoId && (
                        <div className="relative w-full aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={highlight.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        </div>
                      )}
                      {!videoId && highlight.video_url && (
                        <a
                          href={highlight.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-team-blue text-white text-center py-3 text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Watch Video
                        </a>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-team-blue/10 text-team-blue">
                            {highlightTypeLabels[highlight.type] || highlight.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {highlightDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">
                          {highlight.title}
                        </h3>
                        {highlight.players?.name && (
                          <p className="text-sm text-team-blue font-medium">
                            {highlight.players.name}
                          </p>
                        )}
                        {highlight.description && (
                          <p className="text-sm text-gray-600 mt-2">
                            {highlight.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </section>
      )}

      {/* Back to Events */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/team?tab=events"
            className="inline-flex items-center justify-center px-6 py-3 bg-team-blue text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Events
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tournament Bracket Component                                       */
/* ------------------------------------------------------------------ */

function TournamentBracket({ games }: { games: Schedule[] }) {
  // Sort games chronologically
  const sorted = [...games].sort(
    (a, b) =>
      new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
  );

  // Organize into rounds
  const totalGames = sorted.length;
  const rounds: Schedule[][] = [];

  if (totalGames <= 2) {
    // 2 games: treat first as semifinal, second as final
    if (totalGames === 2) {
      rounds.push([sorted[0]]);
      rounds.push([sorted[1]]);
    } else {
      rounds.push(sorted);
    }
  } else if (totalGames <= 4) {
    // Split: first half as round 1, rest as round 2+
    const half = Math.ceil(totalGames / 2);
    rounds.push(sorted.slice(0, half));
    rounds.push(sorted.slice(half));
  } else if (totalGames <= 7) {
    // quarterfinals (4) + semifinals (2) + final (1)
    rounds.push(sorted.slice(0, 4));
    rounds.push(sorted.slice(4, 6));
    if (sorted.length > 6) rounds.push(sorted.slice(6));
  } else {
    // Just chunk into groups of decreasing size
    let remaining = [...sorted];
    let chunkSize = Math.ceil(remaining.length / 2);
    while (remaining.length > 0) {
      rounds.push(remaining.slice(0, chunkSize));
      remaining = remaining.slice(chunkSize);
      chunkSize = Math.max(1, Math.ceil(chunkSize / 2));
    }
  }

  const roundNames = (count: number, index: number): string => {
    const fromEnd = count - 1 - index;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semifinals';
    if (fromEnd === 2) return 'Quarterfinals';
    return `Round ${index + 1}`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-stretch gap-0 min-w-max">
        {rounds.map((round, roundIdx) => (
          <div key={roundIdx} className="flex items-stretch">
            {/* Round column */}
            <div className="flex flex-col justify-around min-w-[220px] px-2">
              <div className="text-center mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {roundNames(rounds.length, roundIdx)}
                </span>
              </div>
              {round.map((game) => {
                const isWin =
                  game.status === 'completed' &&
                  game.our_score != null &&
                  game.opponent_score != null &&
                  game.our_score > game.opponent_score;
                const isLoss =
                  game.status === 'completed' &&
                  game.our_score != null &&
                  game.opponent_score != null &&
                  game.our_score < game.opponent_score;
                const isCompleted = game.status === 'completed';

                return (
                  <div key={game.id} className="my-3">
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                      {/* PC United row */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 ${
                          isWin
                            ? 'bg-team-blue/5 border-l-4 border-team-blue'
                            : isLoss
                              ? 'border-l-4 border-red-500'
                              : 'border-l-4 border-gray-300'
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            isWin ? 'text-team-blue' : 'text-gray-700'
                          }`}
                        >
                          PC United
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isWin ? 'text-team-blue' : 'text-gray-700'
                          }`}
                        >
                          {isCompleted && game.our_score != null
                            ? game.our_score
                            : ''}
                        </span>
                      </div>

                      {/* Divider with vs */}
                      <div className="flex items-center px-3">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="px-2 text-xs text-gray-400">
                          {isCompleted ? '' : 'vs'}
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>

                      {/* Opponent row */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 ${
                          isLoss
                            ? 'bg-red-50 border-l-4 border-red-500'
                            : isWin
                              ? 'border-l-4 border-gray-300'
                              : 'border-l-4 border-gray-300'
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            isLoss ? 'text-red-600' : 'text-gray-700'
                          }`}
                        >
                          {game.opponent}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isLoss ? 'text-red-600' : 'text-gray-700'
                          }`}
                        >
                          {isCompleted && game.opponent_score != null
                            ? game.opponent_score
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connector lines between rounds */}
            {roundIdx < rounds.length - 1 && (
              <div className="flex flex-col justify-around w-8">
                {round.length > 1 &&
                  Array.from({ length: Math.ceil(round.length / 2) }).map(
                    (_, i) => (
                      <div key={i} className="flex flex-col items-stretch my-3">
                        <div className="border-r-2 border-t-2 border-gray-300 h-8 rounded-tr" />
                        <div className="border-r-2 border-b-2 border-gray-300 h-8 rounded-br" />
                      </div>
                    )
                  )}
                {round.length === 1 && (
                  <div className="flex items-center h-full">
                    <div className="border-t-2 border-gray-300 w-full" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
