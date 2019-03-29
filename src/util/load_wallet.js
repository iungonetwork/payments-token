const readline = require('readline')
	  request = require('superagent')

const rl = readline.createInterface({
  input: process.stdin,
  output: null,
  terminal: false
});

const url = process.argv[2] || 'http://localhost:80'
var addresses = []

function addAddress() {
  let address = addresses.pop();
  if (address =! undefined) {
      request
      .post(url + '/pool/free')
      .send({address: address})
      .end((err, res) => {
      if (err) {
        console.log(err)
      }
      addAddress();
    });
  }
}

rl.on('line', address => {
  addresses.push(address);
})

addAddress()