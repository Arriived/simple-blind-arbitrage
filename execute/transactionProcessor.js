const config = require('./utils/config.json')

async function processTransaction(data, poolManager, bundleExecutor) {
    for (const log of data.logs || []) {
        if (log.topics?.[0] !== config.syncTopic) continue
        const firstPair = log.address
        const [token0, token1, factoryToCheck] = await poolManager.checkPool(firstPair)
        // An unrelated pool must not discard later arbitrage candidates in the same transaction.
        if (!token0 || !token1 || !factoryToCheck) continue
        const secondPair = await poolManager.checkFactory(factoryToCheck, token0, token1)
        if (!secondPair) continue
        await bundleExecutor.execute(firstPair, secondPair, data.hash)
    }
}

module.exports = processTransaction
