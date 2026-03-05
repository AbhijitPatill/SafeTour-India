// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TouristID {
    uint256 private _tokenIdCounter;

    struct Tourist {
        uint256 tokenId;
        string name;
        string nationality;
        string idType;
        string idNumber;
        address walletAddress;
        uint256 issuedAt;
        bool isActive;
    }

    mapping(uint256 => Tourist) public tourists;
    mapping(address => uint256) public walletToTokenId;
    mapping(address => bool) public isRegistered;

    event TouristIDMinted(
        uint256 indexed tokenId,
        address indexed wallet,
        string name,
        uint256 issuedAt
    );

    event TouristIDRevoked(uint256 indexed tokenId, address indexed wallet);

    function mintTouristID(
        string memory _name,
        string memory _nationality,
        string memory _idType,
        string memory _idNumber
    ) public returns (uint256) {
        require(!isRegistered[msg.sender], "Wallet already has a Tourist ID!");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        tourists[newTokenId] = Tourist({
            tokenId: newTokenId,
            name: _name,
            nationality: _nationality,
            idType: _idType,
            idNumber: _idNumber,
            walletAddress: msg.sender,
            issuedAt: block.timestamp,
            isActive: true
        });

        walletToTokenId[msg.sender] = newTokenId;
        isRegistered[msg.sender] = true;

        emit TouristIDMinted(newTokenId, msg.sender, _name, block.timestamp);

        return newTokenId;
    }

    function getTouristByWallet(address _wallet) public view returns (Tourist memory) {
        require(isRegistered[_wallet], "Wallet not registered!");
        uint256 tokenId = walletToTokenId[_wallet];
        return tourists[tokenId];
    }

    function getTouristByTokenId(uint256 _tokenId) public view returns (Tourist memory) {
        require(tourists[_tokenId].isActive, "Token ID not found!");
        return tourists[_tokenId];
    }

    function getTotalTourists() public view returns (uint256) {
        return _tokenIdCounter;
    }

    function revokeTouristID(uint256 _tokenId) public {
        require(tourists[_tokenId].walletAddress == msg.sender, "Not your Tourist ID!");
        tourists[_tokenId].isActive = false;
        isRegistered[msg.sender] = false;
        emit TouristIDRevoked(_tokenId, msg.sender);
    }
}