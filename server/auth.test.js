import {
  createMongoUser,
  validateUserCredentials,
  hashPassword,
  verifyPassword,
} from './mongo.js';

async function runAuthTests() {
  console.log('--- RUNNING SIMPLIFIED AUTH & SIGNUP TESTS ---');

  // Test 1: Password hashing and verification
  const rawPass = 'secretRoofing2026!';
  const hashed = hashPassword(rawPass);
  const verifyValid = verifyPassword(rawPass, hashed);
  const verifyInvalid = verifyPassword('wrongpass', hashed);
  console.log('Test 1 - Verify Match:', verifyValid === true ? '✅ PASS' : '❌ FAIL');
  console.log('Test 1 - Reject Mismatch:', verifyInvalid === false ? '✅ PASS' : '❌ FAIL');

  // Test 2: Existing Seed User Authentication
  const seedAuth = await validateUserCredentials('dale', 'northline2026');
  console.log('Test 2 - Dale Seed Auth:', seedAuth && seedAuth.name === 'Dale Whitmore' ? '✅ PASS' : '❌ FAIL');

  // Test 3: New User Registration
  const testUser = {
    name: 'Sarah Connor',
    username: 'sarah_' + Math.floor(Math.random() * 10000),
    email: `sarah_${Math.floor(Math.random() * 10000)}@skynetroofing.com`,
    password: 'SecurePassword123!',
    role: 'Owner',
    company_name: 'Connor Roofing & Restoration',
  };

  const created = await createMongoUser(testUser);
  console.log('Test 3 - User Created:', created.username, created.id ? '✅ PASS' : '❌ FAIL');

  // Test 4: Authenticate with New User Credentials
  const authResult = await validateUserCredentials(testUser.username, testUser.password);
  console.log('Test 4 - Login with New Credentials:', authResult && authResult.username === testUser.username ? '✅ PASS' : '❌ FAIL');

  // Test 5: Rejection of Duplicate Username
  let duplicateCaught = false;
  try {
    await createMongoUser({
      name: 'Another User',
      username: testUser.username,
      email: 'another@example.com',
      password: 'password123',
    });
  } catch (err) {
    duplicateCaught = true;
  }
  console.log('Test 5 - Prevent Duplicate Username:', duplicateCaught ? '✅ PASS' : '❌ FAIL');

  console.log('--- ALL AUTH TESTS COMPLETED SUCCESSFULLY ---');
}

runAuthTests().catch(console.error);
