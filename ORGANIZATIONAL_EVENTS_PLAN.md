# 🔵 Organizational Events Implementation Plan

## Status: IN PROGRESS

This document tracks the implementation of the Excel Import & Multi-Trainer Booking System.

---

## ✅ Phase 1: Foundation (COMPLETED)
- [x] Install xlsx library (v0.18.5)
- [x] Review requirements document
- [x] Create implementation plan

---

## 🚧 Phase 2: Data Structure & Types (IN PROGRESS)

### Updates to `src/types/index.ts`:
```typescript
export interface Event {
  // ... existing fields ...
  
  // NEW: Organizational event fields
  isOrganizational?: boolean
  importedBy?: string
  importedAt?: Date
  status?: 'pending' | 'active'  // pending until first trainer confirms
}
```

### New Collection Structure:
- **Events**: Add `isOrganizational`, `importedBy`, `importedAt`, `status`
- **Registrations**: Add `isOrganizationalEvent` flag
- **Users**: Add `canImport` permission field

---

## 📋 Phase 3: Admin Import System

### Components to Create:
1. `src/pages/ImportSchedulePage.tsx` - Main import interface
2. `src/lib/excelParser.ts` - Excel parsing utilities
3. Add route to App.tsx: `/admin/import`

### Features:
- Excel file upload (.xlsx, .xls, .csv)
- URL input for remote files
- Data preview table
- Validation before import
- Batch Firestore creation

---

## 🎨 Phase 4: Calendar Display

### Updates to `CalendarWeekGrid.tsx`:
- Query both organizational and regular events
- Apply blue styling for organizational events
- CSS class: `.event-organizational`
- Color: #60A5FA (light blue)
- Visual indicator: 🔵 emoji

### Styling Requirements:
```css
.event-organizational {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(96, 165, 250, 0.08));
  border-left: 4px solid #60A5FA;
  border-right: 1px dashed #60A5FA;
}
```

---

## 👨‍🏫 Phase 5: Trainer Confirmation

### Component: `TrainerConfirmOrgEventModal.tsx`

**Shows:**
- Event details
- Already confirmed trainers (with photos)
- Capacity input (number or unlimited)
- Description textarea
- Duration editor

**Actions:**
- "Not Available" - dismiss
- "Confirm & Join Event" - add trainer

**Firestore Update:**
```javascript
trainers.{trainerId} = {
  capacity: number | -1,
  currentCount: 0,
  description: string,
  confirmedAt: timestamp
}
```

---

## 👥 Phase 6: User Booking Flow

### Component: `OrgEventTrainerSelectionModal.tsx`

**Three States:**
1. **No trainers confirmed**: Show "check back later" message
2. **Trainers available**: Show trainer cards with:
   - 64x64px profile photo
   - Trainer name
   - Description
   - Capacity display (4/10 or 0/∞)
   - Book/Waitlist button
3. **After trainer selection**: Open existing `RegistrationForm`

**Responsive:**
- Mobile: Stack vertically, 48x48px photos
- Tablet: 2 cards per row
- Desktop: 2-3 cards per row, 64x64px photos

---

## 🔍 Phase 7: Trainer Participant View

### Updates to `EventDetailPage.tsx`:

**For Organizational Events:**
- Filter registrations by `trainerId`
- Show only THIS trainer's participants
- Display full details (name, email, phone, ID)
- QR code access
- Export list button
- "Edit My Capacity" button

**Privacy:**
```javascript
// Query only this trainer's registrations
.where('trainerId', '==', currentUserId)
```

---

## 🔒 Phase 8: Security Rules

### Add to `firestore.rules`:
```javascript
// Organizational event creation (admin only)
allow create: if request.auth != null &&
              request.resource.data.isOrganizational == true &&
              userIsAdmin(request.auth.uid);

// Trainer confirmation (approved trainers)
allow update: if request.auth != null &&
              resource.data.isOrganizational == true &&
              request.resource.data.trainers[request.auth.uid] != null;
```

---

## 📧 Phase 9: Email Updates

### Confirmation Email Changes:
- Include trainer name and description
- Subject: "Registration Confirmed - {Event} with {Trainer}"
- Body: Show selected trainer info

---

## 🧪 Phase 10: Testing

### Test Scenarios:
- [ ] Admin imports 10 events from Excel
- [ ] Blue events display in calendar
- [ ] Trainer confirms availability
- [ ] User selects trainer and books
- [ ] Trainer views only their participants
- [ ] Mobile responsiveness
- [ ] Coexistence with regular events
- [ ] Full capacity scenarios
- [ ] Multiple trainers per event

---

## 📊 Key Metrics to Track:
- Import success rate
- Trainer confirmation rate
- User booking completion rate
- System performance with both event types

---

## 🎯 Next Steps:
1. Update types
2. Create import page
3. Add blue event styling
4. Build modals
5. Update security rules
6. Test thoroughly

---

**Last Updated:** 2026-01-15
**Status:** Ready to implement


