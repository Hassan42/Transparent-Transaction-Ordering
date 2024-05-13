pragma solidity >=0.4.16 <0.9.0;

contract WorkflowNew{

    address public orderingContract;

    mapping(string=>string[]) rolesToTask;
    
    struct workflowInstance{
        uint workflowID;
        mapping(string=>bool) tasks_state;
        mapping(string=>address) participants;
    }
    mapping(uint => workflowInstance) instances;
    uint public instancesCount;
    uint supplies = 1;

    event taskEnabled(uint instanceID, string taskName);
    event taskExecuted(uint instanceID, string taskName);
    event suppliesReset(uint instanceID);

    constructor() public {
        rolesToTask["purchaseOrder"] = ["Customer","Store"];
        rolesToTask["insufficientSupplies"] = ["Store","Customer"];
        rolesToTask["deliveryDetails"] = ["Store","Delivery"];
        rolesToTask["confirmShipping"] = ["Delivery","Store"];
        rolesToTask["cancelOrder"] = ["Customer","Store"];
        rolesToTask["itemDelivered"] = ["Delivery","Customer"];
    }

    function newInstance(address[] calldata participant) external {
        instancesCount++;
        instances[instancesCount].tasks_state["purchaseOrder"] = true;
        instances[instancesCount].participants["Customer"] = participant[0];
        instances[instancesCount].participants["Store"] = participant[1];
        instances[instancesCount].participants["Delivery"] = participant[2];
    }

    function purchaseOrder(uint _instanceID) external{
        require(instances[_instanceID].tasks_state["purchaseOrder"] == true);

        if (supplies > 0)
        {
            supplies -=1;
            instances[_instanceID].tasks_state["deliveryDetails"] = true;
            emit taskEnabled(_instanceID, "deliveryDetails");
        }

        else
        {
            instances[_instanceID].tasks_state["insufficientSupplies"] = true;
            emit taskEnabled(_instanceID, "insufficientSupplies");
        }

        instances[_instanceID].tasks_state["purchaseOrder"] = false;
        emit taskExecuted(_instanceID, "purchaseOrder");
    }

    function insufficientSupplies(uint _instanceID) external{
        require(instances[_instanceID].tasks_state["insufficientSupplies"] == true);

        instances[_instanceID].tasks_state["insufficientSupplies"] = false;
        emit taskExecuted(_instanceID, "insufficientSupplies");

        instances[_instanceID].tasks_state["purchaseOrder"] = true; //reset process
    }

    function deliveryDetails(uint _instanceID) external{
        require(instances[_instanceID].tasks_state["deliveryDetails"] == true);

        instances[_instanceID].tasks_state["confirmShipping"] = true;
        instances[_instanceID].tasks_state["cancelOrder"] = true;
        emit taskEnabled(_instanceID, "confirmShipping");
        emit taskEnabled(_instanceID, "cancelOrder");

        instances[_instanceID].tasks_state["deliveryDetails"] = false;
        emit taskExecuted(_instanceID, "deliveryDetails");
    }

    function confirmShipping(uint _instanceID) external{
        require(instances[_instanceID].tasks_state["confirmShipping"] == true);

        instances[_instanceID].tasks_state["itemDelivered"] = true;
        emit taskEnabled(_instanceID, "itemDelivered");

        instances[_instanceID].tasks_state["cancelOrder"] = false;

        instances[_instanceID].tasks_state["confirmShipping"] = false;
        emit taskExecuted(_instanceID, "confirmShipping");
    }

    function cancelOrder(uint _instanceID) external{
        require(instances[_instanceID].tasks_state["cancelOrder"] == true);

        instances[_instanceID].tasks_state["cancelOrder"] = false;
        emit taskExecuted(_instanceID, "cancelOrder");

        instances[_instanceID].tasks_state["confirmShipping"] = false;

        instances[_instanceID].tasks_state["purchaseOrder"] = true; //reset process
    }

    function itemDelivered(uint _instanceID) external{
        require(instances[_instanceID].tasks_state["itemDelivered"] == true);

        instances[_instanceID].tasks_state["itemDelivered"] = false;
        emit taskExecuted(_instanceID, "itemDelivered");

        instances[_instanceID].tasks_state["purchaseOrder"] = true; //reset process
    }

    function getParticipantsByTask(uint instance, string memory task_name) external view returns(address[] memory){
        require(instances[instance].tasks_state[task_name] == true);
        address[] memory participants = new address[](2);
        string[] memory roles = rolesToTask[task_name];
        participants[0] = instances[instance].participants[roles[0]];
        participants[1] = instances[instance].participants[roles[1]];
        return participants;
    }

    function getInstances() external view returns(uint){
        return instancesCount;
    }

    function resetSupplies(uint _supplies) external{
        supplies = _supplies;
        emit suppliesReset(_supplies);
    }

    function resetState(uint instance) external{
        instances[instance].tasks_state["purchaseOrder"] = true;
        instances[instance].tasks_state["insufficientSupplies"] = false;
        instances[instance].tasks_state["deliveryDetails"] = false;
        instances[instance].tasks_state["confirmShipping"] = false;
        instances[instance].tasks_state["cancelOrder"] = false;
        instances[instance].tasks_state["itemDelivered"] = false;
    }

    function setOrderingContract(address orderingContractAddress) external{
        orderingContract = orderingContractAddress;
    }
}
