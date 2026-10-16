const dns = require('dns');

dns.lookup('db.bolmrscavaeiqzytfzej.supabase.co', (err, address, family) => {
  console.log('Lookup db:', err, address, family);
});

fetch('https://bolmrscavaeiqzytfzej.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbG1yc2NhdmFlaXF6eXRmemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDU2MjEsImV4cCI6MjEwNzMyMTYyMX0.A3lmy57zKqvSxfjRumabXqm5v4MTAe_EvP9MvVBXHrE'
  }
}).then(r => {
  console.log('Rest response headers:', [...r.headers.entries()]);
}).catch(console.error);
