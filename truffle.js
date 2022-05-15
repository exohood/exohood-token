const ganache = require('ganache-core');
const BigNumber = require('bignumber.js');

BigNumber.config({ EXPONENTIAL_AT: 100 });

module.exports = {
    networks: {
        ganache: {
            network_id: '*', // eslint-disable-line camelcase
            provider: ganache.provider({
                total_accounts: 6, // eslint-disable-line camelcase
                default_balance_ether: BigNumber(1e+99), // eslint-disable-line camelcase
                mnemonic: 'exohood',
                time: new Date('2021-04-16T15:00:00Z'),
                debug: false,
                // ,logger: console
            }),
        },
        localhost: {
            host: 'localhost',
            port: 8545,
            network_id: '*', // eslint-disable-line camelcase
        },
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200,
        },
    },
    network: 'ganache',
    mocha: {
        bail: true,
        fullTrace: true,
    },
};
