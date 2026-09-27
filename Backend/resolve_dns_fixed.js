const https = require('https');

const resolve = (domain) => {
    return new Promise((resolvePromise, reject) => {
        const url = `https://dns.google/resolve?name=${domain}&type=A`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Answer) {
                        const ips = json.Answer.filter(a => a.type === 1).map(a => a.data);
                        resolvePromise(ips);
                    } else {
                        resolvePromise([]);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
};

const domains = [
    'ac-shard-00-00.1lamvx7.mongodb.net',
    'ac-shard-00-01.1lamvx7.mongodb.net',
    'ac-shard-00-02.1lamvx7.mongodb.net'
];

(async () => {
    console.log('Resolving shard IPs via Google DoH...');
    try {
        const results = await Promise.all(domains.map(async d => {
            const ips = await resolve(d);
            return { domain: d, ips };
        }));

        results.forEach(r => {
            console.log(`${r.domain} => ${r.ips.join(', ')}`);
        });

        // Use valid IPs in connection string format
        if (results.every(r => r.ips.length > 0)) {
            const connectionString = `mongodb://examCoach_db_user:7452MNggNi8A3Ffn@${results[0].ips[0]}:27017,${results[1].ips[0]}:27017,${results[2].ips[0]}:27017/examcoach?ssl=true&replicaSet=atlas-1lamvx7-shard-0&authSource=admin&retryWrites=true&w=majority`;
            console.log('\nSUGGESTED CONNECTION STRING:\n' + connectionString);
        } else {
            console.log('Failed to resolve all IPs.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
})();
