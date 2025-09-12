require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

const { MONAD_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.24",
  networks: {
    monad: {
      url: MONAD_RPC_URL,
      accounts: [process.env.PRIVATE_KEY] 
    },
  },
};
