# Multi-Tenant Billing System

A comprehensive next-generation billing and invoice management system built for multiple tenants. Features include native Excel exports, WhatsApp integrations (Ultramsg + Custom Webhooks), automated overdue payment tracking, and a full super-admin dashboard.

## Tech Stack
- Next.js 14 (App Router)
- Supabase (Database, Auth, Row Level Security)
- Tailwind CSS & Shadcn UI

## 🚀 Deployment Instructions

### 1. Database Setup (Supabase)
1. Create a new project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the `supabase/migrations/` folder in this repository.
4. Copy and paste the contents of **all migration files** (from `001` to `005`) sequentially into the SQL editor and run them. This will create all the required tables (`clients`, `bills`, `license_keys`, `app_config`) and RLS policies.
5. In the `app_config` table, manually insert your master credentials:
   - `admin_password`: Your master password for the dashboard.
   - `admin_whatsapp`: Your default WhatsApp number for system alerts.

### 2. Environment Variables
Copy `.env.example` to `.env.local` for local development, or add these to your Vercel project environment settings:

```bash
NEXT_PUBLIC_SUPABASE_URL="your-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Generate a strong random secret for admin cookies
ADMIN_SESSION_SECRET="your-super-secret-random-string"

# (Optional) Default WhatsApp Fallbacks
WHATSAPP_API_URL=""
WHATSAPP_INSTANCE_ID=""
WHATSAPP_API_KEY=""
```

*To get your Supabase URL and Keys, go to Project Settings -> API.*

### 3. Vercel Deployment
This project is configured out-of-the-box for [Vercel](https://vercel.com).
1. Push this repository to GitHub.
2. Go to Vercel, click "Add New Project", and select this repository.
3. In the **Environment Variables** section, paste all the variables listed in step 2.
4. Click **Deploy**.

### 4. Running Locally
If you want to run the project locally on your machine:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## 🔐 How to Access the Admin Dashboard
The Admin login button is intentionally hidden. To access it:
1. Go to the `/login` route.
2. In the bottom-left corner of the page, look for a tiny dot (white in dark mode, black in light mode).
3. Click the dot and enter the `admin_password` you saved in the `app_config` table.
4. You will be redirected to the secure `/admin` area.
