import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, limit, addDoc } from 'firebase/firestore'
import { db } from './firebase'
import { Registration, Event } from '@/types'

/**
 * Promotes the first person from waitlist to confirmed when a spot opens up
 */
export async function promoteFromWaitlist(eventId: string, trainerId: string): Promise<void> {
  try {
    // Get all waitlist registrations for this trainer, ordered by position
    const waitlistQuery = query(
      collection(db, 'registrations'),
      where('eventId', '==', eventId),
      where('trainerId', '==', trainerId),
      where('status', '==', 'waitlist'),
      orderBy('position', 'asc'),
      limit(1)
    )
    
    const waitlistSnap = await getDocs(waitlistQuery)
    
    if (waitlistSnap.empty) {
      console.log('No one on waitlist to promote')
      return
    }

    // Get the first person on waitlist
    const firstWaitlisted = waitlistSnap.docs[0]
    const registrationData = firstWaitlisted.data() as Registration

    // Promote them to confirmed
    await updateDoc(doc(db, 'registrations', firstWaitlisted.id), {
      status: 'confirmed',
      position: null // Remove position field
    })

    // Update event trainer currentCount
    const eventRef = doc(db, 'events', eventId)
    const eventDoc = await getDoc(eventRef)
    
    if (eventDoc.exists()) {
      const eventData = eventDoc.data() as Event
      const trainerSlot = eventData.trainers[trainerId]
      
      if (trainerSlot) {
        await updateDoc(eventRef, {
          [`trainers.${trainerId}.currentCount`]: (trainerSlot.currentCount || 0) + 1
        })
      }
    }

    // Reorder remaining waitlist positions
    const remainingWaitlistQuery = query(
      collection(db, 'registrations'),
      where('eventId', '==', eventId),
      where('trainerId', '==', trainerId),
      where('status', '==', 'waitlist'),
      orderBy('position', 'asc')
    )
    
    const remainingSnap = await getDocs(remainingWaitlistQuery)
    const updatePromises: Promise<void>[] = []
    
    remainingSnap.docs.forEach((doc, index) => {
      updatePromises.push(
        updateDoc(doc.ref, {
          position: index + 1
        })
      )
    })
    
    await Promise.all(updatePromises)

    console.log(`Promoted ${registrationData.name} from waitlist to confirmed`)

    // Send promotion email
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      if (eventDoc.exists()) {
        const eventData = eventDoc.data()
        
        // Format date properly (handle Timestamp or string)
        let formattedDate = eventData.date
        if (typeof eventData.date === 'object' && eventData.date?.toDate) {
          // It's a Timestamp, convert to readable format
          const dateObj = eventData.date.toDate()
          formattedDate = dateObj.toLocaleDateString('sk-SK', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        } else if (typeof eventData.date === 'string') {
          // It's a string like "2026-01-14", format it nicely
          const dateObj = new Date(eventData.date)
          formattedDate = dateObj.toLocaleDateString('sk-SK', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        }
        
        const emailData = {
          to: registrationData.email,
          message: {
            subject: '🎉 Uvoľnilo sa miesto! - Aréna Sršňov',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
                  .content { background: #f9f9f9; padding: 20px; }
                  .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #22c55e; }
                  .success-badge { background: #22c55e; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; font-weight: bold; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🏒 Aréna Sršňov</h1>
                    <h2>Gratulujeme!</h2>
                  </div>
                  
                  <div class="content">
                    <div class="success-badge">✅ POTVRDENÉ - Uvoľnilo sa miesto!</div>
                    
                    <p style="margin-top: 20px;">Dobrá správa, <strong>${registrationData.name}</strong>!</p>
                    
                    <p>Uvoľnilo sa miesto na tréningu a boli ste automaticky presunutí z čakacej listiny na potvrdené miesto!</p>
                    
                    <div class="info-row">
                      <span class="label">Tréning:</span>
                      <span class="value">${eventData.title}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Dátum:</span>
                      <span class="value">${formattedDate}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Čas:</span>
                      <span class="value">${eventData.startTime}</span>
                    </div>
                    
                    <div class="info-row" style="background: #fffbeb; border-left-color: #FDB913;">
                      <span class="label">Vaše registračné číslo:</span>
                      <span class="value" style="font-size: 20px; font-weight: bold; color: #FDB913;">${registrationData.uniqueCode}</span>
                    </div>
                    
                    <p style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                      <strong>📱 QR kód:</strong> Váš QR kód pre check-in nájdete v aplikácii po prihlásení.
                    </p>
                    
                    <div style="margin-top: 30px; padding: 20px; background: white; border: 2px solid #e5e7eb; border-radius: 8px; text-align: center;">
                      <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                        Potrebujete zrušiť registráciu?
                      </p>
                      <a href="https://arena-srsnov.vercel.app/my-registration/${firstWaitlisted.id}/${registrationData.cancellationToken}" 
                         style="display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                        Zrušiť registráciu
                      </a>
                      <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                        Tento odkaz je platný do vypršania platnosti tokenu
                      </p>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>Tešíme sa na vás na tréningu! 🏒</p>
                    <p style="font-size: 11px; color: #999; margin-top: 10px;">
                      Tento email bol automaticky vygenerovaný systémom Aréna Sršňov.
                    </p>
                    <p>&copy; ${new Date().getFullYear()} Aréna Sršňov. Všetky práva vyhradené.</p>
                  </div>
                </div>
              </body>
              </html>
            `
          }
        }
        await addDoc(collection(db, 'mail'), emailData)
        console.log('✅ Promotion email queued for:', registrationData.email)
      }
    } catch (emailError) {
      console.warn('⚠️ Could not queue promotion email:', emailError)
    }
    
  } catch (error) {
    console.error('Error promoting from waitlist:', error)
    throw error
  }
}

/**
 * Cancels a registration and promotes someone from waitlist if applicable
 * DELETES the registration document from Firestore
 */
export async function cancelRegistration(registrationId: string): Promise<void> {
  try {
    const registrationRef = doc(db, 'registrations', registrationId)
    const registrationDoc = await getDoc(registrationRef)
    
    if (!registrationDoc.exists()) {
      throw new Error('Registration not found')
    }

    const registration = registrationDoc.data() as Registration
    const { eventId, trainerId, status, position, name, email, uniqueCode } = registration

    // Fetch event details BEFORE deletion (needed for email)
    const eventRef = doc(db, 'events', eventId)
    const eventDoc = await getDoc(eventRef)
    let eventData: Event | null = null
    let trainerName = 'Tréner'
    
    if (eventDoc.exists()) {
      eventData = eventDoc.data() as Event
      trainerName = eventData.trainers[trainerId]?.trainerName || 'Tréner'
    }

    // If this was a confirmed registration, update trainer currentCount and promote from waitlist
    if (status === 'confirmed') {
      if (eventDoc.exists() && eventData) {
        const trainerSlot = eventData.trainers[trainerId]
        
        if (trainerSlot) {
          // Decrement current count
          await updateDoc(eventRef, {
            [`trainers.${trainerId}.currentCount`]: Math.max(0, (trainerSlot.currentCount || 0) - 1)
          })

          // Check if there's anyone on the waitlist to promote
          await promoteFromWaitlist(eventId, trainerId)
        }
      }
    }

    // If this was a waitlist registration, reorder remaining waitlist
    if (status === 'waitlist' && position) {
      const waitlistQuery = query(
        collection(db, 'registrations'),
        where('eventId', '==', eventId),
        where('trainerId', '==', trainerId),
        where('status', '==', 'waitlist'),
        where('position', '>', position),
        orderBy('position', 'asc')
      )
      
      const waitlistSnap = await getDocs(waitlistQuery)
      const updatePromises: Promise<void>[] = []
      
      waitlistSnap.forEach((doc) => {
        const currentPosition = doc.data().position as number
        updatePromises.push(
          updateDoc(doc.ref, {
            position: currentPosition - 1
          })
        )
      })
      
      await Promise.all(updatePromises)
    }

    // Send cancellation confirmation email BEFORE deleting registration
    if (eventData) {
      try {
        // Format date properly (handle Timestamp, Date, or string)
        let formattedDate: string
        const dateValue: any = eventData.date
        
        if (dateValue && typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
          // It's a Firestore Timestamp, convert to readable format
          const dateObj = dateValue.toDate()
          formattedDate = dateObj.toLocaleDateString('sk-SK', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        } else if (dateValue instanceof Date) {
          // It's already a Date object
          formattedDate = dateValue.toLocaleDateString('sk-SK', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        } else if (typeof dateValue === 'string') {
          // It's a string like "2026-01-14", format it nicely
          const dateObj = new Date(dateValue)
          formattedDate = dateObj.toLocaleDateString('sk-SK', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        } else {
          formattedDate = String(dateValue)
        }
        
        const emailData = {
          to: email,
          message: {
            subject: 'Zrušenie registrácie - Aréna Sršňov',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #1a1a1a; color: #FDB913; padding: 20px; text-align: center; }
                  .content { background: #f9f9f9; padding: 20px; }
                  .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #dc2626; }
                  .label { font-weight: bold; color: #666; }
                  .value { color: #000; }
                  .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                  .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; background: #dc2626; color: white; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🏒 Aréna Sršňov</h1>
                    <h2>Zrušenie registrácie</h2>
                  </div>
                  
                  <div class="content">
                    <p>Dobrý deň, <strong>${name}</strong>!</p>
                    
                    <p>Vaša registrácia bola úspešne <span class="status-badge">ZRUŠENÁ</span> pre nasledujúci tréning:</p>
                    
                    <div class="info-row">
                      <span class="label">Tréning:</span>
                      <span class="value">${eventData.title}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Dátum:</span>
                      <span class="value">${formattedDate}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Čas:</span>
                      <span class="value">${eventData.startTime}</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Trvanie:</span>
                      <span class="value">${eventData.duration} minút</span>
                    </div>
                    
                    <div class="info-row">
                      <span class="label">Tréner:</span>
                      <span class="value">${trainerName}</span>
                    </div>
                    
                    <div class="info-row" style="border-left-color: #dc2626; background: #fee;">
                      <span class="label">Vaše registračné číslo:</span>
                      <span class="value" style="font-size: 18px; font-weight: bold; color: #dc2626;">${uniqueCode}</span>
                    </div>
                    
                    ${status === 'confirmed' ? `
                      <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 5px;">
                        <p style="margin: 0; font-size: 14px;">
                          <strong>ℹ️ Informácia:</strong> Vaše miesto bolo uvoľnené a ďalšia osoba z čakacej listiny bola upovedomená.
                        </p>
                      </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                      <p style="margin: 0; font-size: 14px;">
                        <strong>💡 Tip:</strong> Ak si to rozmyslíte, môžete sa znovu zaregistrovať cez našu aplikáciu.
                      </p>
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p>Tento email bol automaticky vygenerovaný systémom Aréna Sršňov.</p>
                    <p style="font-size: 11px; color: #999; margin-top: 10px;">
                      Ďakujeme za používanie našej aplikácie!
                    </p>
                    <p>&copy; ${new Date().getFullYear()} Aréna Sršňov. Všetky práva vyhradené.</p>
                  </div>
                </div>
              </body>
              </html>
            `
          }
        }
        
        await addDoc(collection(db, 'mail'), emailData)
        console.log('✅ Cancellation confirmation email queued for:', email)
      } catch (emailError) {
        console.warn('⚠️ Could not send cancellation email:', emailError)
        // Don't fail the cancellation if email fails
      }
    }

    // DELETE the registration document from Firestore
    await deleteDoc(registrationRef)

    console.log(`✅ Deleted registration ${registrationId} from Firestore`)
    
  } catch (error) {
    console.error('Error cancelling registration:', error)
    throw error
  }
}

/**
 * Gets the next available position in the waitlist for a trainer
 */
export async function getNextWaitlistPosition(eventId: string, trainerId: string): Promise<number> {
  try {
    const waitlistQuery = query(
      collection(db, 'registrations'),
      where('eventId', '==', eventId),
      where('trainerId', '==', trainerId),
      where('status', '==', 'waitlist'),
      orderBy('position', 'desc'),
      limit(1)
    )
    
    const waitlistSnap = await getDocs(waitlistQuery)
    
    if (waitlistSnap.empty) {
      return 1 // First person on waitlist
    }

    const lastPosition = waitlistSnap.docs[0].data().position as number
    return lastPosition + 1
    
  } catch (error) {
    console.error('Error getting next waitlist position:', error)
    return 1
  }
}

