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
* https://www.exohood.com
*
* MIT License
* ===========
*
* Copyright (c) 2020 - 2022 Exohood Protocol
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

pragma solidity ^0.4.23;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  constructor() public {
    owner = msg.sender;
  }

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) public restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
