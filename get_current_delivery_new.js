const RIDER_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyOTJjMWY4OC00ODFlLTQ4YjMtODc1Zi01YWNmYjQzNDNkZDIiLCJqdGkiOiIxYzdmYWY3Ni1kM2Y0LTQxNTYtYTAyMC04OGI0NzI4YWZjNGIiLCJwaG9uZSI6IjgwODAxMjUzMDkiLCJuYW1lIjoiYWRpdHlhIEUiLCJyb2xlIjoiUmlkZXIiLCJ1c2VyX3R5cGUiOiJyaWRlciIsImt5Y19zdGF0dXMiOiJWZXJpZmllZCIsImV4cCI6MTc4MjcxMjQ2MiwiaXNzIjoiUmFsbHlBUEkiLCJhdWQiOiJSYWxseUFwcCJ9.OA9GR-Dbm4lsSuMP54bTBbX0jpXuD25vYBNZ_gdwcfHThHesyNmmI1aAT2LO204HeOIaOjJ7q1z5FoU2LEsCeC3LYCgOmkpOz1AnB2d-MDVbQx4lFuhEQvBmSbRNGptuNLzAfxC2NUzPQLrMNPbYQYQ74dkRnyRwPQ8Y-y2wuvXx02iVWNaStb0vEJt2ycLPTWAHr_xhHopj568s8Vb4cZ0mIquorLk28n9DQOhPU2L3vy6NEMTYkQNUfMSyTughMqC3IV3C9jEg2jf3E2hrMAf1FqA1nfsBHYFVSgqttprTAj5FufsVm2kRuaeWxn45DBWo96uWxpCTuObEwy6_pA';

async function run() {
    try {
        console.log('Fetching active delivery...');
        const currentRes = await fetch('https://rally-staging-9ae8.up.railway.app/api/v1/riders/delivery/current', {
            headers: { 'Authorization': `Bearer ${RIDER_TOKEN}` }
        });
        if (currentRes.ok) {
            console.log('Current active delivery:', JSON.stringify(await currentRes.json(), null, 2));
        } else {
            console.error('Failed to get active delivery:', currentRes.status, await currentRes.text());
        }
    } catch (err) {
        console.error(err);
    }
}

run();
