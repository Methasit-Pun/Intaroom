# Reservation Grouping Utility - Usage Example

This utility file (`lib/reservation-utils.ts`) provides a centralized way to handle reservation grouping, QR code generation, and formatting functions across the application.

## Key Features

### 1. **Reservation Grouping**
- Groups reservations by **confirmation number base**, **date**, and **room ID**
- Automatically combines consecutive time slots for the same room/date
- Handles status priority (Pending > Rejected > Approved)

### 2. **QR Code Generation**
- Generates secure QR codes with format: `INR + room_id + date + time + confirmation`
- Automatically stores QR codes in database when reservations are approved

### 3. **Status Management**
- Bulk update reservation status for grouped reservations
- Automatically generates QR codes when approving reservations

## Usage Examples

### Admin Page
```typescript
// Import utility functions
import {
  type Reservation,
  type GroupedReservation,
  groupReservations,
  updateReservationStatus,
  storeQRCodeForApprovedReservation,
} from "@/lib/reservation-utils"

// Group reservations
const grouped = groupReservations(reservations, sortDirection)

// Approve reservations and generate QR code
await updateReservationStatus(reservationIds, "Approved", supabaseUrl, supabaseAnonKey)
await storeQRCodeForApprovedReservation(groupedReservation, supabaseUrl, supabaseAnonKey)
```

### Reservation Details Page
```typescript
// Import utility functions
import {
  type GroupedReservation,
  generateQRCodeText,
  formatDate,
  formatTime,
  formatTimeSlots,
} from "@/lib/reservation-utils"

// Generate QR code for display
const qrCodeText = generateQRCodeText(reservation)

// Format date and time for display
const displayDate = formatDate(reservation.date)
const displayTime = formatTimeSlots(reservation.time_slots)
```

## Grouping Logic

Reservations are grouped when they have:
1. **Same confirmation number base** (part before the dash)
2. **Same date**
3. **Same room ID**

This ensures that multiple time slots for the same room on the same day are treated as one reservation group.

## QR Code Format

QR codes follow this secure format:
- **INR** (prefix)
- **Room ID** (2 digits, padded)
- **Date** (YYMMDD format)
- **Start Time** (HHMM format)
- **Confirmation Number** (digits only)

Example: `INR01241230080012345` represents:
- Room 01
- Date: December 30, 2024
- Time: 08:00
- Confirmation: 12345

## Benefits

1. **Consistency**: Same grouping logic across admin and user interfaces
2. **Maintainability**: Single source of truth for reservation handling
3. **Reusability**: Functions can be used in any component
4. **Type Safety**: Shared TypeScript interfaces ensure type consistency
5. **Automatic QR Generation**: QR codes are automatically created when reservations are approved
