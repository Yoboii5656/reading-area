# Reading Area Manager

A multi-tenant PWA for managing reading area memberships, attendance, and fee collection. Mobile-first, installable, works offline.

## Quick Start

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/setup.sql`
3. Go to **Authentication > Providers** and enable **Phone** (SMS via Twilio or test mode)
4. Copy your project URL and anon key from **Settings > API**

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Locally

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add environment variables in Vercel dashboard.

## Features (Phase 1 - Implemented)

- ✅ Owner login with phone OTP
- ✅ First-time reading area setup
- ✅ Student registration with photo + Aadhaar capture
- ✅ Manual entry/exit attendance logging
- ✅ Live dashboard showing students currently inside
- ✅ Student directory with search
- ✅ Student profiles with attendance & payment history
- ✅ Fee recording (cash/UPI) with membership expiry tracking
- ✅ QR code for door entry (students scan, no app needed)
- ✅ Student-facing QR scan page (works on any phone)
- ✅ UPI QR upload for payment collection
- ✅ WhatsApp reminder shortcut
- ✅ PWA installable with offline support
- ✅ Row-level security (data isolation per owner)

## Tech Stack

- **Frontend**: React + Vite (PWA)
- **Styling**: Tailwind CSS v4
- **Backend/DB**: Supabase (Postgres + Auth + Storage + RLS)
- **Hosting**: Vercel
- **QR Codes**: qrcode.react
- **Icons**: Lucide React

## Project Structure

```
src/
├── components/     Layout, reusable UI
├── contexts/       AuthContext (auth state)
├── lib/            Supabase client
├── pages/          Route pages
│   ├── Login       Phone OTP login
│   ├── Setup       First-time owner setup
│   ├── Dashboard   Live overview + stats
│   ├── Students    Student directory
│   ├── AddStudent  Registration form
│   ├── StudentProfile  Full student detail
│   ├── Attendance  Entry/exit logging + door QR
│   ├── Fees        Payment management
│   ├── Settings    Owner settings + UPI QR
│   └── ScanEntry   Student-facing QR scan page
└── index.css       Tailwind + design tokens
```

## Database

See `supabase/setup.sql` for the complete schema including:
- Tables: owners, students, attendance_logs, fee_payments
- Row Level Security policies
- Storage buckets for photos/files
- Performance indexes
