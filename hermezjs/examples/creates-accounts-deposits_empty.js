const hermez = require('../../dist/node/index.js')
// const hermez = require('../src/index.js')

const {
  EXAMPLES_WEB3_URL,
  EXAMPLES_PRIVATE_KEY_A,
  configureEnvironment
} = require('../constants.js')

async function main () {
  const privKey1 = EXAMPLES_PRIVATE_KEY_A

  // Configure Environment (SC address, WEB3 providers,...)
  configureEnvironment()
  // initialize transaction pool
  hermez.TxPool.initializeTransactionPool()
  // load token to deposit information
  const tokenToDeposit = 0
  const token = await hermez.CoordinatorAPI.getTokens()
  const tokenERC20 = token.tokens[tokenToDeposit]

  // load first account
  const wallet = await hermez.HermezWallet.createWalletFromEtherAccount(EXAMPLES_WEB3_URL, { type: 'WALLET', privateKey: privKey1 })
  const hermezWallet = wallet.hermezWallet
  const hermezEthereumAddress = wallet.hermezEthereumAddress

  // set amount to deposit
  const amountDeposit = hermez.HermezCompressedAmount.compressAmount(hermez.Utils.getTokenAmountBigInt('0.0000001', 18))

  // console.log(hermezWallet.publicKeyCompressedHex) //8050fd9b376065c2adb42c5b3f52c99ea2e0e1e37c73df574116c6b4f60a78ca
  // perform deposit account 1
  await hermez.Tx.deposit(
    amountDeposit,
    hermezEthereumAddress,
    tokenERC20,
    hermezWallet.publicKeyCompressedHex,
    { type: 'WALLET', privateKey: privKey1 }
  )
  console.log('Deposit DONE')
}

main()
