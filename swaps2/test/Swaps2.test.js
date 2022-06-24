const {
    BN,
    constants: { ZERO_ADDRESS },
    ether,
    expectEvent,
    expectRevert,
    time,
    time: { duration }
  } = require("openzeppelin-test-helpers");
  
  const chai = require("chai");
  chai.should();
  chai.use(require("chai-bn")(BN));
  chai.use(require("chai-as-promised"));
  
  const Vault = artifacts.require("Vault");
  const Swaps = artifacts.require("Swaps");
  const Token = artifacts.require("TestToken");
  const BNB = artifacts.require("BNB");
  
  contract("Swaps2", ([owner, Exohood, broker, orderOwner, ...accounts]) => {
    let now;
    let swaps;
    let vault;
    let baseToken;
    let quoteToken;
    let baseLimit = ether("1");
    let quoteLimit = ether("2");
    const MAX_PERCENT = new BN("10000");
  
    async function depositToken(swaps, id, token, amount, from) {
      if (token === ZERO_ADDRESS) {
        return swaps.deposit(id, ZERO_ADDRESS, amount, { from, value: amount });
      } else {
        await token.mint(from, amount);
        await token.approve(swaps.address, amount, { from });
        return swaps.deposit(id, token.address, amount, { from });
      }
    }
  
    beforeEach(async () => {
      now = await time.latest();
      vault = await Vault.new();
      swaps = await Swaps.new();
      await vault.setSwaps(swaps.address);
      await swaps.setVault(vault.address);
      baseToken = await Token.new();
      quoteToken = await Token.new();
    });
  
    it("create simple order", async () => {
      const id = await swaps.createKey(accounts[0]);
  
      await swaps.createOrder(
        id,
        baseToken.address,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes("1")),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        ZERO_ADDRESS,
        0,
        0,
        { from: orderOwner }
      );
    });
  
    it("create order with broker", async () => {
      const id = await swaps.createKey(accounts[0]);
  
      await swaps.createOrder(
        id,
        baseToken.address,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes("1")),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        broker,
        100,
        250,
        { from: orderOwner }
      );
    });
  
    it("create order with broker and Exohood broker", async () => {
      await swaps.setExohoodAddress(Exohood, { from: owner });
      await swaps.setExohoodPercents(50, 70, { from: owner });
  
      const id = await swaps.createKey(accounts[0]);
  
      await swaps.createOrder(
        id,
        baseToken.address,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes("1")),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        broker,
        100,
        250,
        { from: orderOwner }
      );
    });
  
    it("deposit to order with broker and Exohood and check distribution", async () => {
      const ExohoodBasePercent = new BN("50");
      const ExohoodQuotePercent = new BN("70");
      const id = await swaps.createKey(accounts[0]);
      const brokerBasePercent = new BN("100");
      const brokerQuotePercent = new BN("250");
  
      await swaps.setExohoodAddress(Exohood, { from: owner });
      await swaps.setExohoodPercents(ExohoodBasePercent, ExohoodQuotePercent, {
        from: owner
      });
  
      await swaps.createOrder(
        id,
        baseToken.address,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes(new BN("1"))),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        broker,
        brokerBasePercent,
        brokerQuotePercent,
        { from: orderOwner }
      );
  
      const baseAmounts = [];
      baseAmounts.push(baseLimit.div(new BN("3")));
      baseAmounts.push(baseLimit.sub(baseAmounts[0]));
      for (let i = 0; i < baseAmounts.length; i++) {
        await depositToken(swaps, id, baseToken, baseAmounts[i], accounts[i + 1]);
      }
  
      const quoteAmounts = [];
      quoteAmounts.push(quoteLimit.div(new BN("5")));
      quoteAmounts.push(quoteLimit.sub(quoteAmounts[0]));
      for (let i = 0; i < quoteAmounts.length; i++) {
        await depositToken(
          swaps,
          id,
          quoteToken,
          quoteAmounts[i],
          accounts[i + 1 + baseAmounts.length]
        );
      }
  
      const ExohoodBaseToReceive = baseLimit
        .mul(ExohoodBasePercent)
        .div(MAX_PERCENT);
      await baseToken
        .balanceOf(Exohood)
        .should.eventually.be.bignumber.equal(ExohoodBaseToReceive);
  
      const ExohoodQuoteToReceive = quoteLimit
        .mul(ExohoodQuotePercent)
        .div(MAX_PERCENT);
      await quoteToken
        .balanceOf(Exohood)
        .should.eventually.be.bignumber.equal(ExohoodQuoteToReceive);
  
      const brokerBaseToReceive = baseLimit
        .mul(brokerBasePercent)
        .div(MAX_PERCENT);
      await baseToken
        .balanceOf(broker)
        .should.eventually.be.bignumber.equal(brokerBaseToReceive);
  
      const brokerQuoteToReceive = quoteLimit
        .mul(brokerQuotePercent)
        .div(MAX_PERCENT);
      await quoteToken
        .balanceOf(broker)
        .should.eventually.be.bignumber.equal(brokerQuoteToReceive);
  
      for (let i = 0; i < baseAmounts.length; i++) {
        const investorQuoteToReceive = baseAmounts[i]
          .mul(quoteLimit.sub(ExohoodQuoteToReceive).sub(brokerQuoteToReceive))
          .div(baseLimit);
  
        await quoteToken
          .balanceOf(accounts[i + 1])
          .should.eventually.be.bignumber.closeTo(investorQuoteToReceive, "1");
      }
  
      for (let i = 0; i < quoteAmounts.length; i++) {
        const investorBaseToReceive = quoteAmounts[i]
          .mul(baseLimit.sub(ExohoodBaseToReceive).sub(brokerBaseToReceive))
          .div(quoteLimit);
  
        await baseToken
          .balanceOf(accounts[i + 1 + baseAmounts.length])
          .should.eventually.be.bignumber.closeTo(investorBaseToReceive, "1");
      }
    });
  
    it("deposit to order with broker and check distribution", async () => {
      const id = await swaps.createKey(accounts[0]);
      const brokerBasePercent = new BN("100");
      const brokerQuotePercent = new BN("250");
  
      await swaps.createOrder(
        id,
        baseToken.address,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes(new BN("1"))),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        broker,
        brokerBasePercent,
        brokerQuotePercent,
        { from: orderOwner }
      );
  
      const baseAmounts = [];
      baseAmounts.push(baseLimit.div(new BN("3")));
      baseAmounts.push(baseLimit.sub(baseAmounts[0]));
      for (let i = 0; i < baseAmounts.length; i++) {
        await depositToken(swaps, id, baseToken, baseAmounts[i], accounts[i + 1]);
      }
  
      const quoteAmounts = [];
      quoteAmounts.push(quoteLimit.div(new BN("5")));
      quoteAmounts.push(quoteLimit.sub(quoteAmounts[0]));
      for (let i = 0; i < quoteAmounts.length; i++) {
        await depositToken(
          swaps,
          id,
          quoteToken,
          quoteAmounts[i],
          accounts[i + 1 + baseAmounts.length]
        );
      }
  
      const brokerBaseToReceive = baseLimit
        .mul(brokerBasePercent)
        .div(MAX_PERCENT);
      await baseToken
        .balanceOf(broker)
        .should.eventually.be.bignumber.equal(brokerBaseToReceive);
  
      const brokerQuoteToReceive = quoteLimit
        .mul(brokerQuotePercent)
        .div(MAX_PERCENT);
      await quoteToken
        .balanceOf(broker)
        .should.eventually.be.bignumber.equal(brokerQuoteToReceive);
  
      for (let i = 0; i < baseAmounts.length; i++) {
        const investorQuoteToReceive = baseAmounts[i]
          .mul(quoteLimit.sub(brokerQuoteToReceive))
          .div(baseLimit);
  
        await quoteToken
          .balanceOf(accounts[i + 1])
          .should.eventually.be.bignumber.closeTo(investorQuoteToReceive, "1");
      }
  
      for (let i = 0; i < quoteAmounts.length; i++) {
        const investorBaseToReceive = quoteAmounts[i]
          .mul(baseLimit.sub(brokerBaseToReceive))
          .div(quoteLimit);
  
        await baseToken
          .balanceOf(accounts[i + 1 + baseAmounts.length])
          .should.eventually.be.bignumber.closeTo(investorBaseToReceive, "1");
      }
    });
  
    it("deposit to order with Exohood and check distribution", async () => {
      const ExohoodBasePercent = new BN("50");
      const ExohoodQuotePercent = new BN("70");
      const id = await swaps.createKey(accounts[0]);
      const brokerBasePercent = new BN("100");
      const brokerQuotePercent = new BN("250");
  
      await swaps.setExohoodAddress(Exohood, { from: owner });
      await swaps.setExohoodPercents(ExohoodBasePercent, ExohoodQuotePercent, {
        from: owner
      });
  
      await swaps.createOrder(
        id,
        baseToken.address,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes(new BN("1"))),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        ZERO_ADDRESS,
        0,
        0,
        { from: orderOwner }
      );
  
      const baseAmounts = [];
      baseAmounts.push(baseLimit.div(new BN("3")));
      baseAmounts.push(baseLimit.sub(baseAmounts[0]));
      for (let i = 0; i < baseAmounts.length; i++) {
        await depositToken(swaps, id, baseToken, baseAmounts[i], accounts[i + 1]);
      }
  
      const quoteAmounts = [];
      quoteAmounts.push(quoteLimit.div(new BN("5")));
      quoteAmounts.push(quoteLimit.sub(quoteAmounts[0]));
      for (let i = 0; i < quoteAmounts.length; i++) {
        await depositToken(
          swaps,
          id,
          quoteToken,
          quoteAmounts[i],
          accounts[i + 1 + baseAmounts.length]
        );
      }
  
      const ExohoodBaseToReceive = baseLimit
        .mul(ExohoodBasePercent)
        .div(MAX_PERCENT);
      await baseToken
        .balanceOf(Exohood)
        .should.eventually.be.bignumber.equal(ExohoodBaseToReceive);
  
      const ExohoodQuoteToReceive = quoteLimit
        .mul(ExohoodQuotePercent)
        .div(MAX_PERCENT);
      await quoteToken
        .balanceOf(Exohood)
        .should.eventually.be.bignumber.equal(ExohoodQuoteToReceive);
  
      for (let i = 0; i < baseAmounts.length; i++) {
        const investorQuoteToReceive = baseAmounts[i]
          .mul(quoteLimit.sub(ExohoodQuoteToReceive))
          .div(baseLimit);
  
        await quoteToken
          .balanceOf(accounts[i + 1])
          .should.eventually.be.bignumber.closeTo(investorQuoteToReceive, "1");
      }
  
      for (let i = 0; i < quoteAmounts.length; i++) {
        const investorBaseToReceive = quoteAmounts[i]
          .mul(baseLimit.sub(ExohoodBaseToReceive))
          .div(quoteLimit);
  
        await baseToken
          .balanceOf(accounts[i + 1 + baseAmounts.length])
          .should.eventually.be.bignumber.closeTo(investorBaseToReceive, "1");
      }
    });
  
    it("should fail with same addresses", async () => {
      await expectRevert.unspecified(
        swaps.createOrder(
          await swaps.createKey(accounts[0]),
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          1000,
          1500,
          now.add(duration.minutes(1)),
          ZERO_ADDRESS,
          ether("0"),
          ether("0"),
          ZERO_ADDRESS,
          0,
          0
        )
      );
  
      await expectRevert.unspecified(
        swaps.createOrder(
          await swaps.createKey(accounts[1]),
          accounts[0],
          accounts[0],
          1000,
          1500,
          now.add(duration.minutes(1)),
          ZERO_ADDRESS,
          ether("0"),
          ether("0"),
          ZERO_ADDRESS,
          0,
          0
        )
      );
    });
  
    it("should fail expiration date in past", async () => {
      await expectRevert.unspecified(
        swaps.createOrder(
          await swaps.createKey(accounts[0]),
          accounts[0],
          accounts[1],
          1000,
          1500,
          now.sub(duration.minutes(1)),
          ZERO_ADDRESS,
          ether("0"),
          ether("0"),
          ZERO_ADDRESS,
          0,
          0
        )
      );
    });
  
    it("can deposit eth several times", async () => {
      const id = await swaps.createKey(accounts[0]);
  
      await swaps.createOrder(
        id,
        ZERO_ADDRESS,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes(1)),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        ZERO_ADDRESS,
        0,
        0
      );
  
      const from = accounts[0];
      const value = baseLimit.div(new BN("4"));
      let expectedBalance = new BN("0");
      for (let i = 0; i < 3; i++) {
        const { logs } = await depositToken(swaps, id, ZERO_ADDRESS, value, from);
        expectedBalance = expectedBalance.add(value);
        expectEvent.inLogs(logs, "Deposit", {
          token: ZERO_ADDRESS,
          user: from,
          amount: value,
          balance: expectedBalance
        });
      }
    });
  
    it("can deposit tokens several times", async () => {
      const id = await swaps.createKey(accounts[0]);
      await swaps.createOrder(
        id,
        ZERO_ADDRESS,
        quoteToken.address,
        baseLimit,
        quoteLimit,
        now.add(duration.minutes(1)),
        ZERO_ADDRESS,
        ether("0"),
        ether("0"),
        ZERO_ADDRESS,
        0,
        0
      );
  
      const from = accounts[0];
      const value = quoteLimit.div(new BN("4"));
      let expectedBalance = new BN("0");
      for (let i = 0; i < 3; i++) {
        const { logs } = await depositToken(swaps, id, quoteToken, value, from);
        expectedBalance = expectedBalance.add(value);
        expectEvent.inLogs(logs, "Deposit", {
          token: quoteToken.address,
          user: from,
          amount: value,
          balance: expectedBalance
        });
      }
    });
  });
