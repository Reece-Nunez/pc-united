import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { render } from '@react-email/render';
import { supabase } from '@/lib/supabase';
import NewsletterGameReminder from '@/emails/NewsletterGameReminder';

async function getActiveSubscriberEmails(): Promise<string[]> {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('email')
    .eq('active', true);

  if (error || !data) return [];
  return data.map((s: { email: string }) => s.email);
}

export async function GET(request: NextRequest) {
  try {
    // API key check
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const { searchParams } = new URL(request.url);
      const key = searchParams.get('key');
      if (key !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Calculate tomorrow's date range (24-48 hours from now)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterStr = dayAfter.toISOString().split('T')[0];

    // Query games happening tomorrow (between 24-48 hours from now)
    const { data: games, error: gamesError } = await supabase
      .from('schedule')
      .select('*')
      .eq('status', 'scheduled')
      .gte('game_date', tomorrowStr)
      .lt('game_date', dayAfterStr);

    if (gamesError) {
      console.error('Error fetching games:', gamesError);
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }

    if (!games || games.length === 0) {
      return NextResponse.json({ success: true, message: 'No games tomorrow', remindersSent: 0 });
    }

    const subscribers = await getActiveSubscriberEmails();
    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, message: 'No active subscribers', remindersSent: 0 });
    }

    let totalRemindersSent = 0;

    for (const game of games) {
      const gameDate = new Date(game.game_date + 'T00:00:00');
      const formattedDate = gameDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Extract time from game_date if it includes time, otherwise use a default
      const gameDateFull = new Date(game.game_date);
      const formattedTime = gameDateFull.getHours() !== 0
        ? gameDateFull.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : 'TBD';

      const homeAway = game.home_game ? 'Home Game' : 'Away Game';

      const subject = `Game Day Reminder: vs ${game.opponent} - Tomorrow`;
      const html = await render(NewsletterGameReminder({
        opponent: game.opponent,
        gameDate: formattedDate,
        gameTime: formattedTime,
        location: game.location,
        homeAway,
      }));

      // Send in batches of 49 (Resend BCC limit is 50)
      const batchSize = 49;
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const { error: sendError } = await resend.emails.send({
          from: 'Ponca City United FC <noreply@poncacityunited.com>',
          to: 'noreply@poncacityunited.com',
          bcc: batch,
          subject,
          html,
        });

        if (sendError) {
          console.error('Game reminder send error:', sendError);
        } else {
          totalRemindersSent += batch.length;
        }
      }
    }

    console.log(`Game reminders sent: ${totalRemindersSent} emails for ${games.length} game(s)`);

    return NextResponse.json({
      success: true,
      gamesFound: games.length,
      subscriberCount: subscribers.length,
      remindersSent: totalRemindersSent,
    });
  } catch (error: any) {
    console.error('Game reminder cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
