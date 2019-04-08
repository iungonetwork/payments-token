# Token prepayment collector

This service connects to ethereum network and monitors given smart contract to detect transfers to specific wallet addresses.
These are then passed to accounting/billing where ledger is updated. Pool of wallet addresses is generated and preloaded, user ids are bound to wallet address upon registration (managed by core services).

## Generate wallet

Generate mnemonic:
```
docker run --rm docker.iungo.network/payments-token node /app/src/util/generate_mnemonic.js > mnemonic
```

Generate wallet addresses:
```
docker run --rm -t docker.iungo.network/payments-token node /app/src/util/generate_wallet.js "$(cat mnemonic)" 10000 > wallet
```

## Setup and run
Setup your environment variables to point to real service URLs:
```
WEB3_WS_PROVIDER_URI: http://parity_or_geth_host:8546
TOKEN: INGX
TOKEN_DECIMALS: 4
CONTRACT_ADDRESS: '0x05CE1108d503a6b1d66Ca79f54E9bC537222c36E'
AMQP_URI: amqp://user:pass@rabbitmq:5672
AMQP_QUEUE: billing
REDIS_HOST: redis
```

Start the app
```
docker run -p8080:80 docker.iungo.network/payments-token
```

Load wallet
```
xargs -n1 -I% curl -d'{"address":"%"}' -H "Content-Type: application/json" -s localhost:8080/pool/free > /dev/null < wallet
```