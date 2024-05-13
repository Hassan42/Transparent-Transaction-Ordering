const Web3  = require('web3');
const fs = require('fs');
const path = require('path');

const web3 = new Web3('http://localhost:22000');
const web3Ws = new Web3('ws://localhost:32002');
web3.eth.handleRevert = true
const workflow_contract_abi = require(path.join("../truffle/build/contracts/", "WorkflowNew" + '.json')).abi;
const workflow_contract_json = require("../truffle/build/contracts/WorkflowNew.json");
const workflow_contract_address = workflow_contract_json.networks["1337"].address;
const workflow_contract = new web3.eth.Contract(workflow_contract_abi, workflow_contract_address);
const workflow_contract_ws = new web3Ws.eth.Contract(workflow_contract_abi, workflow_contract_address);

const ordering_contract_abi = require(path.join("../truffle/build/contracts/", "ConsensusContract" + '.json')).abi;
const ordering_contract_json = require("../truffle/build/contracts/ConsensusContract.json");
const ordering_contract_address = ordering_contract_json.networks["1337"].address;
const ordering_contract = new web3.eth.Contract(ordering_contract_abi, ordering_contract_address);

const event_log = require("./eventLogNew.json");
const { connect } = require('http2');

let customers = {
    "customer1":{
        "account": new Web3('http://localhost:22000'),
        "privateKey": fs.readFileSync("../QBFT-Network/Node-0/data/keystore/accountPrivateKey").toString(),
    },
    "customer2":{
        "account": new Web3('http://localhost:22001'),
        "privateKey": fs.readFileSync("../QBFT-Network/Node-1/data/keystore/accountPrivateKey").toString(),
    },
}

let stores = {
    "store1":{
        "account": new Web3('http://localhost:22002'),
        "privateKey": fs.readFileSync("../QBFT-Network/Node-2/data/keystore/accountPrivateKey").toString(),
    },
}

let logistic_providers = {
    "logistic_provider1":{
        "account": new Web3('http://localhost:22003'),
        "privateKey": fs.readFileSync("../QBFT-Network/Node-3/data/keystore/accountPrivateKey").toString(),
    },
    "logistic_provider2":{
        "account": new Web3('http://localhost:22004'),
        "privateKey": fs.readFileSync("../QBFT-Network/Node-4/data/keystore/accountPrivateKey").toString(),
    }
}

let instances = [
    {
        customer: "customer1",
        store: "store1",
        logistic_provider: "logistic_provider1",
        cancel_true: 0,
        confirm_true: 0,
        orders_true: 0,
        cancel_executed: 0,
        confirm_executed: 0,
        orders_executed: 0,
        complete: false
    },
    {
        customer: "customer2",
        store: "store1",
        logistic_provider: "logistic_provider2",
        cancel_true: 0,
        confirm_true: 0,
        orders_true: 0,
        cancel_executed: 0,
        confirm_executed: 0,
        orders_executed: 0,
        complete: false
    }
]

let nonce = {}
let addresses = {}
let rounds = {};
let counter = 0;
let totalGas = 0;
let intervalId;
// 1. Initiate Accounts

async function create_accounts(){
    for (const customer of Object.keys(customers)) {
        const accounts = await customers[customer]["account"].eth.getAccounts();
        customers[customer]["account"] = accounts[0];
        addresses[accounts[0]] = customer;
    }
    for (const store of Object.keys(stores)) {
        const accounts = await stores[store]["account"].eth.getAccounts();
        stores[store]["account"] = accounts[0];
        addresses[accounts[0]] = store;
    }
    for (const logistic_provider of Object.keys(logistic_providers)) {
        const accounts = await logistic_providers[logistic_provider]["account"].eth.getAccounts();
        logistic_providers[logistic_provider]["account"] = accounts[0];
        addresses[accounts[0]] = logistic_provider;
    }
    console.log(addresses)
}

