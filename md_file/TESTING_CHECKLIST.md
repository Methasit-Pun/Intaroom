# LINE Login and Profile Setup Testing Checklist

## Prerequisites
- LIFF app is properly configured in LINE Developers Console
- LIFF ID is correctly set in environment variables
- Supabase project is set up with proper tables and RLS policies
- Application is running in HTTPS (required for LIFF)

## Test Scenarios

### 1. New User - Complete Flow
**Steps:**
1. Clear all browser data (localStorage, cookies, etc.)
2. Navigate to `/login`
3. Click "LINE Login" button
4. Complete LINE authentication
5. Should be redirected to `/profile?setup=true&new=true`
6. Fill in required fields (Full Name, Telephone)
7. Click "Complete Setup"
8. Should be redirected to main page (`/`)
9. Verify user data is saved in Supabase

**Expected Results:**
- [ ] LIFF initializes successfully
- [ ] LINE login popup/redirect works
- [ ] User is created in Supabase auth
- [ ] Profile record is created with LINE data
- [ ] Redirect to profile setup page
- [ ] Profile form shows LINE display name pre-filled
- [ ] Required field validation works
- [ ] Successful save redirects to main page
- [ ] User appears logged in on main page
- [ ] Credits are set to 100

### 2. Existing User - Complete Profile
**Steps:**
1. Use a LINE account that already has a profile in the system
2. Navigate to `/login`
3. Click "LINE Login" button
4. Complete LINE authentication

**Expected Results:**
- [ ] User is recognized as existing
- [ ] If profile is complete: redirect to main page
- [ ] If profile is incomplete: redirect to profile setup
- [ ] User data loads correctly
- [ ] No duplicate users created

### 3. Profile Setup - Validation
**Steps:**
1. Get to profile setup page (new user or incomplete profile)
2. Try to submit without filling required fields
3. Fill only one required field
4. Fill all required fields and submit

**Expected Results:**
- [ ] Empty form shows validation errors
- [ ] Partial form shows validation errors
- [ ] Complete form submits successfully
- [ ] Success message appears
- [ ] Redirect happens after successful save

### 4. Profile Setup - Skip Option
**Steps:**
1. Get to profile setup page
2. Click "Skip for Now" button

**Expected Results:**
- [ ] User is redirected to main page
- [ ] Profile remains incomplete
- [ ] User can still access main features
- [ ] Next login should prompt for profile completion

### 5. Logout and Re-login
**Steps:**
1. Complete login flow
2. Use logout button
3. Login again with same LINE account

**Expected Results:**
- [ ] Logout clears all session data
- [ ] Redirect to login page
- [ ] Re-login recognizes existing user
- [ ] No duplicate profiles created
- [ ] User data persists

### 6. Error Handling
**Steps:**
1. Test with network disconnected during login
2. Test with invalid LIFF configuration
3. Test with Supabase connection issues

**Expected Results:**
- [ ] Appropriate error messages shown
- [ ] No app crashes
- [ ] User can retry operations
- [ ] Graceful fallbacks work

### 7. Mobile vs Desktop
**Steps:**
1. Test complete flow on mobile device
2. Test complete flow on desktop browser
3. Test LINE app integration (mobile)

**Expected Results:**
- [ ] LIFF works correctly on both platforms
- [ ] UI is responsive and usable
- [ ] LINE app integration works on mobile
- [ ] Desktop browser flow works

### 8. Session Persistence
**Steps:**
1. Complete login flow
2. Close browser/tab
3. Reopen application
4. Refresh page multiple times

**Expected Results:**
- [ ] User remains logged in
- [ ] Session data persists
- [ ] No re-authentication required
- [ ] User data loads correctly

## Debug Tools

### Using the Debug Panel
1. The debug panel appears as a blue "Debug" button in bottom-right corner
2. Click to expand and see real-time auth state
3. Use "Refresh" button to update data
4. Monitor state changes during login flow

### Using the Test Page
1. Navigate to `/test-auth` (development only)
2. Use "Check Current State" to see detailed auth info
3. Use test buttons to simulate different scenarios
4. Monitor test results in the results panel

### Browser Developer Tools
1. Check Console for LIFF initialization messages
2. Monitor Network tab for API calls
3. Check Application tab for localStorage data
4. Verify cookies are set correctly

## Common Issues and Solutions

### LIFF Not Initializing
- Check LIFF ID is correct
- Verify HTTPS is being used
- Check browser console for errors
- Ensure LINE Developers Console settings are correct

### User Creation Fails
- Check Supabase connection
- Verify RLS policies allow inserts
- Check trigger function is working
- Monitor Supabase logs

### Profile Setup Not Working
- Check form validation logic
- Verify Supabase update permissions
- Check profile table structure
- Monitor network requests

### Redirect Issues
- Check URL parameters are correct
- Verify router.push() calls
- Check for JavaScript errors
- Ensure pages exist and are accessible

## Success Criteria
- [ ] All test scenarios pass
- [ ] No console errors during flow
- [ ] User data is correctly stored
- [ ] UI is responsive and user-friendly
- [ ] Error handling works gracefully
- [ ] Performance is acceptable
