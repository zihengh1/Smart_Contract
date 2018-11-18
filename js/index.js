﻿'use strict'

//合約位址
let contractAddress = $('#contractAddress');

//既有合約位址
let deployedContractAddressInput = $('#deployedContractAddressInput');

//載入既有合約位址按鈕
let loadDeployedContractButton = $('#loadDeployedContractButton');

//部署新合約按鈕
let deployNewContractButton = $('#deployNewContractButton');

//刪除目前合約
let killContractButton = $('#killContractButton')

//登入
let whoami = $('#whoami');
let whoamiButton = $('#whoamiButton');
let copyButton = $('#copyButton');

//更新餘額
let update = $('#update');

//活動紀錄
let logger = $('#logger');

//購買定存金額
let purchase = $('#purchase');

//定存期數
let period = $('#period');

//購買
let purchaseButton = $('#purchaseButton');

//合約期滿
let DoneButton = $('#DoneButton');

//提前解約
let earlyTerminate = $('#earlyTerminate');
let terminateButton = $('#terminateButton');

//存款
let deposit = $('#deposit');
let depositButton = $('#depositButton');

//提款
let withdraw = $('#withdraw');
let withdrawButton = $('#withdrawButton');

//轉帳對象
let transferEtherTo = $('#transferEtherTo');
//轉帳額度
let transferEtherValue = $('#transferEtherValue');
//轉帳按鈕
let transferEtherButton = $('#transferEtherButton');

let bankAddress = "";
let nowAccount = "";

//獲取web3對象
let web3 = new Web3('http://localhost:8545');
//初始化合約
let bank = new web3.eth.Contract(bankAbi);

function log(...inputs) {
	for (let input of inputs) {
		if (typeof input === 'object') {
			input = JSON.stringify(input, null, 2)
		}
		logger.html(input + '\n' + logger.html())
	}
}

init()
//獲取帳號
async function init() {
	let accounts = await web3.eth.getAccounts()

	for (let account of accounts) {
		whoami.append(`<option value="${account}">${account}</option>`)
	}
	nowAccount = whoami.val();

	update.trigger('click')

	log(accounts, '以太帳戶')
}

// 當按下載入既有合約位址時
loadDeployedContractButton.on('click', function () {
	loadBank(deployedContractAddressInput.val())
})

// 當按下部署合約時
deployNewContractButton.on('click', function () {
	newBank()
})

// 當按下登入按鍵時
whoamiButton.on('click', function () {

	nowAccount = whoami.val();

	update.trigger('click')

})

// 當按下複製按鍵時
copyButton.on('click', function () {
	let textarea = $('<textarea />')
	textarea.val(whoami.val()).css({
		width: '0px',
		height: '0px',
		border: 'none',
		visibility: 'none'
	}).prependTo('body')

	textarea.focus().select()

	try {
		if (document.execCommand('copy')) {
			textarea.remove()
			return true
		}
	} catch (e) {
		console.log(e)
	}
	textarea.remove()
	return false
})

// 當按下更新按鍵時
update.on('click', async function () {
	if (bankAddress != "") {
		let ethBalance = await web3.eth.getBalance(nowAccount)
		let bankBalance = await bank.methods.getBankBalance().call({ from: nowAccount })

		log({
			address: bankAddress,
			ethBalance: ethBalance,
			bankBalance: bankBalance
		})
		log('更新帳戶資料')

		$('#ethBalance').text('以太帳戶餘額 (wei): ' + ethBalance)
		$('#bankBalance').text('銀行ETH餘額 (wei): ' + bankBalance)
	}
	else {
		let ethBalance = await web3.eth.getBalance(nowAccount)

		$('#ethBalance').text('以太帳戶餘額 (wei): ' + ethBalance)
		$('#bankBalance').text('銀行ETH餘額 (wei): ')
	}
})

// 當按下刪除合約按鈕時
killContractButton.on('click', async function () {

	if (bankAddress == "") {
		return;
	}

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面 
	waitTransactionStatus();
	// 刪除合約
	bank.methods.kill().send({
		from: nowAccount,
		gas: 3400000
	})
		.on('receipt', function (receipt) {
			log(bankAddress, '成功刪除合約');

			bankAddress = "";
			contractAddress.text('合約位址:' + bankAddress)
			deployedContractAddressInput.val(bankAddress)

			// 觸發更新帳戶資料
			update.trigger('click');

			// 更新介面 
			doneTransactionStatus();
		})
		.on('error', function (error) {
			log(error.toString())
			// 更新介面 
			doneTransactionStatus();
		})
})

// 當按下存款按鍵時
depositButton.on('click', async function () {

	if (bankAddress == "") {
		return;
	}

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面 
	waitTransactionStatus();
	// 存款
	bank.methods.deposit().send({
		from: nowAccount,
		gas: 3400000,
		value: web3.utils.toWei(deposit.val(), 'ether')
	})
		.on('receipt', function (receipt) {
			log(receipt.events.DepositEvent.returnValues, '存款成功')

			// 觸發更新帳戶資料
			update.trigger('click')

			// 更新介面 
			doneTransactionStatus()
		})
		.on('error', function (error) {
			log(error.toString())
			// 更新介面 
			doneTransactionStatus()
		})
})

