const adminEmail = 'testadmin@hivago.com';
const adminPassword = 'TestPassword123';
const orderId = 'd4b7d25b-a598-4dbf-bb8c-a8af8849a8bd';

async function run() {
    console.log(`Logging in as Admin ${adminEmail}...`);
    const loginRes = await fetch('https://rally-staging-9ae8.up.railway.app/api/admins/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });

    if (!loginRes.ok) {
        console.error('Admin login failed:', loginRes.status, await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('SUCCESS! Admin logged in.');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    console.log(`Fetching details for order ${orderId}...`);
    const orderRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/admin/orders/${orderId}`, { headers });
    if (orderRes.ok) {
        const orderDetails = await orderRes.json();
        console.log('Order Details:', JSON.stringify(orderDetails, null, 2));
    } else {
        console.error('Failed to fetch order details:', orderRes.status, await orderRes.text());
    }
}

run();
