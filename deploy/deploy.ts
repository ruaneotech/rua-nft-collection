import { ethers, upgrades } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const RuaNFT = await ethers.getContractFactory("RuaNFT");
	const ruaNFT = await upgrades.deployProxy(RuaNFT, [
    process.env.PRICE,
    process.env.MAX_SUPPLY_FOR_CURRENT_PHASE,
    process.env.PAUSED,
    process.env.PAYMENT_METHOD
	]);
	await ruaNFT.deployed();
	console.log("NeoTech deployed to:", ruaNFT.address);
};

export default func;
func.tags = ["RuaNFT"];