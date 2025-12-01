# 🚀 CarePulse Migration Guide: Appwrite → MongoDB + Prisma

This guide will help you migrate your CarePulse application from Appwrite to MongoDB using Prisma.

## 📋 Prerequisites

1. **MongoDB Database**: Set up a MongoDB Atlas cluster or local MongoDB instance
2. **Node.js**: Ensure you have Node.js 18+ installed
3. **Environment Variables**: Prepare your MongoDB connection string

## 🔧 Step-by-Step Migration

### 1. Install Dependencies

```bash
npm install prisma @prisma/client
```

### 2. Set Up Environment Variables

Add to your `.env` file:

```env
# MongoDB Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/carepulse?retryWrites=true&w=majority"

# Keep existing variables for now (remove after migration)
NEXT_PUBLIC_ADMIN_PASSKEY=your_admin_passkey
NEXT_PUBLIC_SMTP_HOST=your_smtp_host
NEXT_PUBLIC_SMTP_USER=your_smtp_user
NEXT_PUBLIC_SMTP_PASS=your_smtp_password
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Schema to Database

```bash
npm run db:push
```

### 5. Run Migration Script

```bash
npm run migrate
```

## 📁 New File Structure

### New Action Files (Prisma-based)
- `lib/actions/patient.prisma.actions.ts`
- `lib/actions/doctor.prisma.actions.ts`
- `lib/actions/appointment.prisma.actions.ts`
- `lib/actions/prescription.prisma.actions.ts`

### New Type Files
- `types/prisma.types.ts`

### Configuration Files
- `prisma/schema.prisma`
- `lib/prisma.ts`

## 🔄 Migration Process

### Phase 1: Update Imports

Replace Appwrite imports with Prisma imports:

```typescript
// Before (Appwrite)
import { createAppointment } from "@/lib/actions/appointment.actions";

// After (Prisma)
import { createAppointment } from "@/lib/actions/appointment.prisma.actions";
```

### Phase 2: Update Components

Update your components to use the new Prisma actions:

1. **AppointmentForm.tsx**
2. **Admin pages**
3. **Patient pages**
4. **Doctor pages**

### Phase 3: Update Data Handling

The new Prisma actions return different data structures:

```typescript
// Before (Appwrite)
const appointment = {
  $id: "appt_123",
  userId: "user_123",
  // ... other fields
};

// After (Prisma)
const appointment = {
  id: "appt_123",
  userId: "user_123",
  user: { /* user data */ },
  patient: { /* patient data with user */ },
  doctor: { /* doctor data with user */ },
  // ... other fields
};
```

## 🗄️ Database Schema

### Collections Created
- `users` - User accounts
- `patients` - Patient profiles
- `doctors` - Doctor profiles
- `appointments` - Medical appointments
- `prescriptions` - Prescription files

### Key Relationships
- User → Patient (1:1)
- User → Doctor (1:1)
- User → Appointments (1:many)
- Patient → Appointments (1:many)
- Doctor → Appointments (1:many)
- Appointment → Prescriptions (1:many)

## 🧪 Testing the Migration

### 1. Test Database Connection

```bash
npm run db:studio
```

### 2. Test Each Feature

1. **User Registration**
2. **Patient Registration**
3. **Doctor Registration**
4. **Appointment Creation**
5. **Admin Dashboard**

### 3. Verify Data Integrity

Check that all relationships are working correctly and data is being stored properly.

## 🚨 Important Notes

### Data Migration
- **No automatic data migration** is included
- You'll need to manually migrate existing data from Appwrite to MongoDB
- Consider creating a data migration script if you have existing data

### File Storage
- File upload functionality needs to be updated
- Consider using AWS S3, Cloudinary, or similar service
- Update the prescription upload logic

### Environment Variables
- Remove Appwrite-related environment variables after migration
- Keep only MongoDB and other necessary variables

## 🔧 Troubleshooting

### Common Issues

1. **Connection String Format**
   ```
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority"
   ```

2. **Prisma Client Not Generated**
   ```bash
   npx prisma generate
   ```

3. **Schema Push Failed**
   ```bash
   npx prisma db push --force-reset
   ```

### Getting Help

1. Check Prisma documentation: https://www.prisma.io/docs
2. MongoDB Atlas documentation: https://docs.atlas.mongodb.com/
3. Check console logs for detailed error messages

## ✅ Migration Checklist

- [ ] MongoDB database set up
- [ ] Environment variables configured
- [ ] Prisma client generated
- [ ] Schema pushed to database
- [ ] Components updated to use Prisma actions
- [ ] All features tested
- [ ] Old Appwrite code removed
- [ ] File upload functionality updated
- [ ] Data migration completed (if needed)

## 🎉 Post-Migration

After successful migration:

1. Remove Appwrite dependencies from `package.json`
2. Delete old Appwrite action files
3. Update documentation
4. Deploy to production
5. Monitor application performance

---

**Need Help?** Check the console logs and Prisma Studio for debugging information.