// 1. Create Instances

async function create_instances(){
    for (const intance of instances){
        const encodedABI = workflow_contract.methods.newInstance([customers[intance.customer]["account"],stores[intance.store]["account"],logistic_providers[intance.logistic_provider]["account"]]).encodeABI();
        const signedTx = await signTx(workflow_contract, encodedABI, customers[intance.customer]["account"], customers[intance.customer]["privateKey"]);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        const instanceNumber = await workflow_contract.methods.getInstances().call({from: customers[intance.customer]["account"]});
        intance.instanceNumber = instanceNumber;
        console.log(intance)
    }
}

async function setup(){
    //Initializing
    console.log("Setting up...")
    await create_accounts();
    await create_instances();
    set_event_listeners(workflow_contract_ws);
    ordering();
    await set_workflow_contract();
    await set_ordering_contract();
}

async function interact(event) {
    const first_intance = event[0][0];
    instances[first_intance].orders_true +=1;
    for (const instance of event) {
        const instance_id = instance[0];
        const order_sequence = instance[1];
        instances[instance_id].order_sequence = order_sequence;
        purchase_order(instances[instance_id].instanceNumber);
    }
}

async function ordering(){
    
    const checkVote = async () => {
        let orderersList = await ordering_contract.methods.orderersList().call({from: stores["store1"]["account"]});
        let canVote = await ordering_contract.methods.canVote(stores["store1"]["account"]).call({from: stores["store1"]["account"]});
        let isIsolate = await ordering_contract.methods.isIsolate().call({from: stores["store1"]["account"]});
        if (canVote) {
            clearInterval(intervalId);
            console.log("orderers:" ,orderersList);
            console.log("Voting....");
            let permittedTxs = await ordering_contract.methods.permitted_interactions(stores["store1"]["account"]).call({from: stores["store1"]["account"]});
            console.log("permitted:", permittedTxs);
            let interactions = [];
            for (const tx of permittedTxs) {
                let interaction = await ordering_contract.methods.get_interaction(tx).call({from: stores["store1"]["account"]});
                const instance = findInstanceByNumber(interaction.instance);

                if(interaction.task == "purchaseOrder"){
                    const orders = instance.orders_executed;
                    interactions.push([interaction, orders]);
                }
                else if (interaction.task == "cancelOrder"){
                    interactions.push([interaction,instance.cancel_executed]);
                }
                else if (interaction.task == "confirmShipping"){
                    interactions.push([interaction, instance.confirm_executed]);
                }
                else{
                    interactions.push([interaction, 0]);
                }
            }

            interactions = interactions.sort(function(a, b) {
                return a[1] - b[1];
            });

            let sortedInteractions = interactions.map((arr)=>arr[0].id);
            
            console.log("Sorted interactions: ", sortedInteractions);

            await vote_order(sortedInteractions);
            
            intervalId = setInterval(checkVote, 5000);
        }
        else if (isIsolate){
            console.log("Isolated")
            clearInterval(intervalId);
            await release();
            intervalId = setInterval(checkVote, 5000);
        }
    };

    intervalId = setInterval(checkVote, 5000);
        
}

