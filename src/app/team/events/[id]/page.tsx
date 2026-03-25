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
  // Separate games by bracket_round
  const groupGames = games
    .filter((g) => g.bracket_round === 'group')
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
  const knockoutGames = games.filter((g) =>
    ['quarterfinal', 'semifinal', 'final', 'third_place'].includes(g.bracket_round || '')
  );
  const otherGames = games.filter((g) => !g.bracket_round);
  const hasTournamentBracket = groupGames.length > 0 || knockoutGames.length > 0;

  // Build group standings from group games (PC United perspective only)
  const buildStandings = () => {
    const teamStats: Record<string, { gp: number; w: number; d: number; l: number; gf: number; ga: number }> = {};
    const ensureTeam = (name: string) => {
      if (!teamStats[name]) teamStats[name] = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    };
    ensureTeam('PC United');

    for (const game of groupGames) {
      ensureTeam(game.opponent);
      if (game.status !== 'completed' || game.our_score == null || game.opponent_score == null) continue;

      const pcGoals = game.our_score;
      const oppGoals = game.opponent_score;

      teamStats['PC United'].gp += 1;
      teamStats['PC United'].gf += pcGoals;
      teamStats['PC United'].ga += oppGoals;
      teamStats[game.opponent].gp += 1;
      teamStats[game.opponent].gf += oppGoals;
      teamStats[game.opponent].ga += pcGoals;

      if (pcGoals > oppGoals) {
        teamStats['PC United'].w += 1;
        teamStats[game.opponent].l += 1;
      } else if (pcGoals < oppGoals) {
        teamStats['PC United'].l += 1;
        teamStats[game.opponent].w += 1;
      } else {
        teamStats['PC United'].d += 1;
        teamStats[game.opponent].d += 1;
      }
    }

    return Object.entries(teamStats)
      .map(([team, s]) => ({
        team,
        ...s,
        gd: s.gf - s.ga,
        pts: s.w * 3 + s.d,
      }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  const standings = groupGames.length > 0 ? buildStandings() : [];

  // Knockout game helpers
  const semiFinals: (Schedule | null)[] = [
    knockoutGames.find((g) => g.bracket_round === 'semifinal' && g.notes?.includes('#1')) ||
      knockoutGames.filter((g) => g.bracket_round === 'semifinal')[0] || null,
    knockoutGames.find((g) => g.bracket_round === 'semifinal' && g.notes?.includes('#2')) ||
      knockoutGames.filter((g) => g.bracket_round === 'semifinal')[1] || null,
  ];
  const finalGame = knockoutGames.find((g) => g.bracket_round === 'final') || null;
  const thirdPlaceGame = knockoutGames.find((g) => g.bracket_round === 'third_place') || null;

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

      {/* Group Standings Table */}
      {groupGames.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-team-blue mb-6">Group Stage Standings</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-team-blue text-white">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-center">GP</th>
                    <th className="px-3 py-2 text-center">W</th>
                    <th className="px-3 py-2 text-center">D</th>
                    <th className="px-3 py-2 text-center">L</th>
                    <th className="px-3 py-2 text-center">GF</th>
                    <th className="px-3 py-2 text-center">GA</th>
                    <th className="px-3 py-2 text-center">GD</th>
                    <th className="px-3 py-2 text-center font-bold">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <tr
                      key={row.team}
                      className={`border-b border-gray-100 ${
                        row.team === 'PC United'
                          ? 'bg-team-blue/5 font-semibold'
                          : i % 2 === 0
                            ? 'bg-white'
                            : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className={`px-3 py-2 ${row.team === 'PC United' ? 'text-team-blue' : ''}`}>{row.team}</td>
                      <td className="px-3 py-2 text-center">{row.gp}</td>
                      <td className="px-3 py-2 text-center">{row.w}</td>
                      <td className="px-3 py-2 text-center">{row.d}</td>
                      <td className="px-3 py-2 text-center">{row.l}</td>
                      <td className="px-3 py-2 text-center">{row.gf}</td>
                      <td className="px-3 py-2 text-center">{row.ga}</td>
                      <td className="px-3 py-2 text-center">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      <td className="px-3 py-2 text-center font-bold">{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">* Standings reflect PC United&apos;s games only. Other teams&apos; head-to-head results are not tracked.</p>
          </div>
        </section>
      )}

      {/* Group Stage Schedule */}
      {groupGames.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-team-blue mb-6">Group Stage Games</h2>
            <div className="space-y-4">
              {groupGames.map((game) => {
                const gameDate = parseAsLocalTime(game.game_date);
                const isWin =
                  game.status === 'completed' && (game.our_score ?? 0) > (game.opponent_score ?? 0);
                const isLoss =
                  game.status === 'completed' && (game.our_score ?? 0) < (game.opponent_score ?? 0);

                return (
                  <div
                    key={game.id}
                    className={`bg-white rounded-lg shadow-md p-5 border-l-4 ${
                      isWin ? 'border-green-500' : isLoss ? 'border-red-500' : 'border-team-blue'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">
                            {game.home_game ? 'PC United' : game.opponent} vs{' '}
                            {game.home_game ? game.opponent : 'PC United'}
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
                          {game.location && ` | ${game.location}`}
                        </div>
                      </div>
                      {game.status === 'completed' &&
                        game.our_score != null &&
                        game.opponent_score != null && (
                          <div className="text-right">
                            <span
                              className={`text-2xl font-bold ${
                                isWin ? 'text-green-600' : isLoss ? 'text-red-600' : 'text-gray-700'
                              }`}
                            >
                              {game.home_game
                                ? `${game.our_score} - ${game.opponent_score}`
                                : `${game.opponent_score} - ${game.our_score}`}
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

      {/* Knockout Bracket */}
      {knockoutGames.length > 0 && (
        <section className="py-12 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-team-blue mb-8">Knockout Stage</h2>
            <div className="flex items-center justify-center gap-0">
              {/* Semifinals Column */}
              <div className="flex flex-col gap-16">
                {semiFinals.map((game, i) => (
                  <div key={game?.id || `semi-${i}`} className="bg-gray-50 rounded-lg shadow-md p-4 w-64 border-l-4 border-team-blue">
                    <p className="text-xs text-gray-500 font-medium mb-2">Semifinal {i + 1}</p>
                    {game ? (
                      <>
                        <div className={`flex justify-between items-center py-1 ${game.status === 'completed' && (game.our_score ?? 0) > (game.opponent_score ?? 0) ? 'font-bold text-team-blue' : ''}`}>
                          <span>{game.home_game ? 'PC United' : game.opponent}</span>
                          <span>{game.status === 'completed' ? (game.home_game ? game.our_score : game.opponent_score) : ''}</span>
                        </div>
                        <div className="border-t border-gray-200 my-1" />
                        <div className={`flex justify-between items-center py-1 ${game.status === 'completed' && (game.opponent_score ?? 0) > (game.our_score ?? 0) ? 'font-bold text-team-blue' : ''}`}>
                          <span>{game.home_game ? game.opponent : 'PC United'}</span>
                          <span>{game.status === 'completed' ? (game.home_game ? game.opponent_score : game.our_score) : ''}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{parseAsLocalTime(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </>
                    ) : (
                      <p className="text-gray-400 text-sm">TBD</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Connector Lines */}
              <div className="flex flex-col items-center w-12">
                <div className="w-full border-t-2 border-gray-300 relative top-[50%]" />
                <div className="h-32 border-r-2 border-gray-300" />
                <div className="w-full border-b-2 border-gray-300 relative bottom-[50%]" />
              </div>

              {/* Final Column */}
              <div className="flex flex-col justify-center">
                {finalGame ? (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg shadow-md p-4 w-64 border-l-4 border-yellow-500">
                    <p className="text-xs text-yellow-700 font-bold mb-2 uppercase">Final</p>
                    <div className={`flex justify-between items-center py-1 ${finalGame.status === 'completed' && (finalGame.our_score ?? 0) > (finalGame.opponent_score ?? 0) ? 'font-bold text-team-blue' : ''}`}>
                      <span>{finalGame.home_game ? 'PC United' : finalGame.opponent}</span>
                      <span>{finalGame.status === 'completed' ? (finalGame.home_game ? finalGame.our_score : finalGame.opponent_score) : ''}</span>
                    </div>
                    <div className="border-t border-yellow-200 my-1" />
                    <div className={`flex justify-between items-center py-1 ${finalGame.status === 'completed' && (finalGame.opponent_score ?? 0) > (finalGame.our_score ?? 0) ? 'font-bold text-team-blue' : ''}`}>
                      <span>{finalGame.home_game ? finalGame.opponent : 'PC United'}</span>
                      <span>{finalGame.status === 'completed' ? (finalGame.home_game ? finalGame.opponent_score : finalGame.our_score) : ''}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{parseAsLocalTime(finalGame.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg shadow-md p-4 w-64 border-l-4 border-gray-300">
                    <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Final</p>
                    <p className="text-gray-400 text-sm">TBD</p>
                  </div>
                )}
              </div>
            </div>

            {/* Third Place Game */}
            {thirdPlaceGame && (
              <div className="mt-8 flex justify-center">
                <div className="bg-gray-50 rounded-lg shadow-md p-4 w-64 border-l-4 border-gray-400">
                  <p className="text-xs text-gray-500 font-bold mb-2 uppercase">3rd Place</p>
                  <div className={`flex justify-between items-center py-1 ${thirdPlaceGame.status === 'completed' && (thirdPlaceGame.our_score ?? 0) > (thirdPlaceGame.opponent_score ?? 0) ? 'font-bold text-team-blue' : ''}`}>
                    <span>{thirdPlaceGame.home_game ? 'PC United' : thirdPlaceGame.opponent}</span>
                    <span>{thirdPlaceGame.status === 'completed' ? (thirdPlaceGame.home_game ? thirdPlaceGame.our_score : thirdPlaceGame.opponent_score) : ''}</span>
                  </div>
                  <div className="border-t border-gray-200 my-1" />
                  <div className={`flex justify-between items-center py-1 ${thirdPlaceGame.status === 'completed' && (thirdPlaceGame.opponent_score ?? 0) > (thirdPlaceGame.our_score ?? 0) ? 'font-bold text-team-blue' : ''}`}>
                    <span>{thirdPlaceGame.home_game ? thirdPlaceGame.opponent : 'PC United'}</span>
                    <span>{thirdPlaceGame.status === 'completed' ? (thirdPlaceGame.home_game ? thirdPlaceGame.opponent_score : thirdPlaceGame.our_score) : ''}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{parseAsLocalTime(thirdPlaceGame.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Games & Results (non-tournament or untagged games) */}
      {otherGames.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {hasTournamentBracket ? 'Other Games' : event.event_type === 'tournament' ? 'Tournament Games' : 'Games & Results'}
            </h2>

            <div className="space-y-4">
              {otherGames.map((game) => {
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

      {/* Gallery Section */}
      {images.length > 0 && (
        <section className={`${hasTournamentBracket ? 'bg-gray-50' : ''} py-12 md:py-16`}>
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

