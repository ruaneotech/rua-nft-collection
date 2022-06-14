import chai, { should } from "chai";
import chaiAsPromised from "chai-as-promised";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import type * as ethersTypes from "ethers";

chai.use(chaiAsPromised);
should();

describe("RuaNFT", function () {

  const PRICE = process.env.PRICE ? process.env.PRICE : "0";

  let owner: SignerWithAddress;
  let giveawayWinner: SignerWithAddress;
  let userWithUSDT: SignerWithAddress;

  let ruaToken: ethersTypes.Contract;
  let usdtToken: ethersTypes.Contract;

  before(async function () {
		[owner, giveawayWinner, userWithUSDT] = await ethers.getSigners();
	});

  beforeEach(async () => {
      const USDTest = await ethers.getContractFactory("USDTest");
      usdtToken = await USDTest.connect(owner).deploy("1000");
      await usdtToken.transfer(userWithUSDT.address, "1000");

      const RuaNFT = await ethers.getContractFactory("RuaNFT");
      
      ruaToken = await upgrades.deployProxy(RuaNFT, [
          PRICE,
          1,
          true,
          usdtToken.address
          //"0xdAC17F958D2ee523a2206206994597C13D831ec7"
      ]);
      
      ruaToken = await ethers.getContractAt(
        "RuaNFT",
        ruaToken.address
      );

      await ruaToken.transferOwnership(owner.address);
  });

  it("Should mint 15 NFTs", async function () {

    // try to mint when the contract is paused
    await ruaToken.connect(userWithUSDT).mint(1).should.be.rejectedWith("Contract is paused.");
    // try to un-pause the contract when not the owner
    await ruaToken.connect(userWithUSDT).setPaused(false).should.be.rejectedWith("Ownable: caller is not the owner");

    // mint 5 NFTs while contract is paused using mintTeam()
    console.log(
      giveawayWinner.address + " balance before team mint - "
                + await usdtToken.balanceOf(giveawayWinner.address) + "$USDT, "+
                + await ruaToken.balanceOf(giveawayWinner.address) + "NFTs."
    );
    await ruaToken.connect(owner).mintTeam(giveawayWinner.address, 5).should.be.fulfilled;
    console.log(
      giveawayWinner.address + " balance after team mint - "
                + await usdtToken.balanceOf(giveawayWinner.address) + "$USDT, "+
                + await ruaToken.balanceOf(giveawayWinner.address) + "NFTs.\n"
    );

    // un-pause the contract as owner
    await ruaToken.connect(owner).setPaused(false).should.be.fulfilled;
    // try to mint an NFT when the current phase is already reached
    await ruaToken.connect(userWithUSDT).mint(1).should.be.rejectedWith("Minted tokens would exceed supply allocated for the current phase.");

    // try to increase the phase max limit when not the owner 
    await ruaToken.connect(userWithUSDT).setMaxSupplyForCurrentPhase(15).should.be.rejectedWith("Ownable: caller is not the owner");
    // increase the phase max limit as owner
    await ruaToken.connect(owner).setMaxSupplyForCurrentPhase(15).should.be.fulfilled;  
    
    // try to withdraw when not the owner
    await ruaToken.connect(userWithUSDT).withdrawERC20(usdtToken.address, owner.address).should.be.rejectedWith("Ownable: caller is not the owner");
    await ruaToken.connect(userWithUSDT).withdraw(owner.address).should.be.rejectedWith("Ownable: caller is not the owner");
    // try to withdraw when zero balance
    await ruaToken.connect(owner).withdrawERC20(usdtToken.address, owner.address).should.be.rejectedWith("No tokens left to withdraw");
    await ruaToken.connect(owner).withdraw(owner.address).should.be.rejectedWith("No ether left to withdraw");

    console.log(
      userWithUSDT.address + " balance before mint - "
                + await usdtToken.balanceOf(userWithUSDT.address) + "$USDT, "+
                + await ruaToken.balanceOf(userWithUSDT.address) + "NFTs."
    );
    // give allowance to spend 1000 USDT, amount needed for buying 10 NFTs
    await usdtToken.connect(userWithUSDT).approve(ruaToken.address, 1000);
    // mint 10 Rua NFTs
    await ruaToken.connect(userWithUSDT).mint(10).should.be.fulfilled;

    console.log(
        userWithUSDT.address + " balance after mint - "
                + await usdtToken.balanceOf(userWithUSDT.address) + "$USDT, "+
                + await ruaToken.balanceOf(userWithUSDT.address) + "NFTs.\n"
    );

     // try to mint an NFT when the current phase is already reached
    await ruaToken.connect(userWithUSDT).mint(1).should.be.rejectedWith("Minted tokens would exceed supply allocated for the current phase.");  
    
    console.log(
      userWithUSDT.address + " balance before withdraw - "
              + await usdtToken.balanceOf(owner.address) + "$USDT"
    );
    await ruaToken.connect(owner).withdrawERC20(usdtToken.address, owner.address).should.be.fulfilled;
    console.log(
      userWithUSDT.address + " balance after widraw - "
              + await usdtToken.balanceOf(owner.address) + "$USDT"
    );

    // try to set base uri when not the owner 
    await ruaToken.connect(userWithUSDT).setBaseURI('https://api.rua.test/nft/').should.be.rejectedWith("Ownable: caller is not the owner");
    // set base uri as owner 
    await ruaToken.connect(owner).setBaseURI('https://api.rua.test/nft/').should.be.fulfilled;
    // get token uri for the first token
    (await ruaToken.connect(userWithUSDT).tokenURI(1)).should.be.equal("https://api.rua.test/nft/1");
  });
});
