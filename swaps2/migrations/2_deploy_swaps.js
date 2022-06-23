const Swaps = artifacts.require("Swaps");
const Vault = artifacts.require("Vault");

module.exports = deployer => {
  // deployer.deploy(Swaps)
  //   .then(swaps => new Promise(resolve => setTimeout(() => resolve(swaps), 6000)))
  //   .then(swaps => deployer.deploy(Vault)
  //     .then(vault => new Promise(resolve => setTimeout(() => resolve(vault), 6000)))
  //     .then(vault => swaps.setVault(vault.address)
  //       .then(_ => new Promise(resolve => setTimeout(() => resolve(_), 6000)))
  //       .then(_ => vault.setSwaps(swaps.address))))
};
