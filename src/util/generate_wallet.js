const { EthHdWallet } = require('eth-hd-wallet'),
	  readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const size = process.argv[2] || 10000

rl.on('line', function(mnemonic){
    const wallet = EthHdWallet.fromMnemonic(mnemonic)
    const addresses = wallet.generateAddresses(size)
    addresses.forEach(address => {
    	console.log(address)
    });
})