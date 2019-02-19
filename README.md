# Gateway Ethereum

Solidity contracts for the gateway on Ethereum blockchain. Users can deposit and withdraw their assets through this gateway.

## Documentation

Documentation is not ready.

## Development

First, install Node.js and npm. Then grep the source code.

### Get the source

Fork this repo and clone it to your local machine:

```sh
$ git clone git@github.com:your-username/gateway-ethereum.git
```

Once git clone is done, use npm to install dependencies:

```sh
$ npm install
```

### Truffle network

- `coverage`: this network is for **solidity-coverage** report
- `development`: this network is used for local development
- `deploy`: this network is used for deploying contracts
- `console`: this network is used for `truffle console`

### Test

To run tests, run command below:

```sh
$ npm run test
```

#### Coverage

To get coverage report, run command below:

```sh
$ npm run test:coverage
```

### Troubleshoot

Run below if `npm run test:coverage` fails with at `calldata` location.

```bash
curl -o node_modules/solidity-parser-sc/build/parser.js https://raw.githubusercontent.com/maxsam4/solidity-parser/solidity-0.5/build/parser.js
```

## License

Gateway Ethereum is licensed under the [MIT License](/LICENSE).
