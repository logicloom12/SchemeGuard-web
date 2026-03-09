const axios = require('axios');
const jwt = require('jsonwebtoken');

(async () => {
   const token = jwt.sign({ userId: '65e08b3ba0c6841234567890', email: 'admin@schemeguard.gov.in', role: 'admin', name: 'Admin' }, 'scheme_guard_jwt_secret_2026', { expiresIn: '1h' });

   const reqConfig = { headers: { Authorization: \Bearer \\ } };

   try {
     console.log('Sending first case...');
     const res1 = await axios.post('http://localhost:4000/api/beneficiaries', { name: 'Kushal Patel', aadhaar: '343434341212', income: 30000, bankAccount: 'HDFC-1122', district: 'Agra', schemeName: 'PMAY' }, reqConfig);
     console.log('Case 1 OK: ', res1.data._id);

     console.log('Sending exact duplicate...');
     const res2 = await axios.post('http://localhost:4000/api/beneficiaries', { name: 'Kushal Patel', aadhaar: '343434341212', income: 32000, bankAccount: 'HDFC-1122', district: 'Agra', schemeName: 'PMAY' }, reqConfig);
     console.log(res2.data);
   } catch(e) {
     if(e.response) {
       console.error('Exact Match Error:', e.response.status, e.response.data);
     }
   }

   try {
     console.log('\nSending semantic duplicate (Kushal Pateli)...');
     const res3 = await axios.post('http://localhost:4000/api/beneficiaries', { name: 'Kushal Pateli', aadhaar: '343434341999', income: 30000, bankAccount: 'HDFC-8901', district: 'Agra', schemeName: 'PMAY' }, reqConfig);
     console.log(res3.data);
   } catch(e) {
     if(e.response) {
       console.error('Semantic Match Error:', e.response.status, e.response.data);
     }
   }
})();
