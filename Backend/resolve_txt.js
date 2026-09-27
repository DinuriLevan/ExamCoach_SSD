const https = require('https');

const domain = 'examcoach.1lamvx7.mongodb.net';
const url = `https://dns.google/resolve?name=${domain}&type=TXT`;

console.log(`Querying TXT record for ${domain}...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.Answer) {
                console.log('TXT Records found:');
                json.Answer.forEach(ans => {
                    console.log(ans.data);
                });
            } else {
                console.log('No TXT records found.');
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error(e);
        }
    });
});
