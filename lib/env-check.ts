// Environment Variables Checker
// Run this to verify all required environment variables are set

export const checkEnvironmentVariables = () => {
  const requiredVars = [
    'DATABASE_URL', // MongoDB connection string
    'NEXT_PUBLIC_ADMIN_PASSKEY',
    'NEXT_PUBLIC_SMTP_HOST',
    'NEXT_PUBLIC_SMTP_USER',
    'NEXT_PUBLIC_SMTP_PASS'
  ];

    const missingVars: string[] = [];
    const presentVars: string[] = [];

    requiredVars.forEach(varName => {
        if (process.env[varName]) {
            presentVars.push(varName);
        } else {
            missingVars.push(varName);
        }
    });

    console.log('=== ENVIRONMENT VARIABLES CHECK ===');
    console.log('✅ Present variables:', presentVars);
    if (missingVars.length > 0) {
        console.log('❌ Missing variables:', missingVars);
        console.log('\nPlease add these to your .env.local file:');
        missingVars.forEach(varName => {
            console.log(`${varName}=your_value_here`);
        });
    } else {
        console.log('🎉 All required environment variables are set!');
    }

    return {
        allPresent: missingVars.length === 0,
        missing: missingVars,
        present: presentVars
    };
};
