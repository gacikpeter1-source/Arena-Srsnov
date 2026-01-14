# 🚀 Setup Guide for Aréna Sršňov

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Firebase account
- Vercel account (for deployment)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Firebase Setup

### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Name it "Arena Srsnov" (or your preferred name)
4. Disable Google Analytics (optional)
5. Create the project

### 2.2 Enable Authentication

1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Save

### 2.3 Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Production mode**
4. Select a location (europe-west for Slovakia)
5. Click **Enable**

### 2.4 Deploy Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (select Firestore and Storage)
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

### 2.5 Enable Storage

1. Go to **Storage**
2. Click **Get started**
3. Use default security rules (we'll deploy custom ones)
4. Click **Done**

### 2.6 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to **Your apps**
3. Click **Web app** icon (</>)
4. Register app (name: "Arena Srsnov Web")
5. Copy the `firebaseConfig` object

### 2.7 Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Step 3: Create First Admin User

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:5173`

3. Generate an invite code manually in Firestore:
   - Go to Firestore in Firebase Console
   - Create collection: `inviteCodes`
   - Add document with ID: `ADMIN001`
   - Fields:
     ```json
     {
       "code": "ADMIN001",
       "createdAt": [Current timestamp],
       "createdBy": "system",
       "used": false
     }
     ```

4. Register using the invite code `ADMIN001`

5. After registration, find your user in Firestore:
   - Go to `users` collection
   - Find your user document
   - Edit the document:
     - Change `role` to `admin`
     - Change `status` to `approved`

6. Sign out and sign back in

7. You now have admin access!

## Step 4: Email Notifications (Optional)

### Using Firebase Extensions

1. Go to **Extensions** in Firebase Console
2. Click **Explore Extensions**
3. Search for "Trigger Email"
4. Install the extension
5. Configure:
   - SMTP connection string (use Gmail, SendGrid, or Mailgun)
   - Default FROM address
   - Collection name: `mail`

### Email Templates

Create email templates in your app by adding documents to the `mail` collection:

**Booking Confirmation:**
```javascript
{
  to: [user email],
  message: {
    subject: "Booking Confirmation - Arena Srsnov",
    text: "Your booking has been confirmed...",
    html: "<h1>Booking Confirmed</h1>..."
  }
}
```

**Waitlist Promotion:**
```javascript
{
  to: [user email],
  message: {
    subject: "You're In! - Arena Srsnov",
    text: "A spot opened up...",
    html: "<h1>You're In!</h1>..."
  }
}
```

## Step 5: Create App Icons

You need to create two icon files for PWA functionality:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

Place these files in the `public` folder.

You can use tools like:
- [Favicon Generator](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

Or create them manually with a hockey/arena theme.

## Step 6: Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Step 7: Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

Test the production build locally:

```bash
npm run preview
```

## Step 8: Deploy to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

### Option 2: GitHub + Vercel

1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com)
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Configure:
   - Framework Preset: **Vite**
   - Add environment variables from `.env`
6. Click **Deploy**

### Add Environment Variables in Vercel

Go to **Project Settings** → **Environment Variables** and add all your Firebase config variables.

## Step 9: Custom Domain (Optional)

1. In Vercel, go to **Settings** → **Domains**
2. Add your domain (e.g., `arena-srsnov.sk`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate to be issued

## Step 10: Testing

### Test Checklist

- [ ] User registration with invite code
- [ ] Login/logout
- [ ] Create training event
- [ ] Book training (anonymous)
- [ ] Join waitlist when full
- [ ] Cancel booking
- [ ] Calendar day/week views
- [ ] Filter by trainer
- [ ] Upload background image
- [ ] Generate QR code
- [ ] Admin approve/reject trainers
- [ ] Admin view statistics
- [ ] Language switching (SK/EN)
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] PWA installation

## Troubleshooting

### Firebase Permission Errors

- Make sure security rules are deployed
- Check that user has `approved` status in Firestore
- Verify Firebase indexes are created

### Build Errors

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `rm -rf .vite`
- Check Node.js version: `node -v` (should be 20+)

### Email Not Sending

- Check Firebase Extensions logs
- Verify SMTP credentials
- Check spam folder
- Verify `mail` collection structure

## Next Steps

1. Add your actual logo and icons
2. Customize colors/theme in `src/index.css`
3. Add more training types if needed
4. Configure email templates
5. Set up monitoring/analytics (optional)
6. Add custom domain
7. Test thoroughly before going live

## Support

For issues or questions:
- Check Firebase Console logs
- Check Vercel deployment logs
- Review Firestore security rules
- Check browser console for errors

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Firebase security rules deployed
- [ ] Storage rules deployed
- [ ] First admin account created
- [ ] Background image uploaded
- [ ] Icons created (192x192, 512x512)
- [ ] Favicon added
- [ ] Email notifications tested
- [ ] All features tested
- [ ] Mobile responsive tested
- [ ] PWA installation tested
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Analytics configured (optional)

Good luck with your Arena Srsnov booking system! 🏒