const set_event_listeners = (contract) => {
    const event_task_executed = 'taskExecuted';
    const event_task_enabled = 'taskEnabled';

    contract.events[event_task_enabled]({
        fromBlock: 'latest'
    }).on('data', async function(event){
        const instance_id = event.returnValues.instanceID;
        const instance = findInstanceByNumber(instance_id);
        const taskName = event.returnValues.taskName;

        if(taskName == "deliveryDetails"){
            delivery_details(instance_id);
        }

        else if(taskName == "insufficientSupplies"){
            insufficient_supplies(instance_id);
        }

        else if(taskName == "itemDelivered"){
            console.log("item delivered open")
            item_delivered(instance_id);
        }
    }).on('error', console.error); 


    contract.events[event_task_executed]({
        fromBlock: 'latest'
    }).on('data', async function(event){
        const instance_id = event.returnValues.instanceID;
        const instance = findInstanceByNumber(instance_id);
        const taskName = event.returnValues.taskName;

        if(taskName == "deliveryDetails"){
            instance.orders_executed +=1;
            if(instance.order_sequence[0] == 1){
                confirm_shipping(instance_id);
                cancel_order(instance_id);
                instance.confirm_true +=1;
            }
            else{
                cancel_order(instance_id);
                confirm_shipping(instance_id);
                instance.cancel_true +=1;
            }
        }
        else if(taskName == "purchaseOrder"){
            console.log("purchased")
        }
        else if(taskName == "cancelOrder"){
            instance.cancel_executed +=1;
            instance.complete = true;
        }
        else if(taskName == "confirmShipping"){
            instance.confirm_executed +=1;
        }
        else if(taskName == "itemDelivered"){
            instance.complete = true;
        }
        else if(taskName == "insufficientSupplies"){
            instance.complete = true;
        }
    }).on('error', console.error);
}

const purchase_order = async (instanceNumber) => {
    console.log("Purchase order sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = ordering_contract.methods.submit_interaction(instanceNumber, "purchaseOrder").encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, customers[instance.customer]["account"], customers[instance.customer]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction).on('error', function(error){ console.log("Purchase order failed") });
    totalGas += receipt.gasUsed;
    }
    catch(e){
        console.log("Purchase Failed", instanceNumber)
        console.log(e.reason)
        instance.complete = true;
    }
}

const cancel_order = async (instanceNumber) => {
    console.log("Cancel order sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = ordering_contract.methods.submit_interaction(instanceNumber, "cancelOrder").encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, customers[instance.customer]["account"], customers[instance.customer]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction).on('error', function(error){ console.log("Cancel order failed") });
    totalGas += receipt.gasUsed;
    }
    catch(e){
        console.log("Cancel Failed", instanceNumber)
        instance.complete = true;
    }
}

const insufficient_supplies = async (instanceNumber) => {
    console.log("Insufficient supplies sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = ordering_contract.methods.submit_interaction(instanceNumber, "insufficientSupplies").encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, stores[instance.store]["account"], stores[instance.store]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;
    } catch(e){
        console.log("Insufficient supplies Failed", instanceNumber)
        instance.complete = true;
    }
}

const delivery_details = async (instanceNumber) => {
    console.log("Delivery detail sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = ordering_contract.methods.submit_interaction(instanceNumber, "deliveryDetails").encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, stores[instance.store]["account"], stores[instance.store]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;
    } catch(e){
        console.log("Delivery detail failed.", instanceNumber)
        instance.complete = true;
    }
}

const confirm_shipping = async (instanceNumber) => {
    console.log("Confirm shipping sent", instanceNumber);
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = ordering_contract.methods.submit_interaction(instanceNumber, "confirmShipping").encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, logistic_providers[instance.logistic_provider]["account"], logistic_providers[instance.logistic_provider]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction).on('error', function(error){ console.log("Confirm shipping failed") });
    totalGas += receipt.gasUsed;
    }
    catch(e){
        console.log("Confirm shipping failed.", instanceNumber)
        instance.complete = true;
    }
}

const item_delivered = async (instanceNumber) => {
    console.log("Item delivered sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = ordering_contract.methods.submit_interaction(instanceNumber, "itemDelivered").encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, logistic_providers[instance.logistic_provider]["account"], logistic_providers[instance.logistic_provider]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;
    }
    catch(e){
        console.log("Delivery Failed", instanceNumber)
        instance.complete = true;
    }
}

const reset_supplies = async (supplies) => {
    console.log("Rest supplies sent")
    const encodedABI = workflow_contract.methods.resetSupplies(1).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, stores["store1"]["account"], stores["store1"]["privateKey"]);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}

