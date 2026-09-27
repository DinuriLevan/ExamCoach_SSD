const https = require('https');

const domain = '_mongodb._tcp.examcoach.1lamvx7.mongodb.net';
const url = `https://dns.google/resolve?name=${domain}&type=SRV`;

console.log(`Querying SRV record for ${domain}...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.Answer) {
                console.log('SRV Targets found:');
                json.Answer.forEach(ans => {
                    // Extract target from SRV record data (priority weight port target)
                    // Google DNS JSON format might return data as string "0 0 27017 host.domain."
                    console.log(ans.data);
                });
            } else {
                console.log('No SRV records found.');
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error(e);
        }
    });
});
