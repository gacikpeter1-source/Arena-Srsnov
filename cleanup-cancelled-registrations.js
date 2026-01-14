/**
 * ONE-TIME CLEANUP SCRIPT
 * This script deletes all cancelled registrations from Firestore
 * 
 * HOW TO RUN:
 * 1. Make sure you have Node.js installed
 * 2. Run: node cleanup-cancelled-registrations.js
 * 3. The script will show you how many cancelled registrations it found
 * 4. It will delete them and show confirmation
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: "arena-srsnov",
  // Add your service account credentials here if needed
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: serviceAccount.projectId
});

const db = admin.firestore();

async function cleanupCancelledRegistrations() {
  try {
    console.log('🔍 Searching for cancelled registrations...\n');
    
    // Query all cancelled registrations
    const cancelledQuery = db.collection('registrations')
      .where('status', '==', 'cancelled');
    
    const snapshot = await cancelledQuery.get();
    
    if (snapshot.empty) {
      console.log('✅ No cancelled registrations found! Database is clean.\n');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} cancelled registrations\n`);
    console.log('Cancelled registrations:');
    console.log('------------------------');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} (${data.email}) - Event: ${data.eventId}`);
    });
    
    console.log('\n🗑️  Deleting cancelled registrations...\n');
    
    // Delete all cancelled registrations in batches
    const batchSize = 500;
    let deletedCount = 0;
    
    while (true) {
      const batch = db.batch();
      const docsToDelete = await db.collection('registrations')
        .where('status', '==', 'cancelled')
        .limit(batchSize)
        .get();
      
      if (docsToDelete.empty) {
        break;
      }
      
      docsToDelete.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      
      await batch.commit();
      console.log(`   Deleted ${deletedCount} documents...`);
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log(`   Total deleted: ${deletedCount} cancelled registrations\n`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    process.exit();
  }
}

// Run the cleanup
cleanupCancelledRegistrations();



