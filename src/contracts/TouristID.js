export const CONTRACT_ADDRESS = "0xD5E653dC4494B5e2cB6ff80C9A659672aDb0Efa3";

export const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "wallet", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "issuedAt", "type": "uint256" }
    ],
    "name": "TouristIDMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "wallet", "type": "address" }
    ],
    "name": "TouristIDRevoked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getTotalTourists",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }],
    "name": "getTouristByTokenId",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "nationality", "type": "string" },
          { "internalType": "string", "name": "idType", "type": "string" },
          { "internalType": "string", "name": "idNumber", "type": "string" },
          { "internalType": "address", "name": "walletAddress", "type": "address" },
          { "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
          { "internalType": "bool", "name": "isActive", "type": "bool" }
        ],
        "internalType": "struct TouristID.Tourist",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_wallet", "type": "address" }],
    "name": "getTouristByWallet",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "nationality", "type": "string" },
          { "internalType": "string", "name": "idType", "type": "string" },
          { "internalType": "string", "name": "idNumber", "type": "string" },
          { "internalType": "address", "name": "walletAddress", "type": "address" },
          { "internalType": "uint256", "name": "issuedAt", "type": "uint256" },
          { "internalType": "bool", "name": "isActive", "type": "bool" }
        ],
        "internalType": "struct TouristID.Tourist",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "isRegistered",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_nationality", "type": "string" },
      { "internalType": "string", "name": "_idType", "type": "string" },
      { "internalType": "string", "name": "_idNumber", "type": "string" }
    ],
    "name": "mintTouristID",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_tokenId", "type": "uint256" }],
    "name": "revokeTouristID",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "walletToTokenId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];