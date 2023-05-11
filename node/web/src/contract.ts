export const DEPLOY = {
  sepolia: "0xEF70d82ad0b6d2E8406235E6A3b09700350056a9",
} as const;

// remix.ethereum.org - eIDAS workspace
export const METADATA = {
  compiler: {
    version: "0.8.18+commit.87f61d96",
  },
  language: "Solidity",
  output: {
    abi: [
      {
        inputs: [
          {
            internalType: "uint256[2]",
            name: "a",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[2][2]",
            name: "b",
            type: "uint256[2][2]",
          },
          {
            internalType: "uint256[2]",
            name: "c",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[32]",
            name: "input",
            type: "uint256[32]",
          },
        ],
        name: "identityVerification",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "acc",
            type: "address",
          },
        ],
        name: "isVerified",
        outputs: [
          {
            internalType: "bool",
            name: "r",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "revoke",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        name: "verifiedIdentities",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256[2]",
            name: "a",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[2][2]",
            name: "b",
            type: "uint256[2][2]",
          },
          {
            internalType: "uint256[2]",
            name: "c",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[32]",
            name: "input",
            type: "uint256[32]",
          },
        ],
        name: "verifyProof",
        outputs: [
          {
            internalType: "bool",
            name: "r",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ],
    devdoc: {
      kind: "dev",
      methods: {
        "revoke()": {
          details: "Debug function for testing purpouses",
        },
      },
      version: 1,
    },
    userdoc: {
      kind: "user",
      methods: {},
      version: 1,
    },
  },
  settings: {
    compilationTarget: {
      "contracts/1_Verifier.sol": "Verifier",
    },
    evmVersion: "paris",
    libraries: {},
    metadata: {
      bytecodeHash: "ipfs",
    },
    optimizer: {
      enabled: false,
      runs: 200,
    },
    remappings: [],
  },
  sources: {
    "contracts/1_Verifier.sol": {
      keccak256:
        "0x7ee7a3989281b970c442b1830291cb3a0595cee1dd18d5f6ea4d26bff58ff986",
      license: "AML",
      urls: [
        "bzz-raw://52f1407b8cf764f6f3f35b0dcdf2b92dc34966f2d20d36d66f8779fb6e3ceb71",
        "dweb:/ipfs/Qmf8NgHPhi4oFGsHQkFFrn1CKq6ExMfh6yJVqC13ba8SAu",
      ],
    },
  },
  version: 1,
} as const;
