const yargs = require('yargs');
const ethers = require('ethers')
const EventSource = require('eventsource');
const PoolManager = require('./poolManager.js')
const BundleExecutor = require('./bundleExecutor.js')
const processTransaction = require('./transactionProcessor.js')
const { FlashbotsBundleProvider} = require('@flashbots/ethers-provider-bundle')
const config = require('./utils/config.json')
require('dotenv').config();

async function main() {
    // Parse the command line argument for the network to use
    const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 [options]')
    .example('$0 -n network', 'Execute bundles on mainnet')
    .options({
        network: {
            alias: 'n',
            describe: 'The network (mainnet, goerli) to use for',
            demandOption: true,
            type: 'string'
        },
    })
    
    .help()
    .argv;
    const provider = new ethers.providers.JsonRpcProvider(process.env.rpcUrl)
    const signer = new ethers.Wallet(process.env.privateKey, provider)
    const flashbotsBundleProvider = await FlashbotsBundleProvider.create(provider, signer)
    const poolManager = new PoolManager(provider, argv.network)

    console.log("Loaded wallet with address:", signer.address)

    let MevShareNode, bundleExecutor;

    if (argv.network == 'mainnet') {
        MevShareNode = new EventSource(config.mainnetMevShareNode)
        bundleExecutor = new BundleExecutor(signer, flashbotsBundleProvider, process.env.executorContractAddress, config.mainnetBundleAPI, config.percentageToKeep)
    } else if (argv.network == 'goerli') {
        MevShareNode = new EventSource(config.goerliMevShareNode)
        bundleExecutor = new BundleExecutor(signer, flashbotsBundleProvider, process.env.executorContractAddress, config.goerliBundleAPI, config.percentageToKeep)
    }

    MevShareNode.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data)
            console.log("New transaction with hash:", data.hash)
            await processTransaction(data, poolManager, bundleExecutor)
        } catch (error) {
            console.error("Failed to process MEV-Share event:", error.message)
        }
    };
    MevShareNode.onerror = (error) => {
        // Handle the error
        console.error(error);
    }
}

main()
