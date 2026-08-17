import { calculateEstimate } from './calculator.js';
import { SEED_CONFIG } from './mongo.js';

// Test benchmark example matching the specifications
const sampleAnswers = {
  roof_area: 2100,
  material: 'asphalt_arch',
  pitch: 'medium',
  layers: '1',
  stories: '2',
};

const result = calculateEstimate(sampleAnswers, SEED_CONFIG);
console.log('--- TEST CALCULATION RESULT ---');
console.log('Result Success:', result.success);
console.log('Estimate Low:', result.estimate_low);
console.log('Estimate High:', result.estimate_high);
console.log('Breakdown:', result.breakdown);

if (result.success && result.estimate_low > 0 && result.estimate_high > result.estimate_low) {
  console.log('✅ Unit test passed successfully in pure JavaScript!');
} else {
  console.error('❌ Unit test failed!');
  process.exit(1);
}
