const RIDER_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyOTJjMWY4OC00ODFlLTQ4YjMtODc1Zi01YWNmYjQzNDNkZDIiLCJqdGkiOiJhMTgwYjk2Yi1lMmI4LTRmYmYtOThmYS0wNzBkMzY0N2E1NGQiLCJwaG9uZSI6IjgwODAxMjUzMDkiLCJuYW1lIjoiYWRpdHlhIEUiLCJyb2xlIjoiUmlkZXIiLCJ1c2VyX3R5cGUiOiJyaWRlciIsImt5Y19zdGF0dXMiOiJWZXJpZmllZCIsImV4cCI6MTc4MjcwNzkwMiwiaXNzIjoiUmFsbHlBUEkiLCJhdWQiOiJSYWxseUFwcCJ9.OMpLH6DG2gpyoNp-Q0DIUs9-uioWgztd3Bwx6JwXM-jsS8IFh0d-Th9X3qYs1FnVnKw2QvlTtQ6BWNaOyoyHUPNkd2TG1KmZTHRmqx_Yxhg3_RtPk4MVnet3XWeCp7fXLj1ZWA4WBCoa432pyj6yBvb-SozhIDQPKUtqapNzHSNqS7y3N7jESpRo3378E7WvrFw4hSAPAKW8siReGwsaX-qTkt-gpTDBZH3_6wrp65jYQgfzNOpPxER__2ZTq3pf7aZBHbLYvV-_yCLwu5pOfi0pdhDKBA3NWQ8acDbZI1tKRB-rjgKrETUVzm1-FhIr2af7wrh4BZcMKNAGN5L-fw';

async function run() {
    try {
        console.log('Fetching current active delivery for rider...');
        const res = await fetch('https://rally-staging-9ae8.up.railway.app/api/v1/riders/delivery/current', {
            headers: {
                'Authorization': `Bearer ${RIDER_TOKEN}`
            }
        });
        if (res.ok) {
            console.log('Current Active Delivery:', JSON.stringify(await res.json(), null, 2));
        } else {
            console.error('Failed to get active delivery:', res.status, await res.text());
        }
    } catch (err) {
        console.error(err);
    }
}

run();
