pragma solidity ^0.8.0;

interface WorkflowNewInterface {

    function newInstance(address[] calldata participant) external;

    function purchaseOrder(uint _instanceID) external;

    function insufficientSupplies(uint _instanceID) external;

    function deliveryDetails(uint _instanceID) external;

    function confirmShipping(uint _instanceID) external;

    function cancelOrder(uint _instanceID) external;

    function itemDelivered(uint _instanceID) external;

    function getParticipantsByTask(uint instance, string memory task_name) external view returns(address[] memory);

    function getInstances() external view returns(uint);

    function resetSupplies(uint _supplies) external;

    function setOrderingContract(address orderingContractAddress) external;
}