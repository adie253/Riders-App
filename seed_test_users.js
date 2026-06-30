async function run() {
    try {
        console.log('Seeding test users...');
        const res = await fetch('https://rally-staging-9ae8.up.railway.app/api/dev/seed-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin: {
                    email: 'testadmin@hivago.com',
                    password: 'TestPassword123',
                    name: 'Test Admin',
                    role: 'SuperAdmin'
                },
                restaurant: {
                    name: 'Test Restaurant',
                    phone: '9999999999',
                    email: 'testrestaurant@rally.in',
                    password: 'TestPassword123',
                    addressLine: 'Test Address',
                    latitude: 12.9716,
                    longitude: 77.5946
                }
            })
        });

        console.log('Response status:', res.status);
        const text = await res.text();
        console.log('Response body:', text);
    } catch (err) {
        console.error('Error seeding:', err);
    }
}

run();
