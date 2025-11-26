#!/usr/bin/env node

/**
 * Migration script to help transition from Appwrite to Prisma + MongoDB
 * This script provides guidance and checks for the migration process
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 CarePulse Migration to Prisma + MongoDB');
console.log('==========================================\n');

// Check if Prisma is installed
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasPrisma = packageJson.dependencies['@prisma/client'] && packageJson.dependencies['prisma'];

if (!hasPrisma) {
  console.log('❌ Prisma is not installed. Please run:');
  console.log('   npm install prisma @prisma/client\n');
  process.exit(1);
}

console.log('✅ Prisma is installed');

// Check if schema exists
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.log('❌ Prisma schema not found. Please run:');
  console.log('   npx prisma init\n');
  process.exit(1);
}

console.log('✅ Prisma schema exists');

// Check if .env has DATABASE_URL
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('DATABASE_URL=')) {
    console.log('✅ DATABASE_URL found in .env');
  } else {
    console.log('⚠️  DATABASE_URL not found in .env');
    console.log('   Please add: DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/carepulse?retryWrites=true&w=majority"');
  }
} else {
  console.log('⚠️  .env file not found');
  console.log('   Please create .env with your MongoDB connection string');
}

console.log('\n📋 Migration Steps:');
console.log('==================');
console.log('1. Set up your MongoDB database');
console.log('2. Add DATABASE_URL to your .env file');
console.log('3. Run: npx prisma generate');
console.log('4. Run: npx prisma db push');
console.log('5. Update your imports to use the new Prisma actions');
console.log('6. Test the application');

console.log('\n📁 New Action Files Created:');
console.log('============================');
console.log('• lib/actions/patient.prisma.actions.ts');
console.log('• lib/actions/doctor.prisma.actions.ts');
console.log('• lib/actions/appointment.prisma.actions.ts');
console.log('• lib/actions/prescription.prisma.actions.ts');

console.log('\n📁 New Type Files Created:');
console.log('==========================');
console.log('• types/prisma.types.ts');

console.log('\n🔧 Next Steps:');
console.log('==============');
console.log('1. Update your components to use the new Prisma actions');
console.log('2. Remove old Appwrite imports and dependencies');
console.log('3. Update your forms to work with the new data structure');
console.log('4. Test all functionality');

console.log('\n✨ Migration preparation complete!');
