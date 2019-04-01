const { EthHdWallet } = require('eth-hd-wallet')
const mnemonic = process.argv[2]
const size = process.argv[3] || 10000
const wallet = EthHdWallet.fromMnemonic(mnemonic)
const addresses = wallet.generateAddresses(size)
addresses.forEach(address => {
	console.log(address)
})