const { test } = require('node:test')
const assert = require('node:assert/strict')
const processTransaction = require('./transactionProcessor')
const { syncTopic } = require('./utils/config.json')

for (const skipReason of ['unrelated pool', 'missing alternate pair']) {
    test(`continues to later logs after ${skipReason}`, async () => {
        const executed = []
        let checked = 0
        const poolManager = {
            async checkPool(address) {
                if (address === 'skip' && skipReason === 'unrelated pool') return [false, false, false]
                return [address, 'WETH', 'factory']
            },
            async checkFactory(factory, token0) {
                checked++
                return token0 === 'skip' ? false : 'alternate'
            }
        }
        const executor = { async execute(...args) { executed.push(args) } }
        await processTransaction({
            hash: 'transaction',
            logs: [{ address: 'skip', topics: [syncTopic] }, { address: 'trade', topics: [syncTopic] }]
        }, poolManager, executor)
        assert.deepEqual(executed, [['trade', 'alternate', 'transaction']])
        assert.equal(checked, skipReason === 'unrelated pool' ? 1 : 2)
    })
}
