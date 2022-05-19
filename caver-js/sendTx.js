const fs = require('fs')
const Caver = require('caver-js')
const caver = new Caver('https://api.baobab.klaytn.net:8651/')


const toAddress = process.argv[2]

async function testFunction() {
    // Read keystore json file
    const keystore = fs.readFileSync('./keystore.json', 'utf8')

    // Decrypt keystore
    const keyring = caver.wallet.keyring.decrypt(keystore, '!!01027221029')
    // console.log(keyring)

    // You can also generate a private key directly via
    // const keyring = caver.wallet.keyring.generate()

    // Add to caver.wallet
    caver.wallet.add(keyring)
    console.log("from address:",keyring.address) //0xad7a927e114da53771c549962da0cdf9ed5e695e

    // Create value transfer transaction
    const vt = caver.transaction.valueTransfer.create({
        from: keyring.address,
        to: toAddress,
        // to: "0x8084fed6b1847448c24692470fc3b2ed87f9eb47",
        value: caver.utils.toPeb(2, 'KLAY'),
        gas: 25000,
    })

    // Sign to the transaction
    const signed = await caver.wallet.sign(keyring.address, vt)

    // Send transaction to the Klaytn blockchain platform (Klaytn)
    const receipt = await caver.rpc.klay.sendRawTransaction(signed)
    // console.log(receipt)
    console.log(toAddress)
}

testFunction()
