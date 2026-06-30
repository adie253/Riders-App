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

        const headers = { 'Authorization': `Bearer ${adminToken}` };
        const orderId = 'd4b7d25b-a598-4dbf-bb8c-a8af8849a8bd';

        console.log(`Fetching detailed order details for ${orderId}...`);
        const detailsRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/admin/orders/${orderId}`, {
            headers
        });
        if (detailsRes.ok) {
            console.log('Admin Order Details:', JSON.stringify(await detailsRes.json(), null, 2));
        } else {
            console.error('Failed to get order details:', detailsRes.status, await detailsRes.text());
        }
    } catch (err) {
        console.error(err);
    }
}

run();
