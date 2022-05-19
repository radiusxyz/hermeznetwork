const {
  ethers
} = require("hardhat");
const {
  expect
} = require("chai");

const {
  time
} = require("@openzeppelin/test-helpers");
const {
  BigNumber
} = require("ethers");

const COORDINATOR_1_URL = "https://hermez.io";
const bootCoordinatorURL = "https://boot.coordinator.io";

const BLOCKS_PER_SLOT = 40;
const DEADLINE_BLOCKS = 20;
const TIMEOUT = 30000;
const MIN_BLOCKS = 81;


let ABIbid = [
  "function bid(uint128 slot, uint128 bidAmount)",
  "function multiBid(uint128 startingSlot,uint128 endingSlot,bool[6] slotEpoch,uint128 maxBid,uint128 minBid)",
];
let iface = new ethers.utils.Interface(ABIbid);

describe("Auction Protocol", function() {
  this.timeout(40000);

  let hardhatHEZToken;
  let hardhatHermezAuctionProtocol;
  let owner,
    coordinator1,
    forger1,
    coordinator2,
    forger2,
    registryFunder,
    hermezRollup,
    bootCoordinator,
    governance;
  let bootCoordinatorAddress,
    governanceAddress,
    hermezRollupAddress,
    donationAddress;

  // Deploy
  before(async function() {
    const HEZToken = await ethers.getContractFactory("HEZTokenMockFake");

    [
      owner,
      coordinator1,
      forger1,
      coordinator2,
      producer2,
      registryFunder,
      hermezRollup,
      governance,
      donation,
      bootCoordinator,
      deadlineCoordinator,
      ...addrs
    ] = await ethers.getSigners();

    bootCoordinatorAddress = await bootCoordinator.getAddress();
    governanceAddress = await governance.getAddress();
    hermezRollupAddress = await hermezRollup.getAddress();
    donationAddress = await donation.getAddress();
    coordinator1Address = await coordinator1.getAddress();

    hardhatHEZToken = await HEZToken.deploy(await owner.getAddress());

    await hardhatHEZToken.deployed();
    // Send tokens to coordinators addresses
    await hardhatHEZToken
      .connect(owner)
      .transfer(
        await coordinator1.getAddress(),
        ethers.utils.parseEther("10000000")
      );

    await hardhatHEZToken
      .connect(owner)
      .transfer(
        await coordinator2.getAddress(),
        ethers.utils.parseEther("10000000")
      );
  });

  beforeEach(async function() {
    const HermezAuctionProtocol = await ethers.getContractFactory(
      "HermezAuctionProtocol"
    );

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    hardhatHermezAuctionProtocol = await HermezAuctionProtocol.deploy();
    await hardhatHermezAuctionProtocol.deployed();

    let current = await time.latestBlock();
    time.advanceBlock();
    let latest = (await time.latestBlock()).toNumber();
    while (current >= latest) {
      sleep(100);
      latest = (await time.latestBlock()).toNumber();
    }

    await hardhatHermezAuctionProtocol.hermezAuctionProtocolInitializer(
      hardhatHEZToken.address,
      latest + MIN_BLOCKS,
      hermezRollupAddress,
      governanceAddress,
      donationAddress,
      bootCoordinatorAddress,
      bootCoordinatorURL
    );

    for( let i = 0; i < 6; i++) {
      await hardhatHermezAuctionProtocol
        .connect(governance)
        .changeDefaultSlotSetBid(i, ethers.utils.parseEther("10"));
    }
  });

  describe("Forge process", function() {
    beforeEach(async function() {
      // Register Coordinator
      await hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .setCoordinator(await forger1.getAddress(), COORDINATOR_1_URL);
      await hardhatHEZToken.connect(coordinator1).approve(hardhatHermezAuctionProtocol.address, ethers.BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"));

    });

    it("shouldn't be able to forge before the auction starts", async function() {
      let genesis = await hardhatHermezAuctionProtocol.genesisBlock();
      await expect(
        hardhatHermezAuctionProtocol.canForge(
          bootCoordinatorAddress,
          genesis.sub(1)
        )
      ).to.be.revertedWith("HermezAuctionProtocol::canForge AUCTION_NOT_STARTED");
    });

    it("shouldn't be able to forge a block higher than 2^128", async function() {
      await expect(
        hardhatHermezAuctionProtocol.canForge(
          bootCoordinatorAddress,
          ethers.BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")
        )
      ).to.be.revertedWith("HermezAuctionProtocol::canForge WRONG_BLOCKNUMBER");
    });

    it("bootCoordinator should be able to forge (no biddings)", async function() {
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          bootCoordinatorAddress,
          startingBlock
        )
      ).to.be.equal(true);
    });

    it("Anyone should be able to forge if slotDeadline exceeded", async function() {
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          governanceAddress,
          startingBlock.toNumber() + 20
        )
      ).to.be.equal(true);
    });

    it("The winner should be able to forge", async function() {
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      let amount = ethers.utils.parseEther("100");
      let bid = ethers.utils.parseEther("11");
      let slotMin = 3;
      let slotMax = 8;
      let permit = ethers.utils.toUtf8Bytes("");
      let slotSet = [true, true, true, true, true, true];

      await
      hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .processMultiBid(amount, slotMin, slotMax, slotSet, bid, bid, permit);

      let block = startingBlock.add(3 * BLOCKS_PER_SLOT);
      // Check forger address
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          await forger1.getAddress(),
          block
        )
      ).to.be.equal(true);
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          bootCoordinatorAddress,
          block
        )
      ).to.be.equal(false);
    });

    it("bootCoordinator should be able to forge if bidAmount less than minBid", async function() {
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      let amount = ethers.utils.parseEther("100");
      let bid = ethers.utils.parseEther("11");
      let slotMin = 3;
      let slotMax = 8;
      let permit = ethers.utils.toUtf8Bytes("");
      let slotSet = [true, true, true, true, true, true];

      await
      hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .processMultiBid(amount, slotMin, slotMax, slotSet, bid, bid, permit);

      for (i = 0; i < 6; i++) {
        // Change epochs minBid
        await hardhatHermezAuctionProtocol
          .connect(governance)
          .changeDefaultSlotSetBid(i, ethers.utils.parseEther("123456789"));
      }

      // Check forger address
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          governanceAddress,
          startingBlock.add(3 * BLOCKS_PER_SLOT)
        )
      ).to.be.equal(false);
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          bootCoordinatorAddress,
          startingBlock.add(3 * BLOCKS_PER_SLOT)
        )
      ).to.be.equal(true);

      // Advance blocks
      let blockNumber = startingBlock.add(3 * BLOCKS_PER_SLOT).toNumber();
      time.advanceBlockTo(blockNumber);
      while (blockNumber > (await time.latestBlock()).toNumber()) {
        sleep(100);
      }

      let forgerAddress = await coordinator1.getAddress();
      let prevBalance = await hardhatHermezAuctionProtocol.getClaimableHEZ(
        forgerAddress
      );
      // BootCoordinator forge
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(bootCoordinatorAddress);

      let postBalance = await hardhatHermezAuctionProtocol.getClaimableHEZ(
        forgerAddress
      );
      // Check forgerAddress balances
      expect(postBalance).to.be.equal(
        prevBalance.add(ethers.utils.parseEther("11"))
      );
      expect(prevBalance.add(ethers.utils.parseEther("11"))).to.be.equal(
        postBalance
      );
    });

    it("shouldn't be able to forge unless it's called by Hermez rollup", async function() {
      await expect(
        hardhatHermezAuctionProtocol
          .connect(bootCoordinator)
          .forge(bootCoordinatorAddress)
      ).to.be.revertedWith("HermezAuctionProtocol::forge: ONLY_HERMEZ_ROLLUP");
    });

    it("shouldn't be able to forge unless it's the bootcoordinator or the winner", async function() {
      // Advance Blocks
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      let blockNumber = startingBlock.add(3 * BLOCKS_PER_SLOT).toNumber();
      time.advanceBlockTo(blockNumber);
      while (blockNumber > (await time.latestBlock()).toNumber()) {
        sleep(100);
      }
      // Check that governance HermezAuctionProtocol::forge: CANNOT_FORGE
      await expect(
        hardhatHermezAuctionProtocol
          .connect(hermezRollup)
          .forge(governanceAddress)
      ).to.be.revertedWith("HermezAuctionProtocol::forge: CANNOT_FORGE");
    });

    it("should be able to forge (bootCoordinator)", async function() {
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      // Event NewForge
      let eventNewForge = new Promise((resolve, reject) => {
        filter = hardhatHermezAuctionProtocol.filters.NewForge();
        hardhatHermezAuctionProtocol.on(filter, (forger, slotToForge) => {
          expect(forger).to.be.equal(bootCoordinatorAddress);
          hardhatHermezAuctionProtocol.removeAllListeners();
          resolve();
        });

        // After 10s, we throw a timeout error
        setTimeout(() => {
          reject(new Error("timeout while waiting for event"));
        }, TIMEOUT);
      });
      // Advance blocks
      const slotNum = 3;
      let blockNumber = startingBlock.add(slotNum * BLOCKS_PER_SLOT).toNumber(); 

      time.advanceBlockTo(blockNumber);
      while (blockNumber > (await time.latestBlock()).toNumber()) {
        sleep(100);
      }

      const SlotStateBefore = await hardhatHermezAuctionProtocol.slots(slotNum);

      expect(SlotStateBefore.fulfilled).to.be.equal(false);
      expect(SlotStateBefore.forgerCommitment).to.be.equal(false);
      expect(SlotStateBefore.bidder).to.be.equal("0x0000000000000000000000000000000000000000");
      expect(SlotStateBefore.bidAmount).to.be.equal(0);

      // Forge
      await expect(hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(bootCoordinatorAddress)
      ).to.emit(hardhatHermezAuctionProtocol, "NewForge")
        .withArgs(bootCoordinatorAddress, slotNum);
      await eventNewForge;

      const SlotStateAfter = await hardhatHermezAuctionProtocol.slots(slotNum);

      expect(SlotStateAfter.fulfilled).to.be.equal(true);
      expect(SlotStateAfter.forgerCommitment).to.be.equal(true);

      // slots[slotToForge].forgerCommitment;
      // forgerCommitment;
    });

    it("Winner should be able to forge", async function() {
      let producer1Address = await forger1.getAddress();
      let bidAmount = ethers.utils.parseEther("11");
      // Event NewForgeAllocated
      let eventNewForgeAllocated = new Promise((resolve, reject) => {
        filter = hardhatHermezAuctionProtocol.filters.NewForgeAllocated();
        hardhatHermezAuctionProtocol.on(
          filter,
          (
            bidder,
            forger,
            slotToForge,
            burnAmount,
            donationAmount,
            governanceAmount
          ) => {
            expect(forger).to.be.equal(producer1Address);
            expect(burnAmount).to.be.equal(bidAmount.mul(40).div(100));
            expect(donationAmount).to.be.equal(bidAmount.mul(40).div(100));
            expect(governanceAmount).to.be.equal(bidAmount.mul(20).div(100));
            hardhatHermezAuctionProtocol.removeAllListeners();
            resolve();
          }
        );

        // After 10s, we throw a timeout error
        setTimeout(() => {
          reject(new Error("timeout while waiting for event"));
        }, TIMEOUT);
      });

      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();

      let amount = ethers.utils.parseEther("100");
      let bid = ethers.utils.parseEther("11");
      let slotMin = 3;
      let slotMax = 8;
      let permit = ethers.utils.toUtf8Bytes("");
      let slotSet = [true, true, true, true, true, true];

      await
      hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .processMultiBid(amount, slotMin, slotMax, slotSet, bid, bid, permit);

      // Advance blocks
      const slotNum = 3;
      let blockNumber = startingBlock.add(slotNum * BLOCKS_PER_SLOT).toNumber();
      time.advanceBlockTo(blockNumber);
      while (blockNumber > (await time.latestBlock()).toNumber()) {
        sleep(100);
      }

      const SlotStateBefore = await hardhatHermezAuctionProtocol.slots(slotNum);
      expect(SlotStateBefore.fulfilled).to.be.equal(false);
      expect(SlotStateBefore.forgerCommitment).to.be.equal(false);
      expect(SlotStateBefore.bidder).to.be.equal(await coordinator1.getAddress());
      expect(SlotStateBefore.bidAmount).to.be.equal(bidAmount);

      // Winner forge
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(producer1Address);
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(producer1Address);
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(producer1Address);
      await eventNewForgeAllocated;


      const SlotStateAfter = await hardhatHermezAuctionProtocol.slots(slotNum);

      expect(SlotStateAfter.fulfilled).to.be.equal(true);
      expect(SlotStateAfter.forgerCommitment).to.be.equal(true);
    });

    it("forgerCommitment don't accomplished if forge after the deadline", async function() {
      let producer1Address = await forger1.getAddress();
      let bidAmount = ethers.utils.parseEther("11");
      // Event NewForgeAllocated

      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();

      let amount = ethers.utils.parseEther("100");
      let bid = ethers.utils.parseEther("11");
      let slotMin = 3;
      let slotMax = 8;
      let permit = ethers.utils.toUtf8Bytes("");
      let slotSet = [true, true, true, true, true, true];

      await
      hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .processMultiBid(amount, slotMin, slotMax, slotSet, bid, bid, permit);

      // Advance blocks to deadline
      const slotNum = 3;
      let blockNumber = startingBlock.add(slotNum * BLOCKS_PER_SLOT + DEADLINE_BLOCKS).toNumber();
      time.advanceBlockTo(blockNumber);
      while (blockNumber > (await time.latestBlock()).toNumber()) {
        sleep(100);
      }

      const SlotStateBefore = await hardhatHermezAuctionProtocol.slots(slotNum);
      expect(SlotStateBefore.fulfilled).to.be.equal(false);
      expect(SlotStateBefore.forgerCommitment).to.be.equal(false);
      expect(SlotStateBefore.bidder).to.be.equal(await coordinator1.getAddress());
      expect(SlotStateBefore.bidAmount).to.be.equal(bidAmount);

      // Winner forge
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(producer1Address);

      const SlotStateAfter = await hardhatHermezAuctionProtocol.slots(slotNum);

      expect(SlotStateAfter.fulfilled).to.be.equal(true);
      expect(SlotStateAfter.forgerCommitment).to.be.equal(false);

      // the commitment is not accomplished so anyone can forge!
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(await deadlineCoordinator.getAddress());
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(await deadlineCoordinator.getAddress());
    });


    it("shouldn't be able to claim HEZ if NOT_ENOUGH_BALANCE", async function() {
      await expect(
        hardhatHermezAuctionProtocol.connect(donation).claimHEZ()
      ).to.be.revertedWith("HermezAuctionProtocol::claimHEZ: NOT_ENOUGH_BALANCE");
    });

    it("should be able to claim HEZ", async function() {
      let producer1Address = await forger1.getAddress();
      let bidAmount = ethers.utils.parseEther("11");
      // Event HEZClaimed
      let eventHEZClaimed = new Promise((resolve, reject) => {
        filter = hardhatHermezAuctionProtocol.filters.HEZClaimed();
        hardhatHermezAuctionProtocol.on(filter, (owner, amount) => {
          if (owner == governanceAddress) {
            expect(amount).to.be.equal(bidAmount.mul(3).mul(20).div(100));
          } else {
            expect(amount).to.be.equal(bidAmount.mul(3).mul(40).div(100));
          }
          hardhatHermezAuctionProtocol.removeAllListeners();
          resolve();
        });

        // After 10s, we throw a timeout error
        setTimeout(() => {
          reject(new Error("timeout while waiting for event"));
        }, TIMEOUT);
      });

      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();


      let amount = ethers.utils.parseEther("100");
      let bid = ethers.utils.parseEther("11");
      let slotMin = 3;
      let slotMax = 8;
      let permit = ethers.utils.toUtf8Bytes("");
      let slotSet = [true, true, true, true, true, true];

      await
      hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .processMultiBid(amount, slotMin, slotMax, slotSet, bid, bid, permit);

      for (let slot = 3; slot < 6; slot++) {
        // Advance blocks
        let firstBlock = startingBlock.add(slot * BLOCKS_PER_SLOT).toNumber();
        time.advanceBlockTo(firstBlock);
        while (firstBlock > (await time.latestBlock()).toNumber()) {
          sleep(100);
        }
        // Forge
        await hardhatHermezAuctionProtocol
          .connect(hermezRollup)
          .forge(producer1Address);
      }
      // Check balances
      expect(await hardhatHEZToken.balanceOf(governanceAddress)).to.be.equal(0);
      expect(
        await hardhatHermezAuctionProtocol.getClaimableHEZ(governanceAddress)
      ).to.be.equal(bidAmount.mul(3).mul(20).div(100));
      await hardhatHermezAuctionProtocol.connect(governance).claimHEZ();
      expect(
        await hardhatHermezAuctionProtocol.getClaimableHEZ(governanceAddress)
      ).to.be.equal(0);
      expect(await hardhatHEZToken.balanceOf(governanceAddress)).to.be.equal(
        bidAmount.mul(3).mul(20).div(100)
      );

      expect(await hardhatHEZToken.balanceOf(donationAddress)).to.be.equal(0);
      expect(
        await hardhatHermezAuctionProtocol.getClaimableHEZ(donationAddress)
      ).to.be.equal(bidAmount.mul(3).mul(40).div(100));
      await hardhatHermezAuctionProtocol.connect(donation).claimHEZ();
      expect(
        await hardhatHermezAuctionProtocol.getClaimableHEZ(donationAddress)
      ).to.be.equal(0);
      expect(await hardhatHEZToken.balanceOf(donationAddress)).to.be.equal(
        bidAmount.mul(3).mul(40).div(100)
      );

      await eventHEZClaimed;
    });

    it("edge case: bid was `outbidded` by the DefaultSlotSetBid, boot coordinator don't forge", async function() {
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      let amount = ethers.utils.parseEther("100");
      let bid = ethers.utils.parseEther("11");
      let slotMin = 3;
      let slotMax = 8;
      let permit = ethers.utils.toUtf8Bytes("");
      let slotSet = [true, true, true, true, true, true];

      await
      hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .processMultiBid(amount, slotMin, slotMax, slotSet, bid, bid, permit);

      for (i = 0; i < 6; i++) {
        // Change epochs minBid
        await hardhatHermezAuctionProtocol
          .connect(governance)
          .changeDefaultSlotSetBid(i, ethers.utils.parseEther("123456789"));
      }

      // Check forger address
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          governanceAddress,
          startingBlock.add(3 * BLOCKS_PER_SLOT)
        )
      ).to.be.equal(false);
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          bootCoordinatorAddress,
          startingBlock.add(3 * BLOCKS_PER_SLOT)
        )
      ).to.be.equal(true);

      // Advance blocks to deadline
      let blockNumber = startingBlock.add(3 * BLOCKS_PER_SLOT + DEADLINE_BLOCKS).toNumber();
      time.advanceBlockTo(blockNumber);
      while (blockNumber > (await time.latestBlock()).toNumber()) {
        sleep(100);
      }

      let forgerAddress = await coordinator1.getAddress();
      let prevBalance = await hardhatHermezAuctionProtocol.getClaimableHEZ(
        forgerAddress
      );

      // anyone can forge now
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(await deadlineCoordinator.getAddress());
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(await deadlineCoordinator.getAddress());
      await hardhatHermezAuctionProtocol
        .connect(hermezRollup)
        .forge(await deadlineCoordinator.getAddress());

      // funds should return to the coordinator anyway
      let postBalance = await hardhatHermezAuctionProtocol.getClaimableHEZ(
        forgerAddress
      );

      // the slot is fullfilled but the forgeCommitment is false, because 
      // is forged after the deadline
      const SlotStateBefore = await hardhatHermezAuctionProtocol.slots(3);
      expect(SlotStateBefore.fulfilled).to.be.equal(true);
      expect(SlotStateBefore.forgerCommitment).to.be.equal(false);

      // Check forgerAddress balances
      expect(postBalance).to.be.equal(
        prevBalance.add(ethers.utils.parseEther("11"))
      );
      expect(prevBalance.add(ethers.utils.parseEther("11"))).to.be.equal(
        postBalance
      );
    });

    it("edge case: bid was `outbidded` by the DefaultSlotSetBid, no one forge in that slot", async function() {
      let startingBlock = await hardhatHermezAuctionProtocol.genesisBlock();
      let amount = ethers.utils.parseEther("100");
      let bid = ethers.utils.parseEther("11");
      let slotMin = 3;
      let slotMax = 8;
      let permit = ethers.utils.toUtf8Bytes("");
      let slotSet = [true, true, true, true, true, true];

      await
      hardhatHermezAuctionProtocol
        .connect(coordinator1)
        .processMultiBid(amount, slotMin, slotMax, slotSet, bid, bid, permit);

      for (i = 0; i < 6; i++) {
        // Change epochs minBid
        await hardhatHermezAuctionProtocol
          .connect(governance)
          .changeDefaultSlotSetBid(i, ethers.utils.parseEther("123456789"));
      }

      // Check forger address
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          governanceAddress,
          startingBlock.add(3 * BLOCKS_PER_SLOT)
        )
      ).to.be.equal(false);
      expect(
        await hardhatHermezAuctionProtocol.canForge(
          bootCoordinatorAddress,
          startingBlock.add(3 * BLOCKS_PER_SLOT)
        )
      ).to.be.equal(true);

      // Advance blocks to slot 4, no one forge in slot 3
      let blockNumber = startingBlock.add(4 * BLOCKS_PER_SLOT + 1).toNumber();
      time.advanceBlockTo(blockNumber);
      while (blockNumber > (await time.latestBlock()).toNumber()) {
        sleep(100);
      }

      let forgerAddress = await coordinator1.getAddress();
      let prevBalance = await hardhatHermezAuctionProtocol.getClaimableHEZ(
        forgerAddress
      );

      // anyone can claim the tokens in the slot 3
      await hardhatHermezAuctionProtocol
        .connect(deadlineCoordinator)
        .claimPendingHEZ(3);

      let postBalance = await hardhatHermezAuctionProtocol.getClaimableHEZ(
        forgerAddress
      );

      // Check forgerAddress balances
      expect(postBalance).to.be.equal(
        prevBalance.add(ethers.utils.parseEther("11"))
      );
      expect(prevBalance.add(ethers.utils.parseEther("11"))).to.be.equal(
        postBalance
      );
    });
  });
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}