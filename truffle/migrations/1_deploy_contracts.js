const Workflow = artifacts.require("Workflow");
const WorkflowNew = artifacts.require("WorkflowNew");
const WorkflowOld = artifacts.require("WorkflowOld");
const StructuredLinkedList = artifacts.require("StructuredLinkedList");
const ConsensusContract = artifacts.require("ConsensusContract");

module.exports = function(deployer) {
  deployer.deploy(Workflow);
  deployer.deploy(WorkflowOld);
  deployer.deploy(WorkflowNew);
  deployer.deploy(StructuredLinkedList);
  deployer.link(StructuredLinkedList, ConsensusContract);
  deployer.deploy(ConsensusContract);
};
