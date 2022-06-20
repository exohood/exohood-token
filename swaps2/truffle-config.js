const ganache = require("ganache-core");
var HDWalletProvider = require("truffle-hdwallet-provider-privkey");

module.exports = {
  network: "ganache",
  networks: {
    ganache: {
      network_id: "*",
      provider: ganache.provider({ total_accounts: 100 })
    },
    ropsten: {
      // provider: () => new HDWalletProvider([PK], `https://ropsten.infura.io/${INFURA_KEY}`),
      provider: () => new HDWalletProvider([PK], `127.0.0.1`),
      network_id: 3
    }
  },
  mocha: {
    timeout: 100000
  },
  compilers: {
    solc: {
      version: "0.5.7",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "petersburg"
      }
    }
  }
};
