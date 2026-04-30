// Example: Fix Email Verification Using Prisma
// This script shows how to fix the email verification issue with Prisma

import prisma from '../lib/prisma.ts'

async function fixEmailVerification() {
  try {
    console.log('🔧 Starting email verification fix...\n')

    // OPTION 1: Auto-confirm ALL users with missing email_verified
    console.log('Option 1: Auto-confirming all unverified users...')
    const updateAll = await prisma.profile.updateMany({
      where: {
        email_verified: false,
      },
      data: {
        email_verified: true,
        updated_at: new Date(),
      },
    })
    console.log(`✅ Updated ${updateAll.count} users\n`)

    // OPTION 2: Sync email_verified with Supabase auth status
    // This requires a raw query since auth schema is managed by Supabase
    console.log('Option 2: Syncing with Supabase auth.users...')
    const syncResult = await prisma.$executeRaw`
      UPDATE public.profiles p
      SET 
        email_verified = true,
        updated_at = NOW()
      FROM auth.users u
      WHERE 
        p.id = u.id 
        AND u.email_confirmed_at IS NOT NULL 
        AND p.email_verified = false
    `
    console.log(`✅ Synced ${syncResult} users from auth.users\n`)

    // OPTION 3: Get list of unconfirmed users
    console.log('Option 3: Finding remaining unconfirmed users...')
    const unconfirmed = await prisma.profile.findMany({
      where: {
        email_verified: false,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        created_at: true,
      },
      take: 10,
    })

    if (unconfirmed.length > 0) {
      console.log(`⚠️ Found ${unconfirmed.length} unconfirmed users:`)
      unconfirmed.forEach(user => {
        console.log(`   - ${user.email} (${user.full_name || 'No name'})`)
      })
    } else {
      console.log('✅ All users are verified!')
    }

    console.log('\n🎉 Email verification fix completed!')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixEmailVerification()

// ALTERNATIVE: Fix specific user by email
export async function fixUserByEmail(email: string) {
  const user = await prisma.profile.update({
    where: { email },
    data: {
      email_verified: true,
      updated_at: new Date(),
    },
  })
  return user
}

// ALTERNATIVE: Fix specific user by ID
export async function fixUserById(userId: string) {
  const user = await prisma.profile.update({
    where: { id: userId },
    data: {
      email_verified: true,
      updated_at: new Date(),
    },
  })
  return user
}
