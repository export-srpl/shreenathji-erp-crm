/**
 * Test Environment Verification Script
 * 
 * This script verifies that the test environment is properly configured
 * before running TestSprite tests.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkMark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossMark() {
  return `${colors.red}✗${colors.reset}`;
}

function warningMark() {
  return `${colors.yellow}⚠${colors.reset}`;
}

const checks = {
  nodeVersion: false,
  npmVersion: false,
  prismaInstalled: false,
  databaseUrl: false,
  prismaGenerated: false,
  databaseConnection: false,
  testDataSeeded: false,
  devServerPort: false,
};

log('\n🔍 Verifying Test Environment Configuration...\n', 'blue');

// 1. Check Node.js version
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  if (majorVersion >= 18) {
    log(`${checkMark()} Node.js version: ${nodeVersion}`, 'green');
    checks.nodeVersion = true;
  } else {
    log(`${crossMark()} Node.js version: ${nodeVersion} (requires v18 or later)`, 'red');
  }
} catch (error) {
  log(`${crossMark()} Node.js not found`, 'red');
}

// 2. Check npm version
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  log(`${checkMark()} npm version: ${npmVersion}`, 'green');
  checks.npmVersion = true;
} catch (error) {
  log(`${crossMark()} npm not found`, 'red');
}

// 3. Check Prisma installation
try {
  const prismaVersion = execSync('npx prisma --version', { encoding: 'utf-8' }).trim();
  log(`${checkMark()} Prisma installed: ${prismaVersion}`, 'green');
  checks.prismaInstalled = true;
} catch (error) {
  log(`${crossMark()} Prisma not found. Run: npm install`, 'red');
}

// 4. Check DATABASE_URL environment variable
const envFile = path.join(process.cwd(), '.env');
const envLocalFile = path.join(process.cwd(), '.env.local');

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Try reading from .env file
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
      databaseUrl = match[1].trim();
    }
  }
  
  // Try reading from .env.local file
  if (!databaseUrl && fs.existsSync(envLocalFile)) {
    const envContent = fs.readFileSync(envLocalFile, 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
      databaseUrl = match[1].trim();
    }
  }
}

if (databaseUrl) {
  // Mask password in URL for display
  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
  log(`${checkMark()} DATABASE_URL found: ${maskedUrl}`, 'green');
  checks.databaseUrl = true;
} else {
  log(`${crossMark()} DATABASE_URL not found in environment or .env file`, 'red');
  log(`   Create a .env file with: DATABASE_URL=postgresql://user:password@localhost:5432/dbname`, 'yellow');
}

// 5. Check if Prisma client is generated
const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client', 'index.js');
if (fs.existsSync(prismaClientPath)) {
  log(`${checkMark()} Prisma Client generated`, 'green');
  checks.prismaGenerated = true;
} else {
  log(`${warningMark()} Prisma Client not generated. Run: npx prisma generate`, 'yellow');
}

// 6. Test database connection
if (checks.databaseUrl && checks.prismaInstalled) {
  try {
    // Try to run a simple Prisma query
    execSync('npx prisma db execute --stdin', {
      input: 'SELECT 1;',
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    log(`${checkMark()} Database connection: OK`, 'green');
    checks.databaseConnection = true;
  } catch (error) {
    // Alternative: try to validate the connection using Prisma validate
    try {
      execSync('npx prisma validate', { encoding: 'utf-8', stdio: 'pipe' });
      log(`${checkMark()} Database schema: Valid`, 'green');
      checks.databaseConnection = true;
    } catch (validateError) {
      log(`${crossMark()} Database connection: Failed`, 'red');
      log(`   Error: ${error.message || validateError.message}`, 'yellow');
    }
  }
}

// 7. Check if test data is seeded
if (checks.databaseConnection) {
  try {
    // Check if test user exists
    const testUserCheck = `
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique({ where: { email: 'sales.ex@shreenathjirasayan.com' } })
        .then(user => {
          if (user) {
            console.log('TEST_DATA_SEEDED');
            process.exit(0);
          } else {
            console.log('TEST_DATA_NOT_SEEDED');
            process.exit(1);
          }
        })
        .catch(() => {
          console.log('TEST_DATA_CHECK_FAILED');
          process.exit(1);
        })
        .finally(() => prisma.$disconnect());
    `;
    
    const result = execSync(`node -e "${testUserCheck.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    
    if (result.includes('TEST_DATA_SEEDED')) {
      log(`${checkMark()} Test data: Seeded`, 'green');
      checks.testDataSeeded = true;
    } else {
      log(`${warningMark()} Test data: Not seeded. Run: npm run db:seed`, 'yellow');
    }
  } catch (error) {
    log(`${warningMark()} Could not verify test data. Run: npm run db:seed`, 'yellow');
  }
}

// 8. Check if port 3000 is available (or in use by dev server)
try {
  const netstat = execSync('netstat -ano | findstr :3000', { encoding: 'utf-8' });
  if (netstat.includes('LISTENING')) {
    log(`${checkMark()} Port 3000: In use (dev server may be running)`, 'green');
    checks.devServerPort = true;
  } else {
    log(`${warningMark()} Port 3000: Available (dev server not running)`, 'yellow');
    log(`   Start dev server with: npm run dev`, 'yellow');
  }
} catch (error) {
  // Port not in use
  log(`${warningMark()} Port 3000: Available (dev server not running)`, 'yellow');
  log(`   Start dev server with: npm run dev`, 'yellow');
}

// Summary
log('\n📊 Verification Summary:\n', 'blue');

const totalChecks = Object.keys(checks).length;
const passedChecks = Object.values(checks).filter(Boolean).length;
const criticalChecks = ['nodeVersion', 'npmVersion', 'databaseUrl', 'prismaInstalled'];
const criticalPassed = criticalChecks.every(key => checks[key]);

log(`Total Checks: ${passedChecks}/${totalChecks}`, passedChecks === totalChecks ? 'green' : 'yellow');

if (criticalPassed) {
  log('\n✅ Critical checks passed!', 'green');
} else {
  log('\n❌ Critical checks failed!', 'red');
  log('   Please fix the issues above before running tests.', 'yellow');
}

if (!checks.testDataSeeded) {
  log('\n⚠️  Recommendation: Run "npm run db:seed" to seed test data', 'yellow');
}

if (!checks.devServerPort) {
  log('\n⚠️  Recommendation: Start dev server with "npm run dev"', 'yellow');
}

log('\n');

// Exit with appropriate code
process.exit(criticalPassed ? 0 : 1);

