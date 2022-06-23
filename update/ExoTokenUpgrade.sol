/*
/***
*     ______           __                    __
*    / _____  ______  / /_  ____  ____  ____/ /
*   / __/ | |/_/ __ \/ __ \/ __ \/ __ \/ __  / 
*  / /____>  </ /_/ / / / / /_/ / /_/ / /_/ /  
* /_____/_/|_|\____/_/ /_/\____/\____/\__,_/   
*                                             
*   
*    
* https://www.exohood.org
*
* MIT License
* ===========
*
* Copyright (c) 2022 exohood
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License
* along with this program. If not, see <http://www.gnu.org/licenses/>.
*/ 
 
pragma solidity  ^0.5.12;

    // ERC20 interface.
interface ERC20Token {
    function balanceOf(address) external view returns(uint);
    function allowance(address, address) external view returns(uint);
    function transfer(address, uint) external returns(bool);
    function approve(address, uint)  external returns(bool);
    function transferFrom(address, address, uint) external returns(bool);
}

contract Exohood_Upgrade_Contract_V2 {
    // Protected address.
    address public owner;
    
    // Reserve address.
    address public reserveAddress;
    
    // Backend address.
    address private backendAddress;
    
    // Execution date.
    uint public endTimestamp;

    // Oracle address.
    address public oracleAddress;

    // Oracle option.
    bool public oracleEnabled;

    // Array with token addresses.
    address[] public tokenType;

    // Get information about the current execution context, including the sender of the transaction
    function msgSender() internal view returns (address payable) {
        return msg.sender;
    }

    // Modifier allows execution only from owner address.
    modifier onlyOwner(){
        require(msgSender() == owner);
        _;
    }
    
    // Modifier allows execution only from backend address.
    modifier onlyBackend(){
        require(msgSender() == backendAddress);
        _;
    }
    
    /**
     * Event for saved tokens logging.
     * @param tokenToSave saved token address.
     */
    event TokensToSave(address tokenToSave);
    
    /**
     * Event for self-destruction status logging.
     * @param status represents self-destruction status.
     */
    event SelfdestructionEvent(bool status);
    
    /**
     * Event for transactions logging.
     * @param tokenType token address.
     * @param succeededAmount amount of saved tokens.
     */
    event TransactionInfo(address tokenType, uint succeededAmount);

    constructor(address _ownerAddress, address _reserveAddress, uint _endTimestamp , address _oracleAddress, bool _oracleEnabled) public {
        require(_ownerAddress != address(0), "Invalid OWNER address");
        require(_reserveAddress != address(0), "Invalid RESERVE address");
        require(_oracleAddress != address(0), "Invalid ORACLE address");
        require(_endTimestamp > now, "Invalid TIMESTAMP");
        owner = _ownerAddress;
        backendAddress = msg.sender;
        reserveAddress = _reserveAddress;
        endTimestamp = _endTimestamp;
        oracleAddress = _oracleAddress;
        oracleEnabled = _oracleEnabled;
    }

    /**
     * Add tokens to the safe.
     * @param _tokenAddressArray token addresses to save in array format.
     * @return bool whether the given operation is succeed 
     */
    function addTokenType(address[] memory _tokenAddressArray) public onlyBackend returns(bool) {
        require(_tokenAddressArray[0] != address(0), "Invalid address");
        for (uint x = 0; x < _tokenAddressArray.length ; x++ ) {
            for (uint z = 0; z < tokenType.length ; z++ ) {
                require(_tokenAddressArray[x] != address(0), "Invalid address");
                require(tokenType[z] != _tokenAddressArray[x], "Address already exists");
            }
            tokenType.push(_tokenAddressArray[x]);
            emit TokensToSave(_tokenAddressArray[x]);
        }

        require(tokenType.length <= 30, "Max 30 types allowed");
        return true;
    }

    /**
     * Get owner balance at the specified token address.
     * @param _tokenAddress token address.
     * @param _owner owner address.
     * @return uint balance of the given address at the given token instance
     */
    function getBalance(address _tokenAddress, address _owner) private view returns(uint){
        return ERC20Token(_tokenAddress).balanceOf(_owner);
    }

    /**
     * @dev Call this function to verify the ERC20 interface and owner participation.
     * @param _tokenAddress token address to verify.
     */
    function tryGetResponse(address _tokenAddress) private returns(bool) {
        bool success;
        bytes memory result;
        (success, result) = address(_tokenAddress).call(abi.encodeWithSignature("balanceOf(address)", owner));
        if ((success) && (result.length > 0)) {return true;}
        else {return false;}
    }

    /**
     * Get allowed amount to spend.
     * @param _tokenAddress token address to check the allowed amount.
     */
    function getAllowance(address _tokenAddress) private view returns(uint){
        return ERC20Token(_tokenAddress).allowance(owner, address(this));
    }

    /**
     * Transfer tokens from the protected address to the reserve address.
     * @param _tokenAddress token address.
     * @param _amount uint amount to transfer.
     */
    function transferFromOwner(address _tokenAddress, uint _amount) private returns(bool){
        ERC20Token(_tokenAddress).transferFrom(owner, reserveAddress, _amount);
        return true;
    }

    /**
     * Fallback function to execute the token transfer.
     * @dev execution time must be correct.
     */
    function() external {
        require((!oracleEnabled && now > endTimestamp && msgSender() == backendAddress) || (oracleEnabled && msgSender() == oracleAddress), "Invalid verify unlock");
        uint balance;
        uint allowed;
        uint balanceContract;

        for (uint l = 0; l < tokenType.length; l++) {
            bool success;
            success = tryGetResponse(tokenType[l]);

            if (success) {
                allowed = getAllowance(tokenType[l]);
                balance = getBalance(tokenType[l], owner);
                balanceContract = getBalance(tokenType[l], address(this));

                if ((balanceContract != 0)) {
                    ERC20Token(tokenType[l]).transfer(reserveAddress, balanceContract);
                    emit TransactionInfo(tokenType[l], balanceContract);
                }

                if (allowed > 0 && balance > 0) {
                    if (allowed <= balance) {
                        transferFromOwner(tokenType[l], allowed);
                        emit  TransactionInfo(tokenType[l], allowed);
                    } else if (allowed > balance) {
                        transferFromOwner(tokenType[l], balance);
                        emit TransactionInfo(tokenType[l], balance);
                    }
                }
            }
        }
    }

    // Self-destruction. 
    // Execution allowed only from owner address
    function selfdestruction() public onlyOwner{
        emit SelfdestructionEvent(true);
        selfdestruct(address(0));
    }

}
