A lot has happened since I created this project. No, I did not continue to develop a more advanced version of this RFID scanner.  But I did make these [cool air quality sensors](https://www.hackster.io/firmwareguru/blockchain-powered-sensor-system-using-helium-network-57779e) that interface with EOSIO (now Antelope) (Telos) blockchains.  The rest of below is for historical purposes only.

## RFID Scanner Device Software for Blockchain

This software package enables scanning and transmission of RFID tag data to the EOS blockchain.

It scans RFID chips in keycards, fobs, patches, tags etc.  The tags can be used to uniquely identify the items they are attached to in order to provide proof of location and time in supply chain, manufacturing, asset tracking and access control applications.

The software is built in Node.js and ready to run on a **Raspberry Pi 2 or 3**.  It uses the **MFRC522** RFID reader hardware to scan nearby tags.

The EOS blockchain requires no transaction fees, is fast (inclusion within 2 seconds typical), and has an easy to use and globally accessible API.  

**Update**: The scanner device obtains its current location on Planet Earth with a crude IP geolocation lookup at the start of the application.  The location is geohashed and combined with the scanned tag data into a data record.  The location of the scanned tag, along with the tag data, is viewable on a map in the rfid-html web application.


### Prerequisites

Internet connection.

**Hardware**
* Raspberry Pi 2 or 3
* MFRC522 scanner kit
* Buzzer (active)

**Software**
* Latest Raspbian OS (Project worked on a release download as of April 2019)
* Recent Node.js. The version (8.11.1) that comes with Raspbian works.
* NPM package manager.  Install it then update it:
  * `sudo apt-get install npm`
  * `sudo npm i -g npm`
* Git (already installed)

### Setup

#### Hardware

See the [Hackster project](https://www.hackster.io/firmwareguru/build-an-rfid-scanner-for-blockchain-1fbdb3) for hardware setup instructions.

#### Software

Clone this repository onto your Pi:

* `$ git clone https://github.com/EOSIoT/rfid-scanner-node.git`
* `$ cd rfid-scanner-node`

Install project dependencies:

* `$ npm install`

### Using

Run the application with super-user privileges.  Take note of the unique device ID to reference the scanner's data in the [demo web application](https://eosiot.github.io/rfid-html/).

If the application was setup correctly, you will see the results of an initial blockchain *info* request, showing that communication with the designated EOS API endpoint is working.

Example:

```
pi@raspberrypi:~/rfid-scanner-node $ sudo node  rfid_scanner_eos_rpi.js
[2019-05-11T19:32:07.168Z] Device ID: 942140182 (0x3827eb16)
[2019-05-11T19:32:07.177Z] Blockchain:
[2019-05-11T19:32:07.220Z] scanning...
[2019-05-11T19:32:07.221Z] Please put chip or keycard in the antenna inductive zone!
[2019-05-11T19:32:07.221Z] Press Ctrl-C to stop.
[2019-05-11T19:32:07.402Z] { server_version: '448287d5',
  chain_id: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
  head_block_num: 57633625,
  last_irreversible_block_num: 57633298,
  last_irreversible_block_id: '036f6a124baa3eae12b40fdff2fe53f7796663f79b17559636a750bd1a25fbdc',
  head_block_id: '036f6b590d4b20385337d91dc688c46ac92d49bc75a6e0414f48da935c00d94b',
  head_block_time: '2019-05-11T19:32:07.000',
  head_block_producer: 'eos42freedom',
  virtual_block_cpu_limit: 200000000,
  virtual_block_net_limit: 1048576000,
  block_cpu_limit: 181613,
  block_net_limit: 1044592,
  server_version_string: 'v1.7.3' }
[2019-05-11T19:32:07.746Z] No Card
[2019-05-11T19:32:08.266Z] No Card
[2019-05-11T19:32:08.787Z] No Card
[2019-05-11T19:32:26.074Z] Card detected, CardType: undefined
[2019-05-11T19:32:26.075Z] Card read UID (5): 99 2 f6 5c
[2019-05-11T19:32:26.083Z] Card Memory Capacity: 8
[2019-05-11T19:32:26.096Z] Block: 8 Data: 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
[2019-05-11T19:32:28.864Z] No Card
{ transaction_id: 'e8672e52f521c003b6d9b767acc1ce2f8f967ae336a3cfd294fb2b8d89ab9d03',
  processed:
   { id: 'e8672e52f521c003b6d9b767acc1ce2f8f967ae336a3cfd294fb2b8d89ab9d03',
     block_num: 57633669,
     block_time: '2019-05-11T19:32:29.000',
     producer_block_id: null,
     receipt: { status: 'executed', cpu_usage_us: 345, net_usage_words: 15 },
     elapsed: 345,
     net_usage: 120,
     scheduled: false,
     action_traces: [ [Object] ],
     except: null } }
[2019-05-11T19:32:29.382Z] No Card
```


To scan a card or tag, place it near (within 2 cm) the mfrc522 reader's top (antenna) side.  You'll hear a beep sound from the buzzer confirming the scan.  The tag's UID and the current time is then bundled up into a transaction and sent to the EOS blockchain where it is quickly absorbed into a block.

The RFID scanner software has a private key enabling it to submit tag data on behalf of the `eosiot11node` account.  The tag's UID data is placed into a database hosted by a smart contract under the `eosiot12rfid` account.

The data generated by the RFID scanner is accessed via simple REST API calls.  There is a simple [web application](https://eosiot.github.io/rfid-html/) that you can use to see the scanned tag data appear on the EOS blockchain in near realtime.




## A Note on the EOS Blockchain

Note: as of now the RFID blockchain demo is using the **EOS Jungle2.0 Testnet** chain.

A [blockchain smart contract](https://github.com/EOSIoT/rfid-contract) **eosiot12rfid** and a device account **eosiot11node** is already setup and waiting to receive the RFID scanner data,so nothing has to be done on the blockchain side to see your scanner data appear on the chain.  The account being "billed" for transaction bandwidth and the account hosting the smart contract are both located on the `mainnet` chain - the EOS flagship blockchain ([realtime status](https://bloks.io/)).  

A finite amount of resources have been pre-allocated to support this project (requiring EOS tokens with real value).  The demonstration device account **eosiot11node** can support a limited number of transactions per day and is therefore suitable for demonstration purposes only.  However, note that this limit is only a function of how much EOS is staked to the account bandwidth.  

If you find utility with this project, a separate node account can be created just for your RFID scanner node(s) and an appropriate amount of EOS can be allocated to support your expected transaction requirements.

Please contact us if this is something you'd like to setup.  We can take care of EOS onboarding, acquiring and deploying the necessary tokens, setting up your accounts and provisioning and supporting the smart contracts as necessary.






