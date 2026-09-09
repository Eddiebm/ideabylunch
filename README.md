This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## First Transaction Autopilot

Authenticated marketplace owners can open `/dashboard/autopilot` to configure a first-transaction goal, track verified supply-and-demand metrics, and run a bottleneck-aware growth cycle. The system prepares seller recruitment, activation, buyer acquisition, follow-up, and conversion assets behind explicit approval controls. A daily Vercel cron creates new tasks and can email an approval digest; it never reports a generated asset as a completed real-world action.

Approved tasks can be executed through Resend (up to 25 individually addressed emails per approval) or, for buyer-acquisition tasks, through the Meta Marketing API. Meta campaigns are assembled in a paused state and activated only after the complete campaign, ad set, creative, and ad exist. Workspace-level daily and total campaign limits are enforced before launch, and each campaign requires its own explicit spend confirmation.

Execution uses the existing `RESEND_API_KEY` and `RESEND_FROM` variables. Meta execution additionally requires `META_AD_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_PAGE_ID`, and optionally `META_GRAPH_VERSION` and `META_AD_CURRENCY`.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
