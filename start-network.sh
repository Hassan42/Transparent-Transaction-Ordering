#!/bin/bash

echo "Starting the network:"

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# Number of instances you want to start
NUM_INSTANCES=5
MODE=$1
GENSIS=${parent_path}/QBFT-Network/artifacts/besu/genesis.json

# Read the alloc key from the JSON file
alloc=$(jq -r '.alloc' "$GENSIS")
buyer2_address=$(echo "$alloc" | jq -r 'keys_unsorted[]' | sed -n '2p')
log1_address=$(echo "$alloc" | jq -r 'keys_unsorted[]' | sed -n '4p')

for ((i=0; i<$NUM_INSTANCES; i++)); do

    if [ "$i" -eq 0 ]; then
        echo "$buyer2_address,$log1_address" > censor_target.txt
        ARGUMENT="$1"
    elif [ "$i" -eq 4 ]; then
        echo "$buyer2_address" > censor_target.txt
        ARGUMENT="$1"
    else
        ARGUMENT="quorum"
    fi

    ./start-validator.sh "Node-$i" "$ARGUMENT" 
        
    sleep 5

    echo ">Node-$i Started."
done

# Release the shell
disown