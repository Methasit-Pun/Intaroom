# Phone Number Feature - Quick Test Guide

## Prerequisites
- Supabase project is set up and running
- Application is running locally or deployed
- You have both a regular user account and admin access

## Test Scenarios

### Scenario 1: New User Without Phone Number

**Steps:**
1. Create a new user account or use an account without a phone number
2. Log in to the application
3. Navigate to a room's calendar view
4. Select a date and try to reserve a room
5. Click on any available time slot

**Expected Result:**
- ❌ Should NOT immediately show time slot selection
- ✅ Should show "Telephone Number Required" screen
- ✅ Screen should contain:
  - Phone icon
  - Title: "Telephone Number Required"
  - Explanation text
  - "Complete Profile Setup" button
  - "Cancel" button

**Next Steps:**
6. Click "Complete Profile Setup"

**Expected Result:**
- ✅ Should redirect to `/profile?setup=true&required=telephone&returnUrl=/reserve?...`
- ✅ Profile page should show error message: "Please add your telephone number to continue making reservations."
- ✅ Phone number field should be visible and editable

7. Enter a valid phone number (e.g., "0812345678")
8. Click "Save Changes"

**Expected Result:**
- ✅ Success message should appear
- ✅ After 2 seconds, should auto-redirect back to reservation page
- ✅ Should now see time slot selection interface

9. Continue with reservation process

**Expected Result:**
- ✅ Reservation should proceed normally
- ✅ No more phone number prompts

---

### Scenario 2: Existing User With Phone Number

**Steps:**
1. Log in with an account that has a phone number in database
2. Navigate to room reservation
3. Select a date and available time slots

**Expected Result:**
- ✅ Should proceed directly to time slot selection
- ✅ No phone number requirement screen should appear
- ✅ Reservation process works smoothly

---

### Scenario 3: Phone Number Validation

**Steps:**
1. Go to profile page (with or without setup mode)
2. Try entering invalid phone numbers:
   - Empty string: ""
   - Too short: "123"
   - Too long: "12345678901234567890"
   - With letters: "abc1234567"
   - With special chars: "081-234-5678"

**Expected Result:**
- ❌ Should show error: "Please enter a valid telephone number (8-15 digits)"
- ❌ Should NOT save to database

3. Try entering valid phone numbers:
   - "0812345678"
   - "08123456789"
   - "081234567890"

**Expected Result:**
- ✅ Should save successfully
- ✅ Success message should appear

---

### Scenario 4: Admin Dashboard - Users Tab

**Steps:**
1. Log in as admin
2. Go to admin dashboard
3. Click on "Users" tab

**Expected Result:**
- ✅ Table should show columns: Full Name, Email, **Phone**, Status
- ✅ Users with phone numbers should display them (e.g., "0812345678")
- ✅ Users without phone numbers should show "N/A"

4. Use search box to search for a phone number

**Expected Result:**
- ✅ Typing a phone number should filter users
- ✅ Should find users matching that phone number

---

### Scenario 5: Admin Dashboard - Reservations

**Steps:**
1. Stay in admin dashboard
2. Go to "Reservations" tab (or "All", "Pending", "Approved")
3. Look at reservation cards

**Expected Result:**
- ✅ Reservation cards should show phone icon (📱) with contact phone
- ✅ If user has phone in profile, it should appear here
- ✅ If reservation has contact_phone field, it should show

4. Click on a reservation to see details (if modal exists)

**Expected Result:**
- ✅ Phone number should be visible in details view
- ✅ Should be clearly labeled with phone icon

---

### Scenario 6: Profile Management

**Steps:**
1. Log in as regular user
2. Go to profile page
3. View current phone number

**Expected Result:**
- ✅ Phone number field should show current value
- ✅ Field should be editable

4. Change phone number to a new valid number
5. Save changes

**Expected Result:**
- ✅ Success message appears
- ✅ New number is saved to database
- ✅ On page refresh, new number is displayed

---

### Scenario 7: Return URL Preservation

**Steps:**
1. Use account without phone number
2. Navigate to: `/reserve?room=1&roomName=Conference%20Room&date=2026-01-15&availability=[...]`
3. Get redirected to phone setup

