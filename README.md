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
| `GROUPME_BOT_ID` | Default GroupMe bot id, used by the `!command` replies on the callback |
| `GROUPME_TEAM_BOTS` | JSON map of team id → `botId:groupId`, e.g. `{"1":"abc:111111111","2":"def:222222222"}`. The `:groupId` suffix is optional but lets inbound `!commands` be answered in the group that asked. Key `"all"` registers a group with no team binding |
| `GROUPME_CALLBACK_TOKEN` | Secret path segment for the GroupMe callback URL. **This is the only credential on that endpoint** — treat it like a password |
| `GROUPME_GROUP_ID` | Group the bot is bound to; callbacks from any other group are ignored. Optional but recommended |
| `GROUPME_ACCESS_TOKEN` | **Personal** GroupMe user token, required only by the calendar sync — bots cannot create calendar events. This token can read every group and DM on the account, so it is far more sensitive than a bot id. Server-side only |
| `GROUPME_CALENDAR_WINDOW_DAYS` | How far ahead the calendar sync publishes. Defaults to 7 |

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
| `!schedule` | Next four games, one per line |
| `!practice` | Next practice — date, time, location |
| `!field` / `!where` | Where the next event is, with a Google Maps link |
| `!record` | Season record — W-L-D plus goals for and against |
| `!roster` | Active players: jersey number, name, position |
| `!help` | Lists the available commands |

Every reply is **scoped to the team whose group asked**, resolved from the
callback's `group_id` via the `:groupId` suffix in `GROUPME_TEAM_BOTS`. Asking
`!next` in the U11 chat never returns a U12 fixture. Items with no `team_id` are
club-wide and appear in both. A group with no team binding sees everything.

Commands answer **only information already public on the site**. A GroupMe group
is a shared room, so anything tied to an individual — dues balances, contact
details, medical forms — must never be answerable here. `!roster` is the sharp
edge: the `players` row also carries `coach_notes`, `strengths` and
`areas_to_improve`, so `formatRoster()` selects jersey number, name and position
and nothing else. There is a test asserting those fields never appear; keep it.

Replies are laid out as multi-line `Label: value` rows. A single-line reply
wrapped into an unreadable blob on phones once real venue strings were in play:
Google Places writes venue *and* full postal address into one `location` column,
so `splitLocation()` separates them into `Location:` and `Address:` rows. Rows
with nothing to show are dropped rather than printed as a bare label.

Reply text is built by pure formatters in `src/lib/groupme-commands.ts` — the
route only queries and dispatches, so every reply is unit-testable.

To post into the group from server code, use `postToGroupMe()` in
`src/lib/groupme.ts`.

### Automatic reminders to the team groups

Each team's group is one bot. Map them in `GROUPME_TEAM_BOTS`:

```
GROUPME_TEAM_BOTS={"1":"botIdForTeam1:groupIdForTeam1","2":"botIdForTeam2:groupIdForTeam2"}
```

Team ids come from the `teams` table. An item whose `team_id` matches posts to
that team's group; an item with **no** team is club-wide and posts to *every*
group, so a whole-club meeting is never silently dropped. An item for a team
with no configured bot reaches nobody — the cron reports these as `unrouted`
rather than counting a silent no-op as success.

Bot ids live in env rather than in the `teams` table because that table is
client-readable for the public roster, and a leaked bot id lets anyone post to
the group.

Two Vercel Crons drive it (`vercel.json`):

| Run | UTC | Club time | Announces |
| --- | --- | --- | --- |
| `?phase=evening` | 23:00 | 6 PM CDT / 5 PM CST | **Tomorrow's** items |
| `?phase=morning` | 13:00 | 8 AM CDT / 7 AM CST | **Today's** items |

Posted: every event type the calendar offers — practices, scheduled games,
tournaments, meetings, socials and `other`. `other` was excluded at first as too
vague, but the club uses it for real fixtures (e.g. "⚽ ENID SCRIMMAGE"), and
silently dropping something families need to show up for is worse than an
occasional low-value post. An `other` event is labelled by its title alone,
since the type name adds nothing.

`groupme_reminder_log` (migration `20260819_create_groupme_reminder_log.sql`) is
the idempotency guard, keyed on item + date + **phase** + bot — the phase is in
the key so the morning run doesn't find the evening row and skip. Rows are
written only after a confirmed post, so a failed send retries next run instead
of being marked delivered.

