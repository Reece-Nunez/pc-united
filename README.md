This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment variables

Set these in `.env.local` (local) and in the Vercel project settings (production).
`.env*` files are gitignored — never commit secrets.

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin APIs (user management, SMS reminder cron) |
| `S3_REGION` / `S3_BUCKET_NAME` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | S3 uploads (photos, receipts, medical forms) |
| `NEXT_PUBLIC_SITE_URL` | Base URL used to build shareable links (e.g. medical form links). Defaults to `https://poncacityunited.com` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (NunezDev account) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio phone number to send from, E.164 (e.g. `+1918...`). Alternatively set `TWILIO_MESSAGING_SERVICE_SID` |
| `CRON_SECRET` | Auth for the daily SMS reminder cron (`/api/cron/reminders`). Vercel sends it automatically as a Bearer token when set |
| `GROUPME_BOT_ID` | GroupMe bot id, used to post messages into the group |
| `GROUPME_CALLBACK_TOKEN` | Secret path segment for the GroupMe callback URL. **This is the only credential on that endpoint** — treat it like a password |
| `GROUPME_GROUP_ID` | Group the bot is bound to; callbacks from any other group are ignored. Optional but recommended |

> **Twilio / SMS:** sending medical-form links by text uses Twilio. US app-to-person
> SMS requires A2P 10DLC brand + campaign registration for the sending number, or
> carriers will filter the messages. Configure this in the Twilio console.

## GroupMe bot

Create a bot at <https://dev.groupme.com/bots>, pick the group, and set its
callback URL to:

```
https://poncacityunited.com/api/groupme/callback/<GROUPME_CALLBACK_TOKEN>
```

Copy the bot id it hands back into `GROUPME_BOT_ID`, and the group id into
`GROUPME_GROUP_ID`.

**GroupMe does not sign its callbacks** — unlike Twilio there is no HMAC to
verify, so the secret token in the URL path is the entire authentication story.
Anyone who learns that URL can POST arbitrary payloads to it. Keep it out of
logs and screenshots, and rotate it (edit the bot, change the env var) if it
leaks. The route additionally drops any payload whose `group_id` doesn't match
`GROUPME_GROUP_ID`, and drops `sender_type: "bot"` messages so the bot can't
answer itself in a loop.

Chat commands (`src/app/api/groupme/callback/[token]/route.ts`):

| Command | Reply |
| --- | --- |
| `!next` | Next scheduled game — opponent, date, time, location |
| `!help` | Lists the available commands |

Commands answer **only information already public on the site**. A GroupMe group
is a shared room, so anything tied to an individual — dues balances, contact
details, medical forms — must never be answerable here.

To post into the group from server code, use `postToGroupMe()` in
`src/lib/groupme.ts`.

## SMS practice/game reminders + reply-to-RSVP

A Vercel Cron (`vercel.json`) hits `/api/cron/reminders` daily at 13:00 UTC
(7 AM CST / 8 AM CDT). It texts every approved parent (from `parent_children`)
whose child's team has a practice (`events`, `event_type='practice'`) or a
scheduled game (`schedule`, `status='scheduled'`) that club-day. Team-less items
go to all approved parents. Sends are logged in `sms_reminder_log`
(migration `20260716_create_sms_reminder_log.sql`) so reruns never double-text.

Parents can reply **YES / NO / MAYBE** to the reminder. `/api/sms/webhook`
(set as the incoming-message webhook on the Twilio number, signature-verified)
matches the sender's phone to their approved parent links and upserts
`event_attendance.rsvp` for each kid on the reminded item's team — the same
rows the `/rsvp` page and admin attendance page use.

A second hourly cron hits `/api/cron/coach-digest`: for any practice/game
starting within the next 2 hours (club time) it texts every **active coach**
(`coaches` table, needs a phone) the RSVP breakdown — going / maybe /
not going / no reply. Deduped per item via the same log table. Note: hourly
crons require Vercel Pro (Hobby limits crons to daily).

## Medical release forms

Admins generate a per-player medical release request at `/admin/medical-forms`,
then text the parent a link (via Twilio) or copy it manually. Parents fill and
sign at `/forms/medical/<token>`. Completed forms can be exported as JPEG or PDF
(single or multi-select zip) for tournament uploads.

## Testing

Unit tests run on [Vitest](https://vitest.dev) (jsdom environment, React Testing
Library available for component tests).

```bash
npm test          # run once (CI)
npm run test:watch # watch mode
```

Tests live next to the code they cover as `*.test.ts` / `*.test.tsx`
(e.g. `src/app/api/admin/users/route.test.ts`). The `@/*` path alias works in
tests via `vitest.config.ts`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
