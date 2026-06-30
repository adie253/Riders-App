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

        const headers = { 
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        };

        console.log(`Pushing OTPs for order ${ORDER_ID}...`);
        const pushRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/deliveries/orders/${ORDER_ID}/push-otps`, {
            method: 'POST',
            headers
        });
        console.log('Push OTPs response status:', pushRes.status);
        console.log('Push OTPs response body:', await pushRes.text());

        console.log(`Refreshing delivery status for order ${ORDER_ID}...`);
        const refreshRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/deliveries/orders/${ORDER_ID}/refresh-status`, {
            method: 'POST',
            headers
        });
        console.log('Refresh status response status:', refreshRes.status);
        console.log('Refresh status response body:', await refreshRes.text());
    } catch (err) {
        console.error(err);
    }
}

run();
