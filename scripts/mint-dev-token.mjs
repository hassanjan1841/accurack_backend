// Mints a local dev login token for the seeded super_admin (bypasses email OTP for local work).
// Usage: npm run dev:token   → prints a JWT. In the browser console on the frontend:
//   localStorage.setItem('authToken', '<TOKEN>'); location.reload();
import jwt from 'jsonwebtoken';
process.loadEnvFile(new URL('../.env', import.meta.url));

// Fixed IDs from prisma/seed-demo.mjs
const payload = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'michael@salesmart.com',
  role: 'super_admin',
  clientId: '11111111-1111-1111-1111-111111111111',
  stores: ['33333333-3333-3333-3333-333333333333'],
  excludedPermissions: [],
};
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h' });
console.log('\nDEV LOGIN TOKEN (super_admin, store 33333333-...):\n');
console.log(token);
console.log("\nIn the frontend browser console:\n  localStorage.setItem('authToken', '" + token.slice(0, 12) + "...');  // paste full token, then reload\n");
