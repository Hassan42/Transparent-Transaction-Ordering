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

let customers = {
    "customer1":{
        "account": new Web3('http://localhost:22000'),
        "privateKey": fs.readFileSync("../QBFT-Network/Node-0/data/keystore/accountPrivateKey").toString(),
    },
    "customer2":{
        "account": new Web3('http://localhost:22001'),
        "privateKey": fs.readFileSync("../QBFT-Network/Node-1/data/keystore/accountPrivateKey").toString(),
    }
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
let rounds = {};
let counter = 0;
let totalGas = 0;
// 1. Initiate Accounts

async function create_accounts(){
    for (const customer of Object.keys(customers)) {
        const accounts = await customers[customer]["account"].eth.getAccounts();
        customers[customer]["account"] = accounts[0];
    }
    for (const store of Object.keys(stores)) {
        const accounts = await stores[store]["account"].eth.getAccounts();
        stores[store]["account"] = accounts[0];
    }
    for (const logistic_provider of Object.keys(logistic_providers)) {
        const accounts = await logistic_providers[logistic_provider]["account"].eth.getAccounts();
        logistic_providers[logistic_provider]["account"] = accounts[0];
    }
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
    // await set_workflow_contract();
    // await set_ordering_contract();
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
            if(instance.order_sequence[0] == 0){
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
    const encodedABI = workflow_contract.methods.purchaseOrder(instanceNumber).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, customers[instance.customer]["account"], customers[instance.customer]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction).on('error', function(error){ console.log("Purchase order failed") });
    totalGas += receipt.gasUsed;
    }
    catch(e){
        console.log("Purchase Failed", instanceNumber)
    }
}

const cancel_order = async (instanceNumber) => {
    console.log("Cancel order sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = workflow_contract.methods.cancelOrder(instanceNumber).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, customers[instance.customer]["account"], customers[instance.customer]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;}
    catch(e){
        console.log("cancel failed");
    }
}

const insufficient_supplies = async (instanceNumber) => {
    console.log("Insufficient supplies sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = workflow_contract.methods.insufficientSupplies(instanceNumber).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, stores[instance.store]["account"], stores[instance.store]["privateKey"]);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;
}

const delivery_details = async (instanceNumber) => {
    console.log("Delivery detail sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = workflow_contract.methods.deliveryDetails(instanceNumber).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, stores[instance.store]["account"], stores[instance.store]["privateKey"]);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;
}

const confirm_shipping = async (instanceNumber) => {
    console.log("Confirm shipping sent", instanceNumber);
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = workflow_contract.methods.confirmShipping(instanceNumber).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, logistic_providers[instance.logistic_provider]["account"], logistic_providers[instance.logistic_provider]["privateKey"]);
    try{
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;}
    catch(e){
        console.log("confirm failed");
    }
    
}

const item_delivered = async (instanceNumber) => {
    console.log("Item delivered sent", instanceNumber)
    const instance = findInstanceByNumber(instanceNumber);
    const encodedABI = workflow_contract.methods.itemDelivered(instanceNumber).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, logistic_providers[instance.logistic_provider]["account"], logistic_providers[instance.logistic_provider]["privateKey"]);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    totalGas += receipt.gasUsed;
}

const reset_supplies = async (supplies) => {
    console.log("Rest supplies sent")
    const encodedABI = workflow_contract.methods.resetSupplies(1).encodeABI();
    const signedTx = await signTx(workflow_contract, encodedABI, stores["store1"]["account"], stores["store1"]["privateKey"]);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}

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
    const current_nonce = await web3.eth.getTransactionCount(sender);
    if(nonce[sender] == current_nonce){
        nonce[sender] +=1;
    }else{
        nonce[sender] = current_nonce;
    } // increase nonce in case of concurrent transactions
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

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
};

setup().then(async ()=>{
    const startTimeGlobal = performance.now();
    const firstBlock = await web3.eth.getBlockNumber();
    for (let i = 0; i < event_log.length; i++) {
        const event = event_log[i].slice(0,2);
        const startTime = performance.now();
        await interact(event);
        await waitForRoundComplete();
        const endTime = performance.now();
        rounds[counter] = {
            startTime: startTime,
            endTime: endTime,
            totalTime: endTime - startTime,
            orders: [instances[0].orders_executed, instances[1].orders_executed],
            deferred: [[instances[0].cancel_executed, instances[0].confirm_true], [instances[1].cancel_executed, instances[1].confirm_true]],
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
    fs.writeFileSync('rounds_plain_process.json', rounds_json);
    console.log(instances);
})