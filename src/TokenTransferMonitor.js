/*
	Token transfer monitor

	Monitors smart contract events and detects token transfers
*/

const EventEmitter = require('events')
const Web3 = require("web3")

const TRANSFER_FUNCTION = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

class TokenTransferMonitor extends EventEmitter {

	constructor(web3Uri, contractAddress, token, decimals) {
		super()
		
		this.web3Uri = web3Uri
		this.contractAddress = contractAddress
		this.token = token
		this.decimals = decimals
		this.web3 = new Web3()
	}

	/*
		web3 provider setup to reconnect on close
	*/
	connect() {
		const reconnect = this.connect.bind(this)
		const provider = new Web3.providers.WebsocketProvider(this.web3Uri)
		provider.on('error', e => console.log)
		provider.on('end', e => {
		    console.log('WS closed');
		    console.log('Will attempt to reconnect in 5 seconds...')
		    setTimeout(reconnect, 5000)
		})
		this.web3.setProvider(provider)
	}

	start(fromBlock) {
		
		this.connect()
		
		this.web3.eth.subscribe(
			'logs', 
			{
				address: this.contractAddress
			},
			[
				TRANSFER_FUNCTION
			]
		).on('data', logs => {

			console.log(logs)

			const transfer = {
				from: this.web3.eth.abi.decodeParameter('address', logs.topics[1]),
				to: this.web3.eth.abi.decodeParameter('address', logs.topics[2]),
				amount: this.web3.eth.abi.decodeParameter('uint256', logs.data)*Math.pow(10, -this.decimals),
				token: this.token,
				transactionHash: logs.transactionHash,
				blockNumber: logs.blockNumber
			}

			console.log(transfer)

			this.emit('transfer', transfer)
		});

		setInterval(this.checkStatus.bind(this), 60000)
	}

	checkStatus() {
		this.web3.eth.isSyncing().then(status => {
			console.log(status)
		})
	}
}

module.exports = TokenTransferMonitor