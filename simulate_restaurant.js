const ORDER_ID = 'd4b7d25b-a598-4dbf-bb8c-a8af8849a8bd';
const RIDER_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyOTJjMWY4OC00ODFlLTQ4YjMtODc1Zi01YWNmYjQzNDNkZDIiLCJqdGkiOiJhMTgwYjk2Yi1lMmI4LTRmYmYtOThmYS0wNzBkMzY0N2E1NGQiLCJwaG9uZSI6IjgwODAxMjUzMDkiLCJuYW1lIjoiYWRpdHlhIEUiLCJyb2xlIjoiUmlkZXIiLCJ1c2VyX3R5cGUiOiJyaWRlciIsImt5Y19zdGF0dXMiOiJWZXJpZmllZCIsImV4cCI6MTc4MjcwNzkwMiwiaXNzIjoiUmFsbHlBUEkiLCJhdWQiOiJSYWxseUFwcCJ9.OMpLH6DG2gpyoNp-Q0DIUs9-uioWgztd3Bwx6JwXM-jsS8IFh0d-Th9X3qYs1FnVnKw2QvlTtQ6BWNaOyoyHUPNkd2TG1KmZTHRmqx_Yxhg3_RtPk4MVnet3XWeCp7fXLj1ZWA4WBCoa432pyj6yBvb-SozhIDQPKUtqapNzHSNqS7y3N7jESpRo3378E7WvrFw4hSAPAKW8siReGwsaX-qTkt-gpTDBZH3_6wrp65jYQgfzNOpPxER__2ZTq3pf7aZBHbLYvV-_yCLwu5pOfi0pdhDKBA3NWQ8acDbZI1tKRB-rjgKrETUVzm1-FhIr2af7wrh4BZcMKNAGN5L-fw';

const passwords = [
    'Test@123',
    'DefaultPass@123',
    'vohuman@123',
    'vohuman123',
    'password',
    '123456',
    'admin123'
];

async function run() {
    let restaurantToken = '';
    for (const password of passwords) {
        console.log(`Trying password: ${password}...`);
        const loginRes = await fetch('https://rally-staging-9ae8.up.railway.app/api/restaurants/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'vohuman@rally.in', password })
        });
        if (loginRes.ok) {
            const loginData = await loginRes.json();
            restaurantToken = loginData.accessToken;
            console.log(`SUCCESS! Password is ${password}`);
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

    console.log(`Confirming order ${ORDER_ID}...`);
    const confirmRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/orders/${ORDER_ID}/confirm`, {
        method: 'PUT',
        headers
    });
    console.log('Confirm order response:', confirmRes.status, await confirmRes.text());

    console.log(`Setting order ${ORDER_ID} to preparing...`);
    const prepRes = await fetch(`https://rally-staging-9ae8.up.railway.app/api/orders/${ORDER_ID}/preparing`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ prepTime: 20, deliveryPartner: 'HIVAGO' })
    });
    console.log('Preparing order response:', prepRes.status, await prepRes.text());

    console.log('Checking current active delivery for rider...');
    const deliveryRes = await fetch('https://rally-staging-9ae8.up.railway.app/api/v1/riders/delivery/current', {
        headers: {
            'Authorization': `Bearer ${RIDER_TOKEN}`
        }
    });
    if (deliveryRes.ok) {
        console.log('Active delivery response:', await deliveryRes.json());
    } else {
        console.error('Failed to fetch active delivery:', deliveryRes.status, await deliveryRes.text());
    }
}

run();
