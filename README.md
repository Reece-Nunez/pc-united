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
| `S3_REGION` / `S3_BUCKET_NAME` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | S3 uploads (photos, receipts, medical forms) |
| `NEXT_PUBLIC_SITE_URL` | Base URL used to build shareable links (e.g. medical form links). Defaults to `https://poncacityunited.com` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (NunezDev account) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio phone number to send from, E.164 (e.g. `+1918...`). Alternatively set `TWILIO_MESSAGING_SERVICE_SID` |

> **Twilio / SMS:** sending medical-form links by text uses Twilio. US app-to-person
> SMS requires A2P 10DLC brand + campaign registration for the sending number, or
> carriers will filter the messages. Configure this in the Twilio console.

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
