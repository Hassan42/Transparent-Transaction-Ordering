The dataset used in the paper is found in the directory paper_dataset.

## Dependencies 

```sh
npm install -g truffle
cd src | npm install
```

## Setup the network

```sh
./setup-network.sh 5
```
A new network will be initialized with the QBFT consensus protocol with 5 nodes.

## Start the network

Each node corresponds to a participant in the choreography.

Modes:
quorum: honest mode |
quorumal: displacement mode |
quorumal_del: suppression mode

In a new terminal:
```sh
./start-network.sh [mode]
```

## Stop the network

```sh
./stop-network.sh
```

## Deploy contracts

Network needs to be started before deploying contracts

```sh
./deploy-contract.sh
```

## Setups
```sh
cd src
```
### Generate Event Log

```sh
node event_generate.js
```

### Plain Setup
```sh
node interact_plain_process.js
```

### OC Setup

```sh
node interact_ordering_proces.js
```

### References

Solditiy linked list: https://github.com/vittominacori/solidity-linked-list/blob/master/contracts/StructuredLinkedList.sol