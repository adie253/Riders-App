const ORDER_ID = 'd4b7d25b-a598-4dbf-bb8c-a8af8849a8bd';

async function run() {
    try {
        console.log('Logging in as admin...');
        const loginRes = await fetch('https://rally-staging-9ae8.up.railway.app/api/admins/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'testadmin@hivago.com', password: 'TestPassword123' })
        });
        if (!loginRes.ok) {
            console.error('Admin login failed:', loginRes.status, await loginRes.text());
            return;
        }
        const loginData = await loginRes.json();
        const adminToken = loginData.accessToken;
        console.log('Admin login successful.');

        console.log(`Fetching delivery codes for order ${ORDER_ID}...`);
        const codesRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/delivery/orders/${ORDER_ID}/codes`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (codesRes.ok) {
            console.log('Codes response:', await codesRes.json());
        } else {
            console.error('Failed to fetch codes:', codesRes.status, await codesRes.text());
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
