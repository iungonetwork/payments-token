/*
	Token transfer monitor

	Monitors smart contract events and detects token transfers
*/

const EventEmitter = require('events')
const Web3 = require("web3")

const TRANSFER_FUNCTION = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const PROCESS_NEXT_INTERVAL_MS = process.env.PROCESS_NEXT_INTERVAL_MS || 60000
const PROCESS_NEXT_ERROR_INTERVAL_MS = process.env.PROCESS_NEXT_ERROR_INTERVAL_MS || 60000

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
		this.startingBlock = fromBlock
		this.processNext()
	}

	async processNext() {
		try {
			this.endingBlock = await this.web3.eth.getBlockNumber()
			if (this.startingBlock < this.endingBlock) {			
				console.log(`Processing blocks ${this.startingBlock}-${this.endingBlock}`)
				const transfers = await this.getTransfers(this.startingBlock, this.endingBlock)
				this.notifyTransfers(transfers)
				this.startingBlock = this.endingBlock + 1
			}
			setTimeout(this.processNext.bind(this), PROCESS_NEXT_INTERVAL_MS)
		} catch(err) {
			console.log(err)
			setTimeout(this.processNext.bind(this), PROCESS_NEXT_ERROR_INTERVAL_MS)
		}
	}

	async getTransfers(startingBlock, endingBlock) {
		return this.web3.eth.getPastLogs({
		  fromBlock: startingBlock,
		  toBlock: endingBlock,
		  address: this.contractAddress,
		  topics: [TRANSFER_FUNCTION]
		}).then(logs => logs.map(this.extractTransferData.bind(this)))		
	}

	extractTransferData(log) {
		return {
			from: this.web3.eth.abi.decodeParameter('address', log.topics[1]),
			to: this.web3.eth.abi.decodeParameter('address', log.topics[2]),
			amount: this.web3.eth.abi.decodeParameter('uint256', log.data)*Math.pow(10, -this.decimals),
			token: this.token,
			transactionHash: log.transactionHash,
			blockNumber: log.blockNumber
		}
	}

	notifyTransfers(transfers) {
		this.emit('data', {
			transfers,
			startingBlock: this.startingBlock,
			endingBlock: this.endingBlock
		})
	}

}

module.exports = TokenTransferMonitor