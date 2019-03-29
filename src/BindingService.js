
const REDIS_SET_BINDINGS = 'blockchain:bindings',
	  REDIS_SET_POOL_FREE = 'blockchain:pool:free',
	  REDIS_SET_POOL_BOUND = 'blockchain:pool:bound',
	  REDIS_SET_USERS = 'blockchain:users'

class BindingService {

	constructor(redis) {
		this.redis = redis
	}

	getPoolFree() {
		return new Promise((resolve, reject) => {
			this.redis.scard(REDIS_SET_POOL_FREE, (err, size) => {
				if (err) {
					reject(err)
				} else {
					resolve(size)
				}
			})
		})
	}

	getBindings() {
		return new Promise((resolve, reject) => {
			this.redis.smembers(REDIS_SET_BINDINGS, (err, bindings) => {
				if (err) {
					reject(err)
				} else {
					resolve(bindings)
				}
			})
		})
	}

	getFreeAddresses() {
		return new Promise((resolve, reject) => {
			this.redis.smembers(REDIS_SET_POOL_FREE, (err, addresses) => {
				console.log(err);
				if (err) {
					reject(err)
				} else {
					resolve(addresses)
				}
			})
		})
	}

	addAddressToPool(address) {
		return new Promise((resolve, reject) => {
			this.isAddressBound(address).then(isBound => {
				if (isBound) {
					reject('Address is already bound')
				} else {
					this.redis.sadd(REDIS_SET_POOL_FREE, address, (err) => {
						if (err) {
							reject(err)
						} else {
							resolve()
						}
					})
				}
			}, reason => {
				reject(reason)
			})
		})
	}

	isAddressBound(address) {
		return new Promise((resolve, reject) => {
			this.redis.sismember(REDIS_SET_POOL_BOUND, address, (err, isBound) => {
				if (err) {
					reject(err)
				} else {
					resolve(isBound)
				}
			})
		})
	}

	isUserBound(userId) {
		return new Promise((resolve, reject) => {
			this.redis.sismember(REDIS_SET_USERS, userId, (err, isBound) => {
				if (err) {
					reject(err)
				} else {
					resolve(isBound)
				}
			})
		})	
	}

	bindUser(userId) {
		return new Promise((resolve, reject) => {
			this.isUserBound(userId).then(isBound => {
				if (isBound) {
					reject('User is already bound')
				} else {
					this.redis.spop(REDIS_SET_POOL_FREE, (err, address) => {
						if (err) {
							reject(err)
						} else {
							if (!address) {
								reject('Failed to get address from pool')
							} else {

								// TODO wait for all results only then
								// TODO rollback(?)

								this.redis.sadd(REDIS_SET_POOL_BOUND, address)
								this.redis.sadd(REDIS_SET_USERS, userId)
								this.redis.sadd(REDIS_SET_BINDINGS, this.packBinding(userId, address))
								this.redis.set(this.userKey(userId), address)
								this.redis.set(this.addressKey(address), userId)

								resolve(address);
							}
						}
					})
				}
			}).catch(reason => {
				reject(reason)
			})
		})
	}

	packBinding(userId, address) {
		return userId + ':' + address
	}

	userKey(userId) {
		return 'user:' + userId;
	}

	addressKey(address) {
		return 'address:' + address;
	}

	findUserForAddress(address) {
		return new Promise((resolve, reject) => {
			this.redis.get(this.addressKey(address.toLowerCase()), (err, userId) => {
				if (err) {
					reject(err)
				} else {
					resolve(userId)
				}
			})
		})
	}

}

module.exports = BindingService;