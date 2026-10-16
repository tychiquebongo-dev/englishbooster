const { Client } = require('pg');

async function testIPv6() {
  const client = new Client({
    host: '2a05:d018:a0:6001:7bd2:7380:34c6:11c3',
    port: 5432,
    user: 'postgres',
    password: 'PIbVowXsMum22Y7G',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('CONNECTED TO IPV6 PG DIRECTLY!');
    const res = await client.query('SELECT count(*) FROM public.profiles');
    console.log('Profiles count:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('IPv6 connect error:', err.message);
  }
}

testIPv6();
