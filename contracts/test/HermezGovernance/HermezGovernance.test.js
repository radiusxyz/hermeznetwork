const {
  ethers
} = require("hardhat");
const {
  expect
} = require("chai");

const {
  time
} = require("@openzeppelin/test-helpers");

const poseidonUnit = require("circomlib/src/poseidon_gencontract");

const MIN_BLOCKS = 81;
const INITIAL_WITHDRAWAL_DELAY = 3600; //seconds
const maxTxVerifierConstant = 512;
const nLevelsVeriferConstant = 32;
const bootCoordinatorURL = "https://boot.coordinator.io";
const Scalar = require("ffjavascript").Scalar;

const {
  calculateInputMaxTxLevels,
  packBucket,
  unpackBucket
} = require("../hermez/helpers/helpers");
describe("Hermez Governance", function() {
  let communityCouncil, bootstrapCouncil, emergencyCouncil, hermezKeeper, donation, bootCoordinator, deployer;
  let communityCouncilAddress, bootstrapCouncilAddress, emergencyCouncilAddress, hermezKeeperAddress, donationAddress, bootCoordinatorAddress;
  let hermezGovernance;
  let hardhatHEZToken;
  let hermezAuctionProtocol, hermez;
  before(async function() {
    const accessControlFactory = await ethers.getContractFactory("HermezGovernance");
    [
      communityCouncil,
      bootstrapCouncil,
      emergencyCouncil,
      hermezKeeper,
      donation,
      bootCoordinator,
      deployer,
      ...addrs
    ] = await ethers.getSigners();
    communityCouncilAddress = await communityCouncil.getAddress();
    bootstrapCouncilAddress = await bootstrapCouncil.getAddress();
    hermezKeeperAddress = await hermezKeeper.getAddress();
    emergencyCouncilAddress = await emergencyCouncil.getAddress();
    donationAddress = await donation.getAddress();
    bootCoordinatorAddress = await bootCoordinator.getAddress();

    hermezGovernance = await accessControlFactory.deploy(communityCouncilAddress);
    await hermezGovernance.deployed();


    const HermezAuctionProtocol = await ethers.getContractFactory(
      "HermezAuctionProtocol"
    );
    const WithdrawalDelayer = await ethers.getContractFactory(
      "WithdrawalDelayer"
    );
    const HEZToken = await ethers.getContractFactory("HEZ");
    const Hermez = await ethers.getContractFactory("Hermez");
    const VerifierRollupHelper = await ethers.getContractFactory(
      "VerifierRollupHelper"
    );
    const VerifierWithdrawHelper = await ethers.getContractFactory(
      "VerifierWithdrawHelper"
    );
    const Poseidon2Elements = new ethers.ContractFactory(
      poseidonUnit.generateABI(2),
      poseidonUnit.createCode(2),
      deployer
    );
    const Poseidon3Elements = new ethers.ContractFactory(
      poseidonUnit.generateABI(3),
      poseidonUnit.createCode(3),
      deployer
    );
    const Poseidon4Elements = new ethers.ContractFactory(
      poseidonUnit.generateABI(4),
      poseidonUnit.createCode(4),
      deployer
    );
    // Deploy smart contacts:
    hermezAuctionProtocol = await upgrades.deployProxy(
      HermezAuctionProtocol,
      [],
      {
        unsafeAllowCustomTypes: true,
        initializer: undefined,
      }
    );
    await hermezAuctionProtocol.deployed();

    // Deploy hermez
    hermez = await upgrades.deployProxy(Hermez, [], {
      unsafeAllowCustomTypes: true,
      initializer: undefined,
    });
    await hermez.deployed();

    // Deploy withdrawalDelayer
    withdrawalDelayer = await WithdrawalDelayer.deploy(
      INITIAL_WITHDRAWAL_DELAY,
      hermez.address,
      hermezGovernance.address,
      emergencyCouncilAddress
    );
    await withdrawalDelayer.deployed();

    // deploy HEZ (erc20Permit) token
    hardhatHEZToken = await HEZToken.deploy(
      await deployer.getAddress(),
    );
    await hardhatHEZToken.deployed();

    const hardhatPoseidon2Elements = await Poseidon2Elements.deploy();
    const hardhatPoseidon3Elements = await Poseidon3Elements.deploy();
    const hardhatPoseidon4Elements = await Poseidon4Elements.deploy();
    await hardhatPoseidon2Elements.deployed();
    await hardhatPoseidon3Elements.deployed();
    await hardhatPoseidon4Elements.deployed();

    libposeidonsAddress = [
      hardhatPoseidon2Elements.address,
      hardhatPoseidon3Elements.address,
      hardhatPoseidon4Elements.address,
    ];

    let hardhatVerifierRollupHelper = await VerifierRollupHelper.deploy();
    await hardhatVerifierRollupHelper.deployed();
    libVerifiersAddress = [hardhatVerifierRollupHelper.address];

    let hardhatVerifierWithdrawHelper = await VerifierWithdrawHelper.deploy();
    await hardhatVerifierWithdrawHelper.deployed();
    libverifiersWithdrawAddress = hardhatVerifierWithdrawHelper.address;

    let genesisBlock =
            (await time.latestBlock()).toNumber() + 100;

    await hermezAuctionProtocol.hermezAuctionProtocolInitializer(
      hardhatHEZToken.address,
      genesisBlock,
      hermez.address,
      hermezGovernance.address,
      donationAddress,
      bootCoordinatorAddress,
      bootCoordinatorURL
    );

    // initialize Hermez
    maxTxVerifier = [];
    nLevelsVerifer = [];
    libVerifiersAddress.forEach(() => {
      maxTxVerifier.push(maxTxVerifierConstant);
      nLevelsVerifer.push(nLevelsVeriferConstant);
    });
    await hermez.initializeHermez(
      libVerifiersAddress,
      calculateInputMaxTxLevels(maxTxVerifier, nLevelsVerifer),
      libverifiersWithdrawAddress,
      hermezAuctionProtocol.address,
      hardhatHEZToken.address,
      10,
      10,
      libposeidonsAddress[0],
      libposeidonsAddress[1],
      libposeidonsAddress[2],
      hermezGovernance.address,
      1209600,
      withdrawalDelayer.address
    );
  });
  describe("Basic funcionality", function() {
    it("should be able to add a role", async function() {

      let role = await getRole(hermezGovernance.address, "0xFFFFFFFF");

      await expect(
        hermezGovernance.grantRole(role, bootstrapCouncilAddress)
      ).to.emit(hermezGovernance, "RoleGranted")
        .withArgs(role, bootstrapCouncilAddress, communityCouncilAddress);
      expect(
        await
        hermezGovernance.hasRole(role, bootstrapCouncilAddress))
        .to.be.equal(true);
    });
    it("should be able to add a revoke a role", async function() {
      let role = await getRole(hermezGovernance.address, "0xFFFFFFFF");
      expect(
        await
        hermezGovernance.hasRole(role, bootstrapCouncilAddress))
        .to.be.equal(true);
      await expect(
        hermezGovernance.revokeRole(role, bootstrapCouncilAddress)
      ).to.emit(hermezGovernance, "RoleRevoked")
        .withArgs(role, bootstrapCouncilAddress, communityCouncilAddress);
      expect(await
      hermezGovernance.hasRole(role, bootstrapCouncilAddress))
        .to.be.equal(false);

    });
  });

  describe("hermezAuctionProtocol", function() {
    before(async function() {
      // 87e6b6bb  =>  setSlotDeadline(uint8) ==> BootstrapCouncil
      // c63de515  =>  setOpenAuctionSlots(uint16) ==> BootstrapCouncil
      // d92bdda3  =>  setClosedAuctionSlots(uint16) ==> BootstrapCouncil
      // dfd5281b  =>  setOutbidding ==> BootstrapCouncil
      // 82787405  =>  setAllocationRatio ==> BootstrapCouncil
      // 6f48e79b  =>  setDonationAddress ==> BootstrapCouncil
      // 62945af2  =>  setBootCoordinator ==> BootstrapCouncil
      // 7c643b70  =>  changeDefaultSlotSetBid ==> BootstrapCouncil, HermezKeeper

      let allowedFunctionsBootstrapCouncil = [
        "setSlotDeadline",
        "setOpenAuctionSlots",
        "setClosedAuctionSlots",
        "setOutbidding",
        "setAllocationRatio",
        "setDonationAddress",
        "setBootCoordinator",
        "changeDefaultSlotSetBid"];

      allowedFunctionsBootstrapCouncil.forEach(async method => {

        let role = await getRole(
          hermezAuctionProtocol.address,
          hermezAuctionProtocol.interface.getSighash(method));
        await expect(
          hermezGovernance.grantRole(role, bootstrapCouncilAddress)
        ).to.emit(hermezGovernance, "RoleGranted")
          .withArgs(role, bootstrapCouncilAddress, communityCouncilAddress);
        expect(
          await
          hermezGovernance.hasRole(role, bootstrapCouncilAddress))
          .to.be.equal(true);
      });

      let allowedHermezKeeper = [
        "changeDefaultSlotSetBid"
      ];

      allowedHermezKeeper.forEach(async method => {
        let role = await getRole(
          hermezAuctionProtocol.address,
          hermezAuctionProtocol.interface.getSighash(method));
        await expect(
          hermezGovernance.grantRole(role, hermezKeeperAddress)
        ).to.emit(hermezGovernance, "RoleGranted")
          .withArgs(role, hermezKeeperAddress, communityCouncilAddress);
        expect(
          await
          hermezGovernance.hasRole(role, hermezKeeperAddress))
          .to.be.equal(true);
      });
    });

    it("should be able to change setSlotDeadline", async function() {
      let newSlotDeadline = 1;

      await expect(
        hermezAuctionProtocol.setSlotDeadline(0)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("setSlotDeadline", [newSlotDeadline]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getSlotDeadline()).to.be.equal(newSlotDeadline);

    });
    it("should be able to change setOpenAuctionSlots", async function() {
      let newOpenAuctionSlots = 123;

      await expect(
        hermezAuctionProtocol.setOpenAuctionSlots(newOpenAuctionSlots)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("setOpenAuctionSlots", [newOpenAuctionSlots]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getOpenAuctionSlots()).to.be.equal(newOpenAuctionSlots);
    });
    it("should be able to change setClosedAuctionSlots", async function() {
      let newClosedAuctionSlots = 5;
      await expect(
        hermezAuctionProtocol.setOpenAuctionSlots(newClosedAuctionSlots)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("setClosedAuctionSlots", [newClosedAuctionSlots]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getClosedAuctionSlots()).to.be.equal(newClosedAuctionSlots);
    });

    it("should be able to change setOutbidding", async function() {
      let newOutbidding = 1122;
      await expect(
        hermezAuctionProtocol.setOpenAuctionSlots(newOutbidding)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("setOutbidding", [newOutbidding]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getOutbidding()).to.be.equal(newOutbidding);
    });
    it("should be able to change setAllocationRatio", async function() {
      let newAllocationRatio = [5000, 5000, 0];
      await expect(
        hermezAuctionProtocol.setAllocationRatio(newAllocationRatio)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("setAllocationRatio", [newAllocationRatio]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect((await hermezAuctionProtocol.getAllocationRatio())[0]).to.be.equal(newAllocationRatio[0]);
      expect((await hermezAuctionProtocol.getAllocationRatio())[1]).to.be.equal(newAllocationRatio[1]);
      expect((await hermezAuctionProtocol.getAllocationRatio())[2]).to.be.equal(newAllocationRatio[2]);
    });

    it("should be able to change setDonationAddress", async function() {
      let newDonationAddress = bootstrapCouncilAddress;
      await expect(
        hermezAuctionProtocol.setDonationAddress(newDonationAddress)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("setDonationAddress", [newDonationAddress]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getDonationAddress()).to.be.equal(newDonationAddress);
    });

    it("should be able to change setBootCoordinator", async function() {
      let newBootCoordinator = bootstrapCouncilAddress;
      const newBootCoordinatorUrl = "urlBootCoordinator";
      await expect(
        hermezAuctionProtocol.setBootCoordinator(newBootCoordinator, newBootCoordinatorUrl)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("setBootCoordinator", [newBootCoordinator, newBootCoordinatorUrl]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getBootCoordinator()).to.be.equal(newBootCoordinator);
    });

    it("should be able to change changeDefaultSlotSetBid", async function() {
      let slotCouncil = 0;
      let slotKeeper = 1;
      let valueCouncil = 123;
      let valueKeeper = 321;
      await expect(
        hermezAuctionProtocol.changeDefaultSlotSetBid(slotCouncil, valueCouncil)
      ).to.be.revertedWith("HermezAuctionProtocol::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermezAuctionProtocol.interface.encodeFunctionData("changeDefaultSlotSetBid", [slotCouncil, valueCouncil]);
      await expect(
        hermezGovernance
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermezAuctionProtocol.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getDefaultSlotSetBid(slotCouncil)).to.be.equal(valueCouncil);

      let data_keeper = hermezAuctionProtocol.interface.encodeFunctionData("changeDefaultSlotSetBid", [slotKeeper, valueKeeper]);
      await expect(
        hermezGovernance.connect(hermezKeeper)
          .execute(hermezAuctionProtocol.address, 0, data_keeper))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermezAuctionProtocol.getDefaultSlotSetBid(slotKeeper)).to.be.equal(valueKeeper);
    });
  });
  describe("Hermez", function() {
    before(async function() {
      let allowedFunctionsBootstrapCouncil = [
        "updateBucketsParameters",
        "updateWithdrawalDelay",
        "safeMode",
        "updateForgeL1L2BatchTimeout",
        "updateFeeAddToken"];

      allowedFunctionsBootstrapCouncil.forEach(async method => {

        let role = await getRole(
          hermez.address,
          hermez.interface.getSighash(method));
        await expect(
          hermezGovernance.grantRole(role, bootstrapCouncilAddress)
        ).to.emit(hermezGovernance, "RoleGranted")
          .withArgs(role, bootstrapCouncilAddress, communityCouncilAddress);
        expect(
          await
          hermezGovernance.hasRole(role, bootstrapCouncilAddress))
          .to.be.equal(true);
      });

      let allowedHermezKeeper = [
        "updateTokenExchange",
        "safeMode"
      ];

      allowedHermezKeeper.forEach(async method => {
        let role = await getRole(
          hermez.address,
          hermez.interface.getSighash(method));
        await expect(
          hermezGovernance.grantRole(role, hermezKeeperAddress)
        ).to.emit(hermezGovernance, "RoleGranted")
          .withArgs(role, hermezKeeperAddress, communityCouncilAddress);
        expect(
          await
          hermezGovernance.hasRole(role, hermezKeeperAddress))
          .to.be.equal(true);
      });
    });

    it("should be able to change updateBucketsParameters", async function() {
      const buckets = [];
      const numBuckets = 5;

      for (let i = 0; i < numBuckets; i++) {
        const ceilUSD = (i + 1) * 1000;
        const blockStamp = 0; // does not matter!
        const withdrawals = 0;
        const rateBlocks = (i + 1) * 4;
        const rateWithdrawals = 3;
        const maxWithdrawals = 4000000000; // max value 4294967296;
        buckets.push({
          ceilUSD,
          blockStamp,
          withdrawals,
          rateBlocks,
          rateWithdrawals,
          maxWithdrawals
        });
      }
      const bucketsPacked = buckets.map((bucket) => packBucket(bucket));

      await expect(
        hermez.updateBucketsParameters(bucketsPacked)
      ).to.be.revertedWith("InstantWithdrawManager::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermez.interface.encodeFunctionData("updateBucketsParameters", [bucketsPacked]);
      await expect(
        hermezGovernance
          .execute(hermez.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermez.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      for (let i = 0; i < numBuckets; i++) {
        const bucket = await hermez.buckets(i);
        const unpackedBucket = unpackBucket(bucket._hex);
        expect(buckets[i].ceilUSD).to.be.equal(ethers.BigNumber.from(unpackedBucket.ceilUSD));
        expect(buckets[i].withdrawals).to.be.equal(ethers.BigNumber.from(unpackedBucket.withdrawals));
        expect(buckets[i].rateBlocks).to.be.equal(ethers.BigNumber.from(unpackedBucket.rateBlocks));
        expect(buckets[i].rateWithdrawals).to.be.equal(ethers.BigNumber.from(unpackedBucket.rateWithdrawals));
        expect(buckets[i].maxWithdrawals).to.be.equal(ethers.BigNumber.from(unpackedBucket.maxWithdrawals));
      }
  
    });
    it("should be able to change updateTokenExchange", async function() {
      const addressArray = [hardhatHEZToken.address];
      const tokenPrice = 10; //USD
      const valueArray = [tokenPrice * 1e14];

      await expect(
        hermez.updateTokenExchange(addressArray, valueArray)
      ).to.be.revertedWith("InstantWithdrawManager::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermez.interface.encodeFunctionData("updateTokenExchange", [addressArray, valueArray]);
      await expect(
        hermezGovernance
          .execute(hermez.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(hermezKeeper)
          .execute(hermez.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(
        await hermez.tokenExchange(hardhatHEZToken.address)
      ).to.equal(valueArray[0]);
    });
    it("should be able to change updateWithdrawalDelay", async function() {
      const newWithdrawalDelay = 100000;

      await expect(
        hermez.updateWithdrawalDelay(newWithdrawalDelay)
      ).to.be.revertedWith("InstantWithdrawManager::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermez.interface.encodeFunctionData("updateWithdrawalDelay", [newWithdrawalDelay]);
      await expect(
        hermezGovernance
          .execute(hermez.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermez.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermez.withdrawalDelay()).to.equal(
        newWithdrawalDelay
      );
    });
    it("should be able to change safeMode", async function() {

      await expect(
        hermez.safeMode()
      ).to.be.revertedWith("InstantWithdrawManager::onlyGovernance: ONLY_GOVERNANCE_ADDRESS");

      let data = hermez.interface.encodeFunctionData("safeMode", []);
      dataEncoded = ethers.utils.defaultAbiCoder.encode(
        ["bytes4"],
        [data]);
      await expect(
        hermezGovernance
          .execute(hermez.address, 0, dataEncoded))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermez.address, 0, dataEncoded))
        .to.emit(hermezGovernance, "ExecOk");


      const bucketSafe = await hermez.buckets(0);
      const unpackedBucketSafe = unpackBucket(bucketSafe._hex);
  
      expect(await hermez.nBuckets()).to.be.equal(1);
      expect(unpackedBucketSafe.ceilUSD.toString(16)).to.be.equal("ffffffffffffffffffffffff");
      expect(unpackedBucketSafe.withdrawals).to.be.equal(Scalar.e(0));
      expect(unpackedBucketSafe.rateBlocks).to.be.equal(Scalar.e(1));
      expect(unpackedBucketSafe.rateWithdrawals).to.be.equal(Scalar.e(0));
      expect(unpackedBucketSafe.maxWithdrawals).to.be.equal(Scalar.e(0));


      // add buckets
      const numBuckets = 5;
      const buckets = [];
      for (let i = 0; i < numBuckets; i++) {
        const ceilUSD = (i + 1) * 1000;
        const blockStamp = 0; // does not matter!
        const withdrawals = 0;
        const rateBlocks = (i + 1) * 4;
        const rateWithdrawals = 3;
        const maxWithdrawals = 4000000000; // max value 4294967296;
        buckets.push({
          ceilUSD,
          blockStamp,
          withdrawals,
          rateBlocks,
          rateWithdrawals,
          maxWithdrawals
        });
      }
      const bucketsPacked = buckets.map((bucket) => packBucket(bucket));

      let dataBuckets = hermez.interface.encodeFunctionData("updateBucketsParameters", [bucketsPacked]);
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermez.address, 0, dataBuckets))
        .to.emit(hermezGovernance, "ExecOk");

      for (let i = 0; i < numBuckets; i++) {
        const bucket = await hermez.buckets(i);
        const unpackedBucket = unpackBucket(bucket._hex);
        expect(buckets[i].ceilUSD).to.be.equal(ethers.BigNumber.from(unpackedBucket.ceilUSD));
        expect(buckets[i].withdrawals).to.be.equal(ethers.BigNumber.from(unpackedBucket.withdrawals));
        expect(buckets[i].rateBlocks).to.be.equal(ethers.BigNumber.from(unpackedBucket.rateBlocks));
        expect(buckets[i].rateWithdrawals).to.be.equal(ethers.BigNumber.from(unpackedBucket.rateWithdrawals));
        expect(buckets[i].maxWithdrawals).to.be.equal(ethers.BigNumber.from(unpackedBucket.maxWithdrawals));
      }
        
      await expect(
        hermezGovernance.connect(hermezKeeper)
          .execute(hermez.address, 0, dataEncoded))
        .to.emit(hermezGovernance, "ExecOk");

      expect(await hermez.nBuckets()).to.be.equal(1);
      expect(unpackedBucketSafe.ceilUSD.toString(16)).to.be.equal("ffffffffffffffffffffffff");
      expect(unpackedBucketSafe.withdrawals).to.be.equal(Scalar.e(0));
      expect(unpackedBucketSafe.rateBlocks).to.be.equal(Scalar.e(1));
      expect(unpackedBucketSafe.rateWithdrawals).to.be.equal(Scalar.e(0));
      expect(unpackedBucketSafe.maxWithdrawals).to.be.equal(Scalar.e(0));
    });

    it("should be able to change updateForgeL1L2BatchTimeout", async function() {

      const newForgeL1Timeout = 100;

      await expect(
        hermez.updateForgeL1L2BatchTimeout(newForgeL1Timeout)
      ).to.be.revertedWith("InstantWithdrawManager::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermez.interface.encodeFunctionData("updateForgeL1L2BatchTimeout", [newForgeL1Timeout]);
      await expect(
        hermezGovernance
          .execute(hermez.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermez.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermez.forgeL1L2BatchTimeout()).to.equal(
        newForgeL1Timeout
      );
    });

    it("should be able to change updateFeeAddToken", async function() {
      const newFeeAddToken = 100;
      await expect(
        hermez.updateFeeAddToken(newFeeAddToken)
      ).to.be.revertedWith("InstantWithdrawManager::onlyGovernance: ONLY_GOVERNANCE");

      let data = hermez.interface.encodeFunctionData("updateFeeAddToken", [newFeeAddToken]);
      await expect(
        hermezGovernance
          .execute(hermez.address, 0, data))
        .to.be.revertedWith("HermezGovernance::execute: ONLY_ALLOWED_ROLE");
      await expect(
        hermezGovernance.connect(bootstrapCouncil)
          .execute(hermez.address, 0, data))
        .to.emit(hermezGovernance, "ExecOk");
      expect(await hermez.feeAddToken()).to.equal(newFeeAddToken);
    });
  });
});

function getRole(address, dataSignature) {
  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["address", "bytes4"],
      [address, dataSignature]
    )
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}