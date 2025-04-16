const { readProxies, saveResults } = require("./src/utils");
const { scanIP } = require("./src/scanner");

const MAX_CONCURRENT_SCANS = 10; // Batas scan bersamaan
const TIMEOUT = 1000; // Timeout lebih cepat (1 detik)

/**
 * Scan IP secara batch untuk menghindari overload
 * @param {string[]} proxies - List IP yang akan discan (tidak duplikat)
 * @param {number} batchSize - Maksimum scan bersamaan
 */
async function scanInBatches(proxies, batchSize) {
    const results = new Map(); // Pakai Map biar tiap IP hanya punya satu hasil

    for (let i = 0; i < proxies.length; i += batchSize) {
        const batch = proxies.slice(i, i + batchSize);
        console.log(`Scanning batch ${i / batchSize + 1}/${Math.ceil(proxies.length / batchSize)}`);
        
        const batchResults = await Promise.all(batch.map(ip => scanIP(ip, TIMEOUT)));

        batchResults.flat().filter(Boolean).forEach(result => {
            const [ip, port] = result.split(":");
            if (!results.has(ip)) {
                results.set(ip, result); // Simpan hanya satu port pertama per IP
            }
        });
    }

    return Array.from(results.values()); // Ambil hanya satu hasil per IP
}

async function main() {
    let proxies = readProxies();

    if (proxies.length === 0) {
        console.error("Tidak ada IP dalam daftar-proxy.txt!");
        return;
    }

    // Hapus duplikat IP sebelum scan
    proxies = [...new Set(proxies)];

    console.log(`Scanning ${proxies.length} unique IPs dengan ${MAX_CONCURRENT_SCANS} concurrent scans...\n`);

    const openPorts = await scanInBatches(proxies, MAX_CONCURRENT_SCANS);

    if (openPorts.length === 0) {
        console.log("Tidak ada port terbuka.");
    } else {
        saveResults(openPorts.join("\n"));
        console.log(`Scan selesai! Hasil disimpan di data/hasil-scan.txt`);
    }
}

main();
