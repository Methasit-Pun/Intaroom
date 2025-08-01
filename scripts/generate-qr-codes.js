/**
 * Script to automatically generate QR codes for all existing reservations
 * Run this script to update all reservations in the database with QR codes
 */

const { createClient } = require('@supabase/supabase-js')

// Import your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// QR Code generation function (copied from reservation-utils.ts for standalone use)
function generateQRCodeForRecord(reservation) {
  const roomPrefix = "INR"
  const cleanConfirmation = reservation.confirmation_number.replace(/[^0-9]/g, "")
  const roomId = reservation.room_id.toString().padStart(2, "0")
  const dateCode = reservation.date.replace(/-/g, "").slice(2) // YYMMDD format
  // Fix: Replace all colons and take only first 4 digits (HHMM format)
  const timeCode = reservation.start_time.replace(/:/g, "").slice(0, 4) || "0000"

  // Generate code: INR + room_id + date + time + confirmation
  return `${roomPrefix}${roomId}${dateCode}${timeCode}${cleanConfirmation}`
}

async function generateQRCodesForAll() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    console.log('🔄 Fetching all reservations from database...')

    // Fetch all reservations
    const { data: allReservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, room_id, date, start_time, confirmation_number, status, qr_code_url')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('❌ Error fetching reservations:', fetchError)
      return
    }

    if (!allReservations || allReservations.length === 0) {
      console.log('ℹ️  No reservations found in database')
      return
    }

    console.log(`📋 Found ${allReservations.length} reservations. Generating QR codes...`)

    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Process each reservation
    for (const reservation of allReservations) {
      try {
        // Generate QR code for this reservation
        const qrCodeText = generateQRCodeForRecord(reservation)
        
        // Check if QR code already exists and is the same
        if (reservation.qr_code_url === qrCodeText) {
          console.log(`⏭️  Skipped reservation ${reservation.id} (QR code already up to date)`)
          skippedCount++
          continue
        }

        // Update the reservation with the generated QR code
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ qr_code_url: qrCodeText })
          .eq('id', reservation.id)

        if (updateError) {
          console.error(`❌ Error updating reservation ${reservation.id}:`, updateError)
          errorCount++
        } else {
          console.log(`✅ Updated reservation ${reservation.id} with QR code: ${qrCodeText}`)
          updatedCount++
        }

        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Failed to process reservation ${reservation.id}:`, error)
        errorCount++
      }
    }

    console.log('\n📊 QR Code Generation Summary:')
    console.log(`✅ Updated: ${updatedCount}`)
    console.log(`⏭️  Skipped: ${skippedCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log(`📋 Total: ${allReservations.length}`)

  } catch (error) {
    console.error('❌ Failed to generate QR codes:', error)
  }
}

// Run the script
generateQRCodesForAll()
  .then(() => {
    console.log('🎉 QR code generation script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
