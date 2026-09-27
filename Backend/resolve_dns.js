const https = require('https');

const domain = 'ac-shard-00-00.1lamvx7.mongodb.net';
const url = `https://dns.google/resolve?name=${domain}&type=A`;

console.log(`Resolving ${domain} via Google DoH...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.Answer) {
                console.log('Real IPs found:');
                json.Answer.forEach(ans => {
                    console.log(`- ${ans.data}`);
                });
            } else {
                console.log('No Answer found in DoH response.');
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
        }
    });
}).on('error', (err) => {
    console.error('Error querying DoH:', err.message);
});
