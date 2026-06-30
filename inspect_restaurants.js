const adminEmail = 'testadmin@hivago.com';
const adminPassword = 'TestPassword123';

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

    console.log('Fetching restaurants list...');
    const restRes = await fetch('https://rally-staging-9ae8.up.railway.app/api/admins/restaurants?page=1&pageSize=50', { headers });
    if (restRes.ok) {
        const restData = await restRes.json();
        console.log('Restaurants:', JSON.stringify(restData, null, 2));
    } else {
        console.error('Failed to fetch restaurants:', restRes.status, await restRes.text());
    }
}

run();