**Expected Result:**
- ✅ URL should include `returnUrl` parameter
- ✅ Parameter should contain full reservation URL

4. Complete phone setup and save

**Expected Result:**
- ✅ Should redirect back to exact reservation URL
- ✅ Room, date, and time slots should be preserved
- ✅ Can continue reservation without re-entering data

---

### Scenario 8: Edge Cases

#### 8a. Cancel During Setup
**Steps:**
1. See phone requirement screen
2. Click "Cancel" button

**Expected Result:**
- ✅ Should go back to previous page (calendar view)
- ❌ Should NOT proceed to reservation

#### 8b. Back Button on Profile Setup
**Steps:**
1. On profile setup page (required=telephone)
2. Try clicking browser back button

**Expected Result:**
- ✅ Should not cause errors
- ✅ Should navigate back appropriately

#### 8c. Direct URL Access
**Steps:**
1. Without phone number, manually navigate to `/summary`

**Expected Result:**
- ✅ Should handle missing phone gracefully
- ✅ Might redirect or show appropriate error

---

## Database Verification

### Check Phone Numbers in Database

Using Supabase Dashboard or SQL:

```sql
-- View all users with their phone numbers
SELECT id, full_name, email, telephone, created_at
FROM profiles
ORDER BY created_at DESC;

-- Count users with phone numbers
SELECT 
  COUNT(*) as total_users,
  COUNT(telephone) as users_with_phone,
  COUNT(*) - COUNT(telephone) as users_without_phone
FROM profiles;

-- Find users without phone numbers
SELECT id, full_name, email, telephone
FROM profiles
WHERE telephone IS NULL OR telephone = '';
```

### Update Phone Number Manually

```sql
-- Add phone number for testing
UPDATE profiles
SET telephone = '0812345678'
WHERE email = 'test@example.com';

-- Remove phone number for testing
UPDATE profiles
SET telephone = NULL
WHERE email = 'test@example.com';
```

---

## Checklist

Use this checklist when testing:

- [ ] New user without phone sees requirement screen
- [ ] "Complete Profile Setup" redirects correctly
- [ ] Profile page shows phone input field
- [ ] Phone validation rejects invalid formats
- [ ] Valid phone saves successfully
- [ ] After saving, auto-redirects back to reservation
- [ ] User with phone proceeds directly to reservation
- [ ] Admin can see phone numbers in Users tab
- [ ] Admin can search by phone number
- [ ] Reservation cards show phone numbers
- [ ] Profile page allows updating phone
- [ ] Return URL preserved through flow
- [ ] Cancel button works during setup
- [ ] No JavaScript errors in console
- [ ] Database updates correctly

---

## Troubleshooting

### Phone requirement screen doesn't appear
- Check if user actually has phone in database
- Check browser console for errors
- Verify `checkUserTelephoneRequired()` is being called

### Redirect doesn't work after saving
- Check if `returnUrl` parameter is in URL
- Check if setTimeout is completing
- Look for navigation errors in console

### Admin doesn't see phone numbers
- Verify database has `telephone` field (not `phone`)
- Check if data exists in database
- Clear cache and refresh

### Validation always fails
- Check phone format: should be 8-15 digits
- Remove any spaces, dashes, or special characters
- Check `validateTelephoneNumber()` function

---

## Success Criteria

✅ **Feature is working correctly if:**
1. Users without phone cannot make reservations
2. Phone setup flow is smooth and intuitive
3. Return URL works - users continue where they left off
4. Admin can see all phone numbers clearly
5. Phone validation prevents invalid entries
6. Database updates persist correctly
7. No errors appear in console
8. UI is responsive and user-friendly

---

## Support

If issues persist:
1. Check `PHONE_NUMBER_FEATURE_IMPLEMENTATION.md` for detailed documentation
2. Review code in:
   - `app/reserve/page.tsx` - Reservation blocking
   - `app/profile/page.tsx` - Phone input
   - `app/admin/page.tsx` - Admin display
   - `lib/user-validation.ts` - Validation logic
3. Check database schema in `db_setup/database-schema.sql`
4. Verify environment variables are set correctly
