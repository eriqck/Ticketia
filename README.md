# Ticketia

Kenya-first event commerce with Paystack checkout and organizer subaccount payouts.

## Getting Started

Copy `.env.example` to `.env.local`, set your Paystack secret key from the Paystack Dashboard, `DATABASE_URL`, `SCANNER_SNAPSHOT_KEY`, an Ed25519 `TICKET_SIGNING_PRIVATE_KEY`/`TICKET_SIGNING_PUBLIC_KEY` pair, and the Supabase Storage values. Create a public `event-media` bucket (or use the bucket named by `SUPABASE_STORAGE_BUCKET`) in Supabase Storage. Do not commit `.env.local` or share server-only secrets such as the Supabase service-role key. Apply the PostgreSQL migrations in `db/migrations/` before enabling database-backed payouts and offline ticket verification. Organizer subaccount codes are created by `/organizer` and persisted in PostgreSQL; they are not configured as a global demo value.

Before deploying the performance changes, apply all PostgreSQL migrations in order, including `db/migrations/011_event_dashboard_indexes.sql`, `db/migrations/012_public_event_lookup_indexes.sql`, and `db/migrations/013_event_slugs.sql`. Vercel must use the hosted production PostgreSQL connection string, preferably the provider's pooler connection for serverless workloads; never use the local `DATABASE_URL` from `.env.local` in production. Checkout always rechecks live ticket inventory before creating a payment.

The public event catalog is deliberately uncached (`no-store`) so newly published events appear on the next viewer request. Events dated before today are excluded from the public catalog by design.

Start the development server:

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
Production builds use `next build --webpack` because this Windows environment does not provide the native Turbopack binding.
Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
