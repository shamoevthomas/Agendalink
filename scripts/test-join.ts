import fetch from 'node-fetch';

async function testJoin() {
    console.log('Hitting local /api/meetings/join ...');
    const res = await fetch('http://localhost:3001/api/meetings/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            shareId: 'call-nabil-thomas',
            email: 'shamoevthomas@gmail.com',
            phone: '+33600000000'
        })
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
}
testJoin();
