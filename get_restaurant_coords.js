const adminEmail = 'testadmin@hivago.com';
const adminPassword = 'TestPassword123';
const restaurantId = '744ff607-1ee8-43cc-bb1b-c6af2264e8da';

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

    console.log(`Fetching details for restaurant ${restaurantId}...`);
    const restRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/admins/restaurants/${restaurantId}`, { headers });
    if (restRes.ok) {
        const restDetails = await restRes.json();
        console.log('Restaurant Details:', JSON.stringify(restDetails, null, 2));
    } else {
        console.error('Failed to fetch restaurant details:', restRes.status, await restRes.text());
    }
}

run();
