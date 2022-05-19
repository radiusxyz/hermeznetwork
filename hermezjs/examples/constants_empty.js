const hermez = require('../dist/node/index.js')

const EXAMPLES_WEB3_URL = 'http://localhost:8551'
const EXAMPLES_HERMEZ_API_URL = 'http://localhost:8086'
const EXAMPLES_HERMEZ_ROLLUP_ADDRESS = ''
const EXAMPLES_HERMEZ_WDELAYER_ADDRESS = ''

function configureEnvironment () {
  // Initializes Tx Pool
  hermez.TxPool.initializeTransactionPool()
  // load ethereum network provider
  hermez.Providers.setProvider(EXAMPLES_WEB3_URL)

  // set environment
  hermez.Environment.setEnvironment({
    baseApiUrl: EXAMPLES_HERMEZ_API_URL,
    contractAddresses: {
      [hermez.Constants.ContractNames.Hermez]: EXAMPLES_HERMEZ_ROLLUP_ADDRESS,
      [hermez.Constants.ContractNames.WithdrawalDelayer]: EXAMPLES_HERMEZ_WDELAYER_ADDRESS
    }
  })
}

module.exports = {
  EXAMPLES_WEB3_URL,
  EXAMPLES_HERMEZ_API_URL,
  configureEnvironment
}
