const net = require('net');

const client = new net.Socket();
const host = 'portquiz.net';
const port = 27017;

console.log(`Testing connection to ${host}:${port}...`);

client.connect(port, host, () => {
    console.log('SUCCESS: Outbound connection on port 27017 is ALLOWED.');
    client.destroy();
});

client.on('error', (err) => {
    console.error(`FAILURE: Outbound connection on port 27017 is BLOCKED. Error: ${err.message}`);
    console.log('If port 27017 is blocked, you cannot connect to MongoDB Atlas directly.');
    console.log('You may need to use a different network (e.g. mobile hotspot) or VPN.');
});

client.on('timeout', () => {
    console.error('FAILURE: Connection timed out. Port 27017 is likely BLOCKED.');
    client.destroy();
});

client.setTimeout(5000);
