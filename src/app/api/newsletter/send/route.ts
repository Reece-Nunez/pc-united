import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';
import { render } from '@react-email/render';
import { supabase } from '@/lib/supabase';
import NewsletterGameScheduled from '@/emails/NewsletterGameScheduled';
import NewsletterGameResult from '@/emails/NewsletterGameResult';
import NewsletterNews from '@/emails/NewsletterNews';
import NewsletterAnnouncement from '@/emails/NewsletterAnnouncement';

async function getActiveSubscriberEmails(): Promise<string[]> {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('email')
    .eq('active', true);

  if (error || !data) return [];
  return data.map((s: { email: string }) => s.email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    const subscribers = await getActiveSubscriberEmails();
    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, message: 'No active subscribers' });
    }

    let subject: string;
    let html: string;

    switch (type) {
      case 'game_scheduled': {
        const { opponent, gameDate, gameTime, location, homeAway, gameType } = body;
        subject = `New Game: vs ${opponent} - ${gameDate}`;
        html = await render(NewsletterGameScheduled({
          opponent,
          gameDate,
          gameTime,
          location,
          homeAway,
          gameType,
        }));
        break;
      }

      case 'game_result': {
        const { opponent, ourScore, opponentScore, gameDate } = body;
        const result = ourScore > opponentScore ? 'win' : ourScore < opponentScore ? 'loss' : 'draw';
        const resultLabel = result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Draw';
        subject = `Game Result: PCU ${ourScore} - ${opponentScore} ${opponent} (${resultLabel})`;
        html = await render(NewsletterGameResult({
          opponent,
          ourScore,
          opponentScore,
          gameDate,
          result,
        }));
        break;
      }

      case 'news': {
        const { title, excerpt, slug, featuredImage, author } = body;
        subject = `Team News: ${title}`;
        html = await render(NewsletterNews({
          title,
          excerpt: excerpt || '',
          slug,
          featuredImage,
          author,
        }));
        break;
      }

      case 'announcement': {
        const { title, content, announcementType } = body;
        const typeLabels: Record<string, string> = {
          urgent: 'URGENT: ',
          celebration: '',
          reminder: 'Reminder: ',
          general: '',
        };
        subject = `${typeLabels[announcementType] || ''}${title}`;
        html = await render(NewsletterAnnouncement({
          title,
          content,
          announcementType,
        }));
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    // Resend supports up to 50 recipients per call via BCC
    // Send in batches if needed
    const batchSize = 49;
    const results = [];

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      const { data, error } = await resend.emails.send({
        from: 'Ponca City United FC <noreply@poncacityunited.com>',
        to: 'noreply@poncacityunited.com',
        bcc: batch,
        subject,
        html,
      });

      if (error) {
        console.error('Newsletter send error:', error);
        results.push({ error, batch: i / batchSize });
      } else {
        results.push({ success: true, id: data?.id, count: batch.length });
      }
    }

    const totalSent = results.filter(r => r.success).reduce((sum, r) => sum + (r.count || 0), 0);
    console.log(`Newsletter sent: ${totalSent}/${subscribers.length} subscribers, type: ${type}`);

    return NextResponse.json({
      success: true,
      totalSent,
      totalSubscribers: subscribers.length,
    });
  } catch (error: any) {
    console.error('Newsletter send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
