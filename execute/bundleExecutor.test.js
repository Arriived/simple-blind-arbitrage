const { test } = require('node:test');
const assert = require('node:assert/strict');
const ethers = require('ethers');
const BundleExecutor = require('./bundleExecutor');
const abi = require('./utils/BlindBackrunFlashLoan.json');

test('builds both flash-loan directions with exact integer arrays and the deployed WETH', async () => {
    const weth = '0x0000000000000000000000000000000000000001';
    const provider = new ethers.providers.StaticJsonRpcProvider('http://127.0.0.1:1', { chainId: 1, name: 'homestead' });
    provider.getBlockNumber = async () => 123;
    provider.getGasPrice = async () => ethers.BigNumber.from('1000000000');
    provider.getTransactionCount = async () => 7;
    provider.call = async () => ethers.utils.defaultAbiCoder.encode(['address'], [weth]);
    const signer = ethers.Wallet.createRandom().connect(provider);
    const executor = new BundleExecutor(signer, null, '0x0000000000000000000000000000000000000002', 'http://127.0.0.1:1', 50);
    const first = '0x0000000000000000000000000000000000000003';
    const second = '0x0000000000000000000000000000000000000004';
    const hash = '0x' + 'ab'.repeat(32);
    const bundles = await executor.buildBundles(first, second, hash);
    const iface = new ethers.utils.Interface(abi);
    for (let index = 0; index < bundles.length; index++) {
        const bundle = bundles[index];
        assert.equal(bundle.body[0].hash, hash);
        const transaction = ethers.utils.parseTransaction(bundle.body[1].tx);
        const call = iface.parseTransaction(transaction);
        assert.equal(call.name, 'makeFlashLoan');
        assert.deepEqual([...call.args.tokens], [weth]);
        assert.equal(call.args.amounts[0].toString(), '1000000000000000000000');
        const [pairA, pairB] = ethers.utils.defaultAbiCoder.decode(['address', 'address', 'uint256'], call.args.userData);
        assert.equal(pairA, index === 0 ? first : second);
        assert.equal(pairB, index === 0 ? second : first);
        assert.equal(transaction.nonce, 7);
    }
});
