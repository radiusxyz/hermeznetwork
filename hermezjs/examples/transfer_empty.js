const hermez = require('../../dist/node/index.js')
const {
  EXAMPLES_WEB3_URL,
  EXAMPLES_PRIVATE_KEY_A,
  EXAMPLES_PRIVATE_KEY_B,
  configureEnvironment
} = require('../constants.js')

async function main () {
  const privKey1 = EXAMPLES_PRIVATE_KEY_A
  const privKey2 = EXAMPLES_PRIVATE_KEY_B

  // Configure Environment (SC address, WEB3 providers,...)
  configureEnvironment()

  // load token to deposit information
  const tokenToDeposit = 0
  const token = await hermez.CoordinatorAPI.getTokens()
  const tokenERC20 = token.tokens[tokenToDeposit]

  // load first account
  // just fuction(not transaction call)
  const wallet = await hermez.HermezWallet.createWalletFromEtherAccount(EXAMPLES_WEB3_URL, { type: 'WALLET', privateKey: privKey1 })
  const hermezWallet = wallet.hermezWallet
  const hermezEthereumAddress = wallet.hermezEthereumAddress

  // load second account
  const wallet2 = await hermez.HermezWallet.createWalletFromEtherAccount(EXAMPLES_WEB3_URL, { type: 'WALLET', privateKey: privKey2 })
  const hermezEthereumAddress2 = wallet2.hermezEthereumAddress

  // get sender account information
  const infoAccountSender = (await hermez.CoordinatorAPI.getAccounts(hermezEthereumAddress, [tokenERC20.id]))
    .accounts[0]

  // get receiver account information
  const infoAccountReceiver = (await hermez.CoordinatorAPI.getAccounts(hermezEthereumAddress2, [tokenERC20.id]))
    .accounts[0]

  // set amount to transfer
  const amountTransfer = hermez.HermezCompressedAmount.compressAmount(hermez.Utils.getTokenAmountBigInt('0.00000000001', 18))
  // set fee in transaction
  const state = await hermez.CoordinatorAPI.getState()
  const usdTokenExchangeRate = tokenERC20.USD
  const fee = usdTokenExchangeRate ? state.recommendedFee.createAccount / usdTokenExchangeRate : 0

  // generate L2 transaction
  const l2TxTransfer = {
    from: infoAccountSender.accountIndex,
    to: infoAccountReceiver.accountIndex,
    amount: amountTransfer,
    fee: fee
  }
  const transferResponse = await hermez.Tx.generateAndSendL2Tx(l2TxTransfer, hermezWallet, infoAccountSender.token).catch(console.log)
  console.log('transferResponse: ', transferResponse)
}

main()
