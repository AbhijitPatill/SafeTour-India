const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TouristIDModule", (m) => {
  const touristID = m.contract("TouristID");
  return { touristID };
});