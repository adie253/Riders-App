const email = 'res_staging@gmail.com';
const passwords = [
    'TestPassword123',
    'Test@123',
    'DefaultPass@123',
    'vohuman@123'
];

async function run() {
    let restaurantToken = '';
    let restaurantId = '';
    
    for (const password of passwords) {
        console.log(`Trying password: ${password}...`);
        const loginRes = await fetch('https://rally-staging-9ae8.up.railway.app/api/restaurants/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (loginRes.ok) {
            const loginData = await loginRes.json();
            restaurantToken = loginData.accessToken;
            restaurantId = loginData.restaurantId || loginData.id;
            console.log(`SUCCESS! Password is ${password}, Restaurant ID is ${restaurantId}`);
            break;
        } else {
            console.log(`Failed: ${loginRes.status}`);
        }
    }

    if (!restaurantToken) {
        console.error('All passwords failed.');
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${restaurantToken}`
    };

    console.log(`Fetching orders for restaurant ${restaurantId}...`);
    const ordersRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/orders/restaurant/${restaurantId}?activeOnly=false`, {
        headers
    });
    if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const orders = ordersData.items || ordersData;
        console.log(`Found ${orders.length} orders.`);
        console.log(JSON.stringify(orders.slice(0, 10).map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            riderName: o.riderName || o.deliveryInfo?.riderName,
            riderStatus: o.riderStatus || o.deliveryInfo?.riderStatus
        })), null, 2));
    } else {
        console.error('Failed to fetch restaurant orders:', ordersRes.status, await ordersRes.text());
    }
}

run();
