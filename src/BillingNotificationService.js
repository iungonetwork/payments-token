/*
	DEPRECATED, replaced by AMQP channel wrapper
*/

const REDIS_BILLING_NOTIFICATION_QUEUE = 'billing:pending'

class BillingNotificationService {

	constructor(redis) {
		this.redis = redis;
	}

	// TODO add date?
	notify(userId, transfer) {
		
		const msg = {
			userId: userId,
			transfer: transfer
		}

		this.redis.set(this.nofiticationKey(msg), JSON.stringify(msg))
		this.redis.lpush(REDIS_BILLING_NOTIFICATION_QUEUE, transfer.transactionHash)
	}

	nofiticationKey(msg) {
		return 'notification:' + msg.transfer.transactionHash
	}

	getPendingQueueSize() {
		return new Promise((resolve, reject) => {
			this.redis.llen(REDIS_BILLING_NOTIFICATION_QUEUE, (err, size) => {
				if (err) {
					reject(err)
				} else {
					resolve(size)
				}
			})
		})
	}
}

module.exports = BillingNotificationService