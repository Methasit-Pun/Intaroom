// Test Prisma connection to Supabase
// Run this with: node scripts/test-prisma-connection.js

import prisma from '../lib/prisma.ts'

async function testConnection() {
  try {
    console.log('🔍 Testing Prisma connection to Supabase...\n')

    // Test 1: Count profiles
    const profileCount = await prisma.profile.count()
    console.log('✅ Profiles table:', profileCount, 'records')

    // Test 2: Count rooms
    const roomCount = await prisma.room.count()
    console.log('✅ Rooms table:', roomCount, 'records')

    // Test 3: Count reservations
    const reservationCount = await prisma.reservation.count()
    console.log('✅ Reservations table:', reservationCount, 'records')

    // Test 4: Get sample profile
    const sampleProfile = await prisma.profile.findFirst({
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        email_verified: true,
      }
    })
    
    if (sampleProfile) {
      console.log('\n📊 Sample Profile:')
      console.log('   Name:', sampleProfile.full_name || 'N/A')
      console.log('   Email:', sampleProfile.email)
      console.log('   Role:', sampleProfile.role)
      console.log('   Verified:', sampleProfile.email_verified ? '✅' : '❌')
    }

    console.log('\n🎉 Connection successful! Prisma is working with Supabase.')
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message)
    console.error('\n💡 Make sure you:')
    console.error('   1. Added your database password to .env.local')
    console.error('   2. Ran: npx prisma generate')
    console.error('   3. Check your DATABASE_URL format')
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
