import { getConfig } from './db.js';

async function testFetchConfig() {
  const config = await getConfig();
  console.log('--- TEST CONFIGURATION HANDLER ---');
  console.log('Config Version:', config.config_version);
  console.log('Business:', config.business.name);
  console.log('Total Questions:', config.questions?.length);
  console.log('Modifiers:', JSON.stringify(config.modifiers));
  console.log('Sample Question Rates:', config.questions[1].options.map(o => `${o.label}: $${o.rate_per_sqft}/sqft`));
}

testFetchConfig().catch(console.error);
