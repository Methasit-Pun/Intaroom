# Intaroom - Room Reservation System

> A modern, full-stack room reservation platform built for Intania with Next.js 14, Supabase, and LINE integration.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8)](https://tailwindcss.com/)

## 🚀 Features

- **🔐 Multi-Auth System** - Email/password + LINE integration
- **👤 User Management** - Profile system with credit-based reservations
- **🏢 Smart Room Booking** - Real-time availability with conflict detection
- **⚡ Admin Dashboard** - Comprehensive management with analytics
- **📱 Mobile Optimized** - Responsive design for all devices
- **🎫 QR Generation** - Automated QR codes for approved reservations
- **📊 Analytics** - Room usage statistics and reporting

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **UI Components:** Radix UI + shadcn/ui
- **Integration:** LINE LIFF API
- **Deployment:** Vercel

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Supabase account

### 1. Clone & Install

```bash
git clone https://github.com/Methasit-Pun/Intaroom.git
cd Intaroom
npm install
```

### 2. Environment Setup

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Setup

Run SQL files in order (in Supabase SQL Editor):

```sql
-- 1. Core schema and tables
\i database-schema.sql

-- 2. Authentication and user management  
\i auth-and-users.sql

-- 3. Migrations and fixes
\i migrations-and-fixes.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard & calendar
│   ├── auth/              # Authentication callbacks
│   ├── login/             # Login/register pages
│   ├── profile/           # User profile management
│   ├── reserve/           # Room reservation flow
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Custom components
├── lib/                  # Utilities and configurations
│   ├── supabase.ts       # Supabase client
│   ├── utils.ts          # Helper functions
│   └── reservation-utils.ts
└── hooks/                # Custom React hooks
```

## 🔑 Default Credentials

### Admin Access
```
Username: admin1
Password: admin123
```

### Test User
```
Email: mb@test.com
Password: abc123
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database Migration

For existing databases, run the migration scripts safely:

```sql
-- All scripts are idempotent and include existence checks
-- Safe to run multiple times
```

## 🔧 Configuration

### Supabase Settings

1. **Authentication → Settings**
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/auth/callback`

2. **Authentication → Providers**
   - Enable Email provider
   - Configure EMAIL templates

### LINE Integration (Optional)

1. Create LINE Login Channel
2. Add LIFF app configuration
3. Update environment variables

## 📊 Features Overview

| Feature | User | Admin |
|---------|------|-------|
| Authentication | ✅ Email + LINE | ✅ Direct login |
| Room Browsing | ✅ | ✅ |
| Reservations | ✅ Create/View | ✅ Manage/Approve |
| QR Codes | ✅ Receive | ✅ Generate |
| Analytics | ❌ | ✅ |
| User Management | ❌ | ✅ |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 👨‍💻 Author

**Methasit-Pun** - [GitHub](https://github.com/Methasit-Pun)

---

<p align="center">Built with ❤️ for Intania community</p>