// 當按下提款按鍵時
withdrawButton.on('click', async function () {

	if (bankAddress == "") {
		return;
	}

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面
	waitTransactionStatus()
	// 提款
	bank.methods.withdraw(parseInt(withdraw.val(), 10)).send({
		from: nowAccount,
		gas: 3400000
	})
		.on('receipt', function (receipt) {
			log(receipt.events.WithdrawEvent.returnValues, '提款成功')

			// 觸發更新帳戶資料
			update.trigger('click')

			// 更新介面 
			doneTransactionStatus()
		})
		.on('error', function (error) {
			log(error.toString())
			// 更新介面 
			doneTransactionStatus()
		})
})

// 當按下轉帳按鍵時
transferEtherButton.on('click', async function () {

	if (bankAddress == "") {
		return;
	}

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面
	waitTransactionStatus()
	// 轉帳
	bank.methods.transfer(transferEtherTo.val(), parseInt(transferEtherValue.val(), 10)).send({
		from: nowAccount,
		gas: 3400000
	})
		.on('receipt', function (receipt) {
			log(receipt.events.TransferEvent.returnValues, '轉帳成功')

			// 觸發更新帳戶資料
			update.trigger('click')

			// 更新介面 
			doneTransactionStatus()
		})
		.on('error', function (error) {
			log(error.toString())
			// 更新介面 
			doneTransactionStatus()
		})
})


// 當按下購買按鈕時
purchaseButton.on('click', async function () {

	if (bankAddress == "") {
		return;
	}

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面 
	waitTransactionStatus();
	// 存款
	bank.methods.purchase(parseInt(purchase.val(), 10), parseInt(period.val(), 10)).send({
		from: nowAccount,
		gas: 3400000,
		value: web3.utils.toWei(purchase.val(), 'ether')
	})
		.on('receipt', function (receipt) {
			log(receipt.events.PurchaseCertificateEvent.returnValues, '購買成功')

		$('#ETHcertificate').text('金額: ' + purchase.val())
		$('#ETHperiod').text('期數: ' + period.val())

			// 觸發更新帳戶資料
			update.trigger('click')

			// 更新介面 
			doneTransactionStatus()
		})
        
		.on('error', function (error) {
			log(error.toString())
			// 更新介面 
			doneTransactionStatus()
		})
})

// 當按下合約期滿按鍵時
DoneButton.on('click', async function () {

	if (bankAddress == "") {
		return;
	}

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面
	waitTransactionStatus()
	// 提款
	bank.methods.contractDone().send({
		from: nowAccount,
		gas: 3400000
	})
		.on('receipt', function (receipt) {
			log(receipt.events.ContractExpiryEvent.returnValues, '合約完成')

        $('#ETHcertificate').text('金額: ' + 0)
		$('#ETHperiod').text('期數: ' + 0)

			// 觸發更新帳戶資料
			update.trigger('click')

			// 更新介面 
			doneTransactionStatus()
		})
        
		.on('error', function (error) {
			log(error.toString())
			// 更新介面 
			doneTransactionStatus()
		})
})

// 當按下提前解約按鍵時
terminateButton.on('click', async function () {

	if (bankAddress == "") {
		return;
	}

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面
	waitTransactionStatus()
	// 提款
	bank.methods.earlyTerminate(parseInt(earlyTerminate.val(), 10)).send({
		from: nowAccount,
		gas: 3400000
	})
		.on('receipt', function (receipt) {
			log(receipt.events.EarlyTerminationEvent.returnValues, '解約成功')
                    
        $('#ETHcertificate').text('金額: ' + 0)
		$('#ETHperiod').text('期數: ' + 0)

			// 觸發更新帳戶資料
			update.trigger('click')

			// 更新介面 
			doneTransactionStatus()
		})
        
		.on('error', function (error) {
			log(error.toString())
			// 更新介面 
			doneTransactionStatus()
		})
})

// 載入bank合約
function loadBank(address) {
	if (!(address === undefined || address === null || address === '')) {

		let bank_temp = new web3.eth.Contract(bankAbi);
		bank_temp.options.address = address;

		if (bank_temp != undefined) {
			bankAddress = address;
			bank.options.address = bankAddress;

			contractAddress.text('合約位址:' + address)
			log(bank, '載入合約')

			update.trigger('click')
		}
		else {
			log(address, '載入失敗')
		}
	}
}

// 新增bank合約
async function newBank() {

	// 解鎖
	let unlock = await unlockAccount();
	if (!unlock) {
		return;
	}

	// 更新介面
	waitTransactionStatus()

	bank.deploy({
		data: bankBytecode
	})
		.send({
			from: nowAccount,
			gas: 3400000
		})
		.on('receipt', function (receipt) {
			log(receipt, '部署合約')

			// 更新合約介面
			bankAddress = receipt.contractAddress
			bank.options.address = bankAddress;
			contractAddress.text('合約位址:' + receipt.contractAddress)
			deployedContractAddressInput.val(receipt.contractAddress)

			update.trigger('click');

			// 更新介面
			doneTransactionStatus();
		})
}

//等待交易
function waitTransactionStatus() {
	$('#accountStatus').html('帳戶狀態 <b style="color: blue">(等待交易驗證中...)</b>')
}

function doneTransactionStatus() {
	$('#accountStatus').text('帳戶狀態')
}

//解鎖帳號
async function unlockAccount() {
	let password = prompt("請輸入你的密碼", "");
	if (password == null) {
		return false;
	}
	else {
		return web3.eth.personal.unlockAccount(nowAccount, password, 60)
			.then(function (result) {
				return true;
			})
			.catch(function (err) {
				alert("密碼錯誤")
				return false;
			});
	}
}