async function run() {
    try {
        console.log('Seeding new rider...');
        const res = await fetch('https://rally-staging-9ae8.up.railway.app/api/dev/seed-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rider: {
                    phone: '8888888888',
                    name: 'Test Rider',
                    vehicleType: 'Bike'
                }
            })
        });

        console.log('Response status:', res.status);
        const text = await res.text();
        console.log('Response body:', text);
    } catch (err) {
        console.error(err);
    }
}

run();
