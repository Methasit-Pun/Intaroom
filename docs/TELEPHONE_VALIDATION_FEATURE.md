# Telephone Validation Feature - Implementation Guide

## 🎯 Overview

This feature ensures users must provide a telephone number before making room reservations. It includes validation, user-friendly prompts, and seamless profile completion flow.

## 📋 Components Implemented

### 1. User Validation Library (`lib/user-validation.ts`)
- `checkUserTelephoneRequired()` - Checks if user has valid telephone
- `redirectToTelephoneSetup()` - Redirects to profile setup  
- `validateTelephoneNumber()` - Validates phone format
- `formatTelephoneNumber()` - Formats phone for display

### 2. Custom Hook (`hooks/use-telephone-validation.tsx`)
- `useTelephoneValidation()` - Core validation hook
- `useRequireTelephone()` - Auto-redirect version
- `useCheckTelephone()` - Manual validation version

### 3. Enhanced Pages

#### Reserve Page (`app/reserve/page.tsx`)
- ✅ Checks telephone before showing time slots
- ✅ Shows friendly setup prompt if missing
- ✅ Redirects to profile completion

#### Profile Page (`app/profile/page.tsx`)  
- ✅ Enhanced validation with phone format check
- ✅ Required field marking when needed
- ✅ Return URL handling after completion
- ✅ User-friendly error messages

#### Summary Page (`app/summary/page.tsx`)
- ✅ Final validation before reservation creation
- ✅ Prevents reservation without telephone
- ✅ Seamless redirect flow

## 🔄 User Flow

```
User tries to reserve room
         ↓
Check if user has telephone
         ↓
    ┌─── Yes ───┐
    ↓           ↓
Continue    No → Redirect to Profile
with         Setup with return URL
reservation      ↓
    ↓       User completes telephone
    ↓       setup → Return to reservation
    ↓           ↓
    └───────────┘
         ↓
    Reservation proceeds
```

## 📱 UI Features

### Profile Setup Screen
- Clear explanation of why telephone is needed
- Professional, user-friendly design
- Required field indicators
- Validation feedback
- Return URL preservation

### Reserve Page Integration
- Loading state while checking telephone
- Friendly setup prompt with icon
- One-click profile completion
- Cancel option to return

### Validation Messages
- Clear error messages
- Format requirements (8-15 digits)
- Context-aware help text
- Success confirmations

## 🔧 Technical Implementation

### Validation Rules
- Telephone must be 8-15 digits
- Leading/trailing spaces trimmed
- International format support
- Thai number format preference

### Database Integration
- Uses existing `profiles.telephone` column
- Secure RLS policy compliance
- Error handling for database issues
- Transaction safety

### Navigation Flow
- Preserves user intent with return URLs
- Smooth redirects after completion
- No data loss during profile setup
- Browser back button handling

## 🚀 Usage Examples

### Basic Implementation
```tsx
import { useTelephoneValidation } from "@/hooks/use-telephone-validation"

function MyComponent() {
  const { hasPhone, isLoading, checkTelephone } = useTelephoneValidation()
  
  const handleReserve = async () => {
    const phoneValid = await checkTelephone()
    if (phoneValid) {
      // Proceed with reservation
    }
    // Will auto-redirect if phone missing
  }
}
```

### Auto-Redirect Version
```tsx
import { useRequireTelephone } from "@/hooks/use-telephone-validation"

function ReservationComponent() {
  const { hasPhone, isLoading } = useRequireTelephone("/return-here")
  
  // Component will auto-redirect if telephone missing
  if (isLoading) return <Loading />
  if (!hasPhone) return null // Will redirect
  
  return <ReservationForm />
}
```

## ✅ Testing Scenarios

1. **New User (No Phone)**
   - Try to make reservation → Redirect to profile
   - Complete phone setup → Return to reservation
   - Proceed with booking

2. **Existing User (Has Phone)**
   - Try to make reservation → Direct access
   - No interruption in flow

3. **Invalid Phone Format**
   - Enter invalid format → Clear error message
   - Enter valid format → Proceed

4. **Profile Update**
   - Update phone from profile page → Success
   - Leave phone empty when required → Error

## 🎨 Design Principles

- **User-Friendly**: Clear explanations, no technical jargon
- **Non-Blocking**: Quick validation, minimal interruption
- **Accessible**: Proper labels, error messages, focus management
- **Responsive**: Works on all device sizes
- **Professional**: Matches existing app design language

## 📊 Benefits

- **Security**: Contact information for all reservations
- **User Experience**: Seamless profile completion flow
- **Data Quality**: Validated, properly formatted phone numbers
- **Admin Benefits**: Reliable contact info for bookings
- **Compliance**: Ensures complete user profiles