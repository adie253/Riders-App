const adminEmail = 'testadmin@hivago.com';
const adminPassword = 'TestPassword123';
const riderId = '292c1f88-481e-48b3-875f-5acfb4343dd2';
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
    console.log('Admin login successful.');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    console.log(`Releasing rider ${riderId}...`);
    const releaseRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/admin/riders/${riderId}/release-delivery`, {
        method: 'POST',
        headers
    });
    console.log('Release response status:', releaseRes.status);
    console.log('Release response body:', await releaseRes.text());

    console.log(`Manually assigning rider ${riderId} to order ${orderId}...`);
    const assignRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/admin/orders/${orderId}/assign-rider`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ riderId })
    });
    console.log('Assign response status:', assignRes.status);
    console.log('Assign response body:', await assignRes.text());

    console.log(`Refreshing delivery status for order ${orderId}...`);
    const refreshRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/deliveries/orders/${orderId}/refresh-status`, {
        method: 'POST',
        headers
    });
    console.log('Refresh status response:', refreshRes.status, await refreshRes.json());
}

run();
