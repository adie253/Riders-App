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

        console.log(`Fetching order details for ${ORDER_ID}...`);
        const orderRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/admin/orders/${ORDER_ID}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (orderRes.ok) {
            console.log('Order Details:', JSON.stringify(await orderRes.json(), null, 2));
        } else {
            console.error('Failed to fetch order details:', orderRes.status, await orderRes.text());
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
