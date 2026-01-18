# 🏒 Aréna Sršňov - Training Session Reservation PWA

A modern Progressive Web App for booking hockey training sessions at Aréna Sršňov.

## 🚀 Features

- **Mobile-first responsive design** - Works seamlessly on all devices
- **Multi-language support** - Slovak (primary) and English with auto-detection
- **Anonymous booking** - No user accounts required for booking
- **Trainer authentication** - Email/password with invite code system
- **Calendar views** - Day and week views with filtering
- **Waitlist system** - Auto-promotion when spots open up
- **QR code generation** - For easy app sharing
- **Admin dashboard** - Statistics and trainer management
- **PWA capabilities** - Install as app on mobile devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Shadcn/ui + Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage)
- **i18n**: react-i18next
- **Deployment**: Vercel
- **Runtime**: Node.js 20

## 📦 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Add your Firebase configuration to `.env`:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## 🔥 Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)

2. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable Email/Password

3. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Deploy the security rules from `firestore.rules`

4. Enable Storage:
   - Go to Storage
   - Get started
   - Deploy the security rules from `storage.rules`

5. Create the first admin user:
   - Register a trainer account through the app
   - In Firestore, find the user document
   - Change `role` to `admin` and `status` to `approved`

## 🚀 Development

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## 📱 PWA Configuration

The app is configured as a Progressive Web App with:
- Service Worker for offline functionality
- Web App Manifest for installation
- Optimized caching strategy

## 🔒 Security

- Firestore security rules protect user data
- Email and phone numbers are hidden from public users
- Only trainers can see full booking details
- Trainers can only modify their own events
- Admin has full access to manage trainers

## 🌍 Internationalization

The app automatically detects browser language and defaults to:
- Slovak (sk) for Slovak users
- English (en) for all others

Users can manually switch languages using the globe icon in the navigation.

## 📧 Email Notifications

To enable email notifications (optional):
1. Install the Firebase Extension "Trigger Email"
2. Configure email templates for:
   - Booking confirmation
   - Waitlist promotion
   - Cancellation confirmation

## 🎨 Customization

### Background Image
Trainers and admins can upload custom background images through Settings.

### Training Types
Add or modify training types in `src/pages/CreateEventPage.tsx` in the `trainingTypes` array.

### Colors
Modify the color scheme in `src/index.css` using CSS custom properties.

## 📊 Database Structure

### Collections

- **users**: Trainer profiles and authentication data
- **events**: Training sessions with attendees and waitlists
- **inviteCodes**: Single-use codes for trainer registration
- **settings**: App-wide settings (background image, etc.)

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

The `vercel.json` file is already configured for SPA routing.

### Manual Deployment

```bash
npm run build
```

Upload the `dist` folder to your hosting provider.

## 👥 User Roles

### Public Users
- Browse trainings
- Book sessions (name, email, phone)
- Cancel bookings
- Join waitlists

### Trainers
- All public user features
- Create/edit/delete own events
- View full attendee details
- Generate QR codes
- Upload background images

### Admin
- All trainer features
- Manage trainers (approve/reject/remove)
- Generate invite codes
- View statistics dashboard

## 📝 License

This project is proprietary software for Aréna Sršňov.

## 🤝 Support

For support, contact the development team or open an issue in the repository.






