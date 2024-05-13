pragma solidity ^0.8.0;


interface workflowInterface {

    function newInstance(address[] calldata participant) external;
    function requestOrder(uint _instanceID) external;
    function confirmOrder(uint _instanceID) external;
    function requestSupplies(uint _instanceID) external;
    function provideSupplies(uint _instanceID) external;
    function insufficientSupplies(uint _instanceID) external;
    function cancelOrder(uint _instanceID) external;
}