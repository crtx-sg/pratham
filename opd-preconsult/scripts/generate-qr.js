#!/usr/bin/env node

// Generates a base64 QR payload for demo use
// Usage: node generate-qr.js [department]

const department = process.argv[2] || 'CARD';
const payload = {
  hospital_id: process.env.DEMO_HOSPITAL_ID || 'demo_hospital_01',
  department: department,
  queue_slot: Math.floor(Math.random() * 100) + 1,
  ts: Date.now()
};

const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
console.log('QR Payload (base64):');
console.log(encoded);
console.log('\nPatient App URL:');
console.log(`http://localhost/?qr=${encodeURIComponent(encoded)}`);
console.log('\nDecoded:');
console.log(JSON.stringify(payload, null, 2));
