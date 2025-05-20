# Intania Room Reservation
A comprehensive room reservation system for Intania, built with Next.js, Supabase, and Tailwind CSS. This application allows users to browse available rooms, make reservations, and manage their bookings.

**Features**
- 🔐 User authentication with email/password
- 👤 User profiles with credit system
- 🏢 Room browsing and filtering
- 📅 Room reservation with date and time selection
- ✅ Admin approval workflow
- 📱 Responsive design for all devices
- 📊 Admin dashboard for managing reservations
- 🎫 QR code generation for approved reservations

**Getting Started**
- Prerequisites
- Node.js 18.x or later
- npm or yarn
- Git
- Supabase account
  
### Installation

1. Clone the repository:
```shellscript
git clone https://github.com/yourusername/intania-room-reservation.git
cd intania-room-reservation
```

2. Install dependencies:


```shellscript
npm install
# or
yarn install
```

3. Set up environment variables:


Create a `.env.local` file in the root directory with the following variables:

```plaintext
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL scripts in the following order:

1. `database.sql`
2. `create_profiles_table.sql`
3. `create_get_user_role_function.sql`
4. `fix_profiles_rls.sql`
5. `create_admin_profiles_table.sql`
6. `create_admin_user.sql`
7. `add_username_to_profiles.sql`
8. `create_username_check_function.sql`
9. `add_profile_fields.sql`
10. `update_default_credits.sql`





### Running the Development Server

```shellscript
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```plaintext
intania-room-reservation/
├── app/                    # Next.js app directory
│   ├── admin/              # Admin dashboard
│   ├── auth/               # Authentication routes
│   ├── login/              # Login page
│   ├── my-reservations/    # User reservations page
│   ├── profile/            # User profile page
│   ├── register/           # Registration page
│   ├── reserve/            # Room reservation page
│   ├── summary/            # Reservation summary page
│   └── page.tsx            # Home page
├── components/             # Reusable components
├── lib/                    # Utility functions and libraries
├── public/                 # Static assets
└── ...
```

## Authentication Setup

### Supabase Auth Configuration

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Settings
3. Under "Site URL", add your production URL
4. Under "Redirect URLs", add:

1. `https://yourdomain.com/auth/callback`
2. `http://localhost:3000/auth/callback` (for development)





### Email Verification Issue

If users cannot log in after registration in the deployed version (email verification issue):

1. In Supabase dashboard, go to Authentication → Email Templates
2. Make sure the "Confirm signup" template is properly configured
3. Check that your site URL and redirect URLs are correctly set
4. For testing purposes, you can disable email confirmation in Authentication → Settings → Email Auth


## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add the environment variables in the Vercel dashboard
4. Deploy!


## Troubleshooting

### Common Issues

1. **Email verification not working in production**:

1. Check Supabase site URL and redirect URLs
2. Verify email templates are configured correctly
3. Ensure your domain has proper SPF/DKIM records



2. **Database connection issues**:

1. Verify your Supabase URL and keys are correct
2. Check if RLS policies are properly configured



3. **Authentication problems**:

1. Clear browser cookies and local storage
2. Check browser console for errors
3. Verify middleware.ts configuration





## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

```plaintext

This README provides comprehensive instructions for setting up and running the Intania Room Reservation system. It includes detailed steps for installation, database setup, and troubleshooting common issues like the email verification problem you mentioned.

The README is structured to be helpful for both developers working on the project and users who want to deploy it. It includes information about the project structure, features, and deployment instructions.

<Actions>
  <Action name="Add screenshots to README" description="Add screenshots of key pages to the README" />
  <Action name="Create contribution guidelines" description="Create a CONTRIBUTING.md file with guidelines" />
  <Action name="Add API documentation" description="Document the API endpoints used in the application" />
  <Action name="Create database schema diagram" description="Add a visual representation of the database schema" />
</Actions>


```