const vote_order = async (sortedInteractions) => {
    const encodedABI = ordering_contract.methods.order_interactions(sortedInteractions).encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, stores["store1"]["account"], stores["store1"]["privateKey"]);
    try{
    const orderingReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += orderingReceipt.gasUsed;
    console.log("voted");
    }
    catch(error){
        console.log("Voting Failed...", error);
    }
}

const set_workflow_contract = async () => {
    const encodedABI = ordering_contract.methods.setWorkflow(workflow_contract.options.address).encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, stores["store1"]["account"], stores["store1"]["privateKey"]);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    return receipt;
};

const set_ordering_contract = async () => {
    const encodedABI = workflow_contract.methods.setOrderingContract(ordering_contract.options.address).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, stores["store1"]["account"], stores["store1"]["privateKey"]);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    return receipt;
};

const findInstanceByNumber = (instanceNumber) => {
    for (let instance of instances) {
        if (instance.instanceNumber === instanceNumber) {
            return instance;
        }
    }
}

const waitForRoundComplete = () => {

    const checkCompletion = () => {
        for (let instance of instances) {
            if (instance.complete !== true) {
                return false;
            }
        }

        return true;
    }

    return new Promise(resolve => {

      if (checkCompletion()) {
        resolve();
      } else {
        const checkVariable = () => {
          if (checkCompletion()) {
            clearInterval(intervalId); 
            resolve(); 
          }
        };
        
        const intervalId = setInterval(checkVariable, 50); 
      }
    });
}

const signTx = async (contract, txData, sender, privateKey) => {
    await increase_nonce(sender);
    var tx = {
        from: sender,
        to: contract.options.address,
        gas: 300000000,
        data: txData,
        nonce: nonce[sender]
    };
    return await web3.eth.accounts.signTransaction(tx, privateKey);
}

const resetState = async () => {
    for (let instance of instances) {
        instance.complete = false;
    }
    await reset_supplies(1);
    totalGas = 0;
    //reset supplies;
}

const release = async () =>{
    const encodedABI = ordering_contract.methods.release().encodeABI();
    const signedTx = await signTx(ordering_contract, encodedABI, stores["store1"]["account"], stores["store1"]["privateKey"]);
    try{
    const releaseReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += releaseReceipt.gasUsed;
    }
    catch(error){
        console.log("Release Failed...");
    }
}

const increase_nonce = async (address) => {
    if(!nonce[address]){
        nonce[address] = await web3.eth.getTransactionCount(address);
    }
    else{
        nonce[address] +=1;
    }
}

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
};

setup().then(async ()=>{
    const startTimeGlobal = performance.now();
    const firstBlock = await web3.eth.getBlockNumber();
    for (let i = 0; i < event_log.length; i++) {
        const event = event_log[i].slice(0,2);
        let startTime = performance.now();
        await interact(event);
        await waitForRoundComplete();
        let endTime = performance.now();
        rounds[counter] = {
            startTime: startTime,
            endTime: endTime,
            totalTime: endTime - startTime,
            orders: [instances[0].orders_executed, instances[1].orders_executed],
            deferred: [[instances[0].cancel_executed, instances[0].confirm_executed], [instances[1].cancel_executed, instances[1].confirm_executed]],
            totalGas: totalGas
        };
        counter++;
        await resetState();
        if(event_log[i][2] == 0){console.log("One block delay....");await delay(5000);}
        console.log("Round:", counter);
        console.log(instances);
    }
    const endTimeGlobal = performance.now();
    const lastBlock = await web3.eth.getBlockNumber(); 
    rounds.firstBlock = firstBlock;
    rounds.lastBlock = lastBlock;
    rounds.totalTime = endTimeGlobal - startTimeGlobal;
    const rounds_json = JSON.stringify(rounds);
    fs.writeFileSync('rounds_ordering_process.json', rounds_json);
    console.log(instances);
})