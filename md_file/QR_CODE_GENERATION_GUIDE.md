# QR Code Auto-Generation System

This system automatically generates unique QR codes for all reservations in the database. Each reservation record gets its own individual QR code based on room, date, time, and confirmation number.

## 🎯 QR Code Format

The QR codes follow this format:
```
INR + RoomID(2 digits) + Date(YYMMDD) + Time(HHMM) + ConfirmationNumber(digits only)
```

### Examples:
- `INR012507301300001` = Room 01, July 30, 2025, 13:00, Confirmation #001
- `INR022507301400123` = Room 02, July 30, 2025, 14:00, Confirmation #123

## 🚀 How to Generate QR Codes

### Method 1: Admin Web Interface
1. Navigate to `/admin/qr-generator` in your browser
2. Choose which reservations to process:
   - **All Reservations**: Processes every reservation in the database
   - **Approved Only**: Only processes approved reservations
   - **Pending Only**: Only processes pending reservations
   - **Rejected Only**: Only processes rejected reservations
3. Click the button and wait for completion
4. View the results summary

### Method 2: Command Line Script
1. Open terminal in the project directory
2. Run the script:
   ```bash
   npm run generate-qr
   ```
   or directly:
   ```bash
   node scripts/generate-qr-codes.js
   ```

### Method 3: Programmatic API
```typescript
import { autoGenerateAllQRCodes } from '@/lib/reservation-utils'

// Generate QR codes for all reservations
const result = await autoGenerateAllQRCodes(supabaseUrl, supabaseAnonKey)

// Generate QR codes for approved reservations only
const result = await autoGenerateAllQRCodes(supabaseUrl, supabaseAnonKey, "Approved")
```

## 📊 What Happens During Generation

1. **Fetch**: Retrieves all reservations from the database
2. **Generate**: Creates unique QR code for each reservation record
3. **Update**: Stores the QR code in the `qr_code_url` column
4. **Report**: Shows count of successful updates and errors

## 🔄 Integration with Admin Approval

When an admin approves reservations through the admin interface, QR codes are automatically generated and stored for those specific reservations. This ensures that approved reservations always have access codes available immediately.

## 🛡️ Error Handling

The system includes comprehensive error handling:
- Database connection issues
- Invalid reservation data
- Update failures
- Partial completion scenarios

Failed operations are logged and reported in the summary, allowing you to identify and fix issues.

## 📝 Database Schema

The QR codes are stored in the `reservations` table:
```sql
ALTER TABLE reservations ADD COLUMN qr_code_url TEXT;
```

## 🔧 Customization

You can modify the QR code format by editing the `generateQRCodeForRecord` function in `lib/reservation-utils.ts`. The current format ensures uniqueness while maintaining readability for access control systems.

## 📈 Performance

- Processes reservations with small delays to avoid overwhelming the database
- Reports progress in real-time via console logs
- Skips reservations that already have up-to-date QR codes
- Handles large datasets efficiently

## 🎉 Usage Examples

### Example Database Records:
```
| ID | Room | Date       | Start Time | Confirmation | QR Code Generated    |
|----|------|------------|------------|--------------|---------------------|
| 1  | 01   | 2025-07-30 | 13:00:00   | INR-00001-1  | INR012507301300001  |
| 2  | 01   | 2025-07-30 | 14:00:00   | INR-00001-2  | INR012507301400001  |
| 3  | 02   | 2025-07-30 | 13:00:00   | INR-00002-1  | INR022507301300002  |
```

Each record gets its individual QR code that can be used for access control.
