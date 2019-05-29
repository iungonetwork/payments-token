/*
	Token transfer monitor
*/

const express = require('express'),
	  bodyParser = require('body-parser'),
	  redis = require('./redis'),
	  app = express()
 	  port = 80,
 	  log = require('./log')(),
 	  BindingService = require('./BindingService'),
 	  bindings = new BindingService(redis),
	  TokenTransferMonitor = require('./TokenTransferMonitor'),
	  token = process.env.TOKEN
	  contractAddress = process.env.CONTRACT_ADDRESS,
	  tokenDecimals = process.env.TOKEN_DECIMALS,
	  monitor = new TokenTransferMonitor(process.env.WEB3_WS_PROVIDER_URI, contractAddress, token, tokenDecimals),
	  amqp = require('amqp-connection-manager'),
	  amqpConnection = amqp.connect([process.env.AMQP_URI]),
	  chWrapper = amqpConnection.createChannel({
 		json: true,
 		setup: channel => channel.assertQueue(process.env.AMQP_QUEUE, {durable: true})
	  }),
	  LAST_BLOCK_KEY = 'blockchain:last_block'

app.use(bodyParser.json())

/*
	Report status
*/
app.get('/', async(req, res) => {
	const status = {
		running: true,
		poolFree: await bindings.getPoolFree()
	}
	res.send(status)
})

/*
	Show addresses available in pool
*/
app.get('/pool/free', (req, res) => {
	bindings.getFreeAddresses().then(addresses => {
		res.send(addresses)
	}, (reason => {
		res.status(500).json({error: reason.toString()})
	}));
})

/*
	Add addresses pool
*/
app.post('/pool/free', (req, res) => {
	const address = req.body.address;
	if (!address) {
		res.status(400).json({error: 'Please specify "address"'})
	}

	bindings.addAddressToPool(address).then(address => {
		res.json({error: null})
	}, reason => {
		res.status(500).json({error: reason})
	})
})

/*
	Bind address from pool
*/
app.post('/pool/free/bind', (req, res) => {
	const userId = req.body.userId;
	if (!userId) {
		res.status(400).json({error: 'Please specify userId'})
	}

	bindings.bindUser(userId).then(address => {
		res.json({address: address});
	}, reason => {
		res.status(500).json({error: reason})
	})
})

/*
	Get address-user bindings
*/
app.get('/bindings', (req, res) => {
	bindings.getBindings().then(bindings => {
		res.send(bindings)
	})
})

/*
	Get user id for given address
*/
app.get('/bindings/address/:address', (req, res) => {
	const address = req.params.address;
	bindings.findUserForAddress(address).then(userId => {
		if (userId) {
			res.json({userId: userId})
		} else {
			res.status(404).json({error: 'Not found'})
		}
	})
})

/*
	Process transfer
*/
monitor.on('data', data => {

	data.transfers.forEach(transfer => {
		// check if receiver address is bound to user, ignore otherwise

		log.debug('processing transfer: %o', transfer)

		bindings.findUserForAddress(transfer.to).then(userId => {
			if (userId) {
				log.debug('mapped address %s to user %s', transfer.to, userId)

				// push to billing queue
				const msg = {
					userId: userId,
					transfer: transfer
				}
				chWrapper.sendToQueue(process.env.AMQP_QUEUE, msg, {contentType: 'application/json'}).catch(err => {
					log.error(err)
				})
			} else {
				log.debug('user not found for address %s', transfer.to)
			}
		}, reason => {
			log.error(reason)
		})
	})
	
	redis.pset(LAST_BLOCK_KEY, data.endingBlock).then(_ => {
		log.debug(`marked latest processed block: ${data.endingBlock}`)
	}).catch(e => {
		log.error(e)
	})
})

redis.pget(LAST_BLOCK_KEY).then(lastBlock => {
	monitor.start(lastBlock || process.env.INITIAL_STARTING_BLOCK)
}).catch(e => {
	log.error(e)
})

app.listen(port)