**Cancellations post immediately**, not on the cron — a cancellation that
arrives with tomorrow's reminder is worthless. Flipping a game to `cancelled` or
`postponed` in the admin schedule editor calls `/api/groupme/announce`, which
rebuilds the message from the stored row (a caller cannot dictate arbitrary text
into the group chats — it only chooses *which game*) and posts once per group.

### Bot activity log

Every message a bot sends is recorded in `groupme_activity_log` (migration
`20260819_create_groupme_activity_log.sql`) with the exact text, which group it
went to, and whether it landed. Failed sends are recorded too — a silent gap in
a group chat is the main thing you need this log to explain. View it at
**/admin/groupme**; the table is default-deny under RLS and read through a
service-role API route rather than from the browser.

This is separate from `groupme_reminder_log` / `groupme_announcement_log`, which
hold bare rows purely for idempotency ("has this been sent?"). The activity log
answers "what did the bots actually say?".

Reminder text is built by `buildGroupMeItems()` in `src/lib/reminders.ts`,
deliberately separate from the SMS `buildReminderItems()`: SMS messages carry
carrier-compliance text ("Reply STOP to opt out") and an RSVP prompt, neither of
which works in a group chat, where there is no STOP handling and a bare "YES"
can't be attributed to a particular child.

### Calendar sync

`/api/cron/groupme-calendar` (daily, 12:00 UTC) publishes the admin calendar into
each team's GroupMe calendar on a **rolling 7-day window**
(`GROUPME_CALENDAR_WINDOW_DAYS`). Publishing a whole season at once buries the
calendar and makes RSVPs meaningless; a week gives families time to answer while
the message reminders still fire the night before and the morning of. Those are
separate crons and are untouched by this one.

Each run creates anything newly inside the window, updates one whose details
changed, and marks one cancelled when the fixture is cancelled or postponed.
`groupme_calendar_sync` (migration `20260819_create_groupme_calendar_sync.sql`)
maps each schedule/event row to its GroupMe `event_id` per group — without it
every run would duplicate, since the event API has no idempotency key. A
`content_hash` of the fields we publish means an untouched fixture costs zero API
calls, and a GroupMe-side edit (someone adding a note in the app) is not mistaken
for a change and overwritten.

A fixture with no confirmed time becomes an **all-day** event rather than being
pinned to a misleading midnight.

> ⚠ **This uses an undocumented API.** dev.groupme.com documents groups,
> messages and bots only; the event endpoints were found by probing and are not
> supported or versioned. Verified working Aug 2026:
> `GET /conversations/:id/events/list`, `POST …/events/create`,
> `POST …/events/update`. **There is no delete** — every path shape tried returns
> a generic 500 while update returns structured JSON errors, so a cancelled
> fixture is renamed `CANCELLED — …` instead of removed. That also leaves it
> visible to anyone who already RSVP'd. If GroupMe changes these, the sync breaks
> and nothing else does.

Unlike bot posting, this needs `GROUPME_ACCESS_TOKEN` — a **user** token, since
bots cannot touch the calendar. Events are created as that user, not the bot.

### GroupMe RSVPs → attendance

`/api/cron/groupme-rsvp` (hourly) reads the RSVPs off the calendar events the
sync published and records them in `event_attendance`. GroupMe has no webhook
for RSVP changes, so polling is the only option.

**RSVP is not attendance.** `event_attendance` already separates parent intent
(`rsvp`) from what the coach recorded (`attendance`). A GroupMe tap fills
`rsvp`. It also drafts `attendance = 'present'` for a *going* only, stamped
`marked_by = 'groupme:auto'` so the UI can show it as unreviewed — playing-time
decisions should rest on a coach confirming who actually turned up, not on who
tapped a button. **A row a coach has already marked is never overwritten.**
A *maybe* or *no* drafts nothing, since neither says anything about turning up.

**Members must be linked first.** GroupMe reports RSVPs as bare user ids and its
member payload carries no email or phone, so nothing joins to `parent_children`.
Link each member once at **/admin/groupme/members**; `groupme_member_map`
(migration `20260819_create_groupme_member_map.sql`) stores it. The page
suggests matches by surname but only marks one *confident* when exactly one
parent shares it — a wrong link silently attributes one family's RSVPs to
another, so ambiguous and nickname-only members are left for a human.

A member maps to a **parent** (covering all their approved children) or to a
single **player**, or is flagged as having no children on the roster. Unlinked
members' RSVPs are ignored and the page shows how many are outstanding.

Because group members are parents, an RSVP expands to their children **on that
group's team only** — a parent with a child in each age group RSVPs separately
in each chat, and a U11 tap must not mark their U12 child as going.

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
