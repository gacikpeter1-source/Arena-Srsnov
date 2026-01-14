# 📧 Email Setup Guide for Arena Sršňov

## Quick Setup (Using Firebase Extension)

### Step 1: Install Firebase Extension

1. Go to Firebase Console: https://console.firebase.google.com/project/arena-srsnov/extensions
2. Click "Browse Extensions"
3. Search for "Trigger Email from Firestore"
4. Click "Install" on the extension

### Step 2: Configure Extension

During installation, you'll need to provide:

**SMTP Configuration:**
- **SMTP Connection URI**: Get from your email provider
  - Gmail: `smtps://username@gmail.com:app-password@smtp.gmail.com:465`
  - SendGrid: `smtps://apikey:YOUR_API_KEY@smtp.sendgrid.net:465`
  - Mailgun: `smtps://YOUR_USERNAME:YOUR_PASSWORD@smtp.mailgun.org:465`

**Extension Settings:**
- **Collection path**: `mail`
- **Email documents TTL**: `86400` (delete after 24 hours)

### Step 3: Get SMTP Credentials

#### Option A: Gmail (Free, Easy)
1. Go to Google Account settings
2. Enable 2-Step Verification
3. Generate App Password: https://myaccount.google.com/apppasswords
4. Use format: `smtps://your-email@gmail.com:app-password@smtp.gmail.com:465`

#### Option B: SendGrid (Recommended for Production)
1. Sign up: https://signup.sendgrid.com/
2. Free tier: 100 emails/day
3. Create API key
4. Use format: `smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465`

### Step 4: Enable Extension

After installation, the extension will:
- Monitor the `mail` collection
- Send emails automatically when documents are created
- Delete sent emails after TTL expires

## 📝 Email Document Format

When a user registers, create a document in `mail` collection:

```javascript
{
  to: 'user@example.com',
  message: {
    subject: 'Potvrdenie registrácie - Tréning na Aréna Sršňov',
    html: `
      <h2>Potvrdenie registrácie</h2>
      <p>Vitajte, ${userName}!</p>
      <p><strong>Tréning:</strong> ${eventTitle}</p>
      <p><strong>Dátum:</strong> ${eventDate}</p>
      <p><strong>Čas:</strong> ${eventTime}</p>
      <p><strong>Trvanie:</strong> ${duration} minút</p>
      <p><strong>Tréner:</strong> ${trainerName}</p>
      <p><strong>Vaše registračné číslo:</strong> ${uniqueCode}</p>
      <img src="${qrCodeUrl}" alt="QR Code" />
    `
  }
}
```

## 🔧 Alternative: Custom Cloud Functions

If you prefer more control, use Cloud Functions:

### Install Dependencies
```bash
cd functions
npm install --save @sendgrid/mail
# or
npm install --save nodemailer
```

### Create Function
See `functions/src/index.ts` for implementation.

## ✅ Testing

1. Register for an event
2. Check Firebase Console → Extensions → Trigger Email
3. Check your email inbox
4. Verify QR code and registration details

## 🛠️ Troubleshooting

**Emails not sending?**
- Check Firebase Console → Extensions → Logs
- Verify SMTP credentials
- Check spam folder
- Ensure "Less secure app access" is enabled (Gmail)

**Cost concerns?**
- Gmail: Free, 500 emails/day limit
- SendGrid: Free tier 100 emails/day
- Firebase Extension: Free for reasonable usage

## 📊 Current Status

- ✅ Registration form captures email
- ✅ QR code generation working
- ⏳ Email extension needs to be installed
- ⏳ Email template needs to be created

## 🎯 Next Steps

1. Install Firebase Extension (5 minutes)
2. Configure SMTP settings (5 minutes)
3. Update registration code to create email documents (10 minutes)
4. Test with real registration (2 minutes)

Total time: ~25 minutes



