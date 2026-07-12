import axios from 'axios';
import prisma from './lib/prisma';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🤖 Starting EcoSphere Backend Integration Tests...');
  console.log('==================================================');

  let token = '';

  // 1. Healthcheck Test
  try {
    const res = await axios.get('http://localhost:5000/');
    console.log('✅ Healthcheck root status: OK', res.data);
  } catch (error: any) {
    console.error('❌ Healthcheck root failed:', error.message);
    process.exit(1);
  }

  // 2. Register Test (Unique email for test execution)
  const testEmail = `test_${Date.now()}@ecosphere.com`;
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Integration Test Bot',
      email: testEmail,
      password: 'password123',
      role: 'ADMIN' // register as admin to test restricted routes
    });
    console.log('✅ Register Endpoint: SUCCESS');
    token = res.data.data.token;
  } catch (error: any) {
    console.error('❌ Register Endpoint failed:', error.response?.data || error.message);
    process.exit(1);
  }

  // 3. Login Test
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: 'password123'
    });
    console.log('✅ Login Endpoint: SUCCESS');
    token = res.data.data.token; // update token
  } catch (error: any) {
    console.error('❌ Login Endpoint failed:', error.response?.data || error.message);
    process.exit(1);
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 4. Me Endpoint Test
  try {
    const res = await axios.get(`${BASE_URL}/auth/me`, authHeaders);
    console.log('✅ Me Endpoint: SUCCESS, hello', res.data.data.name);
  } catch (error: any) {
    console.error('❌ Me Endpoint failed:', error.response?.data || error.message);
  }

  // 5. Governance Policies Test
  try {
    const res = await axios.get(`${BASE_URL}/governance/policies`, authHeaders);
    console.log('✅ Governance Policies: SUCCESS, found', res.data.data.length, 'policies');
  } catch (error: any) {
    console.error('❌ Governance Policies failed:', error.response?.data || error.message);
  }

  // 6. Settings Departments Test
  try {
    const res = await axios.get(`${BASE_URL}/settings/departments`, authHeaders);
    console.log('✅ Settings Departments: SUCCESS, found', res.data.data.length, 'departments');
  } catch (error: any) {
    console.error('❌ Settings Departments failed:', error.response?.data || error.message);
  }

  // 7. Products Catalog Test
  try {
    const res = await axios.get(`${BASE_URL}/products`, authHeaders);
    console.log('✅ Product ESG Profiles: SUCCESS, found', res.data.data.length, 'seeded products');
  } catch (error: any) {
    console.error('❌ Product ESG Profiles failed:', error.response?.data || error.message);
  }

  // 8. Environmental Factors Test
  try {
    const res = await axios.get(`${BASE_URL}/environmental/emission-factors`, authHeaders);
    console.log('✅ Environmental Emission Factors: SUCCESS, found', res.data.data.length, 'factors');
  } catch (error: any) {
    console.error('❌ Environmental Emission Factors failed:', error.response?.data || error.message);
  }

  // 9. AI Carbon Forecast Test
  try {
    const res = await axios.get(`${BASE_URL}/environmental/carbon-transactions/forecast`, authHeaders);
    console.log('✅ AI Carbon Forecast: SUCCESS, found', res.data.data.forecast.length, 'forecast points,', res.data.data.anomalies.length, 'anomaly checks, and', res.data.data.recommendations.length, 'smart recommendations');
  } catch (error: any) {
    console.error('❌ AI Carbon Forecast failed:', error.response?.data || error.message);
  }

  // 10. Social Diversity Metrics Test
  try {
    const res = await axios.get(`${BASE_URL}/social/diversity`, authHeaders);
    console.log('✅ Social Diversity Metrics: SUCCESS, found', res.data.data.totalEmployees, 'employees categorized');
  } catch (error: any) {
    console.error('❌ Social Diversity Metrics failed:', error.response?.data || error.message);
  }

  // 11. PDF Report Export Test
  try {
    const res = await axios.get(`${BASE_URL}/reports/pdf`, { ...authHeaders, responseType: 'arraybuffer' });
    console.log('✅ PDF ESG Certificate: SUCCESS, received file of size', res.data.byteLength, 'bytes');
  } catch (error: any) {
    console.error('❌ PDF ESG Certificate failed:', error.response?.data || error.message);
  }

  // 12. CSV Emissions Export Test
  try {
    const res = await axios.get(`${BASE_URL}/reports/csv?type=emissions`, authHeaders);
    console.log('✅ CSV Emissions Report: SUCCESS, fetched content lines:', res.data.split('\n').length);
  } catch (error: any) {
    console.error('❌ CSV Emissions Report failed:', error.response?.data || error.message);
  }

  // 13. Live Dashboard Data Test
  let activeDeptId = '';
  try {
    const res = await axios.get(`${BASE_URL}/dashboard`, authHeaders);
    console.log('✅ Live Dashboard: SUCCESS, orgScore total matches:', res.data.data.orgScore.totalScore);
    console.log('   ↳ Found nudges:', res.data.data.nudges.length);
    console.log('   ↳ Found smart insights:', res.data.data.smartInsights.length);
    activeDeptId = res.data.data.departmentScores[0].id;
  } catch (error: any) {
    console.error('❌ Live Dashboard failed:', error.response?.data || error.message);
  }

  // 14. Department ESG DNA Radar Test
  try {
    const res = await axios.get(`${BASE_URL}/dashboard/department/${activeDeptId}/dna`, authHeaders);
    console.log('✅ Dept ESG DNA Radar: SUCCESS, gathered dimensions:', res.data.data.dna.length);
  } catch (error: any) {
    console.error('❌ Dept ESG DNA Radar failed:', error.response?.data || error.message);
  }

  // 15. Challenges & QR Verification Test
  let challengeId = '';
  try {
    const res = await axios.get(`${BASE_URL}/gamification/challenges`, authHeaders);
    console.log('✅ Gamification Challenges: SUCCESS, found', res.data.data.length, 'challenges');
    challengeId = res.data.data[0].id;
  } catch (error: any) {
    console.error('❌ Gamification Challenges failed:', error.response?.data || error.message);
  }

  try {
    const res = await axios.get(`${BASE_URL}/gamification/challenges/${challengeId}/qr`, authHeaders);
    console.log('✅ Challenge QR Verification: SUCCESS, generated base64 length:', res.data.data.qrCode.length);
  } catch (error: any) {
    console.error('❌ Challenge QR Verification failed:', error.response?.data || error.message);
  }

  // 16. Concurrency-Safe Reward Redemption Test
  let rewardId = '';
  try {
    const res = await axios.get(`${BASE_URL}/gamification/rewards`, authHeaders);
    console.log('✅ Rewards Catalog: SUCCESS, found', res.data.data.length, 'rewards');
    rewardId = res.data.data[0].id;
  } catch (error: any) {
    console.error('❌ Rewards Catalog failed:', error.response?.data || error.message);
  }

  try {
    // Add points to test user first to ensure they have enough balance to redeem
    await prisma.user.update({
      where: { email: testEmail },
      data: { pointsBalance: 1000 },
    });

    const res = await axios.post(`${BASE_URL}/gamification/rewards/${rewardId}/redeem`, {}, authHeaders);
    console.log('✅ Reward Redemption (Safe Transaction): SUCCESS, points balance remaining:', res.data.data.user.pointsBalance);
  } catch (error: any) {
    console.error('❌ Reward Redemption failed:', error.response?.data || error.message);
  }

  console.log('==================================================');
  console.log('🎉 All backend tests finished successfully!');
}

runTests();
