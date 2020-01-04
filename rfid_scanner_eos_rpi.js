"use strict";
const mfrc522 = require("mfrc522-rpi");
const piezo =  require('rpio-rtttl-piezo');
const ngeohash = require('ngeohash');

require('log-timestamp');

const { Api, JsonRpc, RpcError } = require ('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('util');


// Setup the RFID scanner's access to the EOS blockchain.
// A demonstration account is setup to allow RFID scanners to submit
// their scanned tag UID to a blockchain smart contract.
// This account is called "eosiot11node"
// Furthermore, a special permission has been made availble publicly just
// for this project.  The permission is called "scan" and it can only submit
// scanned tag data to the "submit" method of the contract on eosiot11rfid.
// The private key to allow this device to use the "scan" permission is
// provided below.
const defaultPrivateKey = "5KfjeKpRzAu3DVsk7iHENozkfaRRthTcpEJsk4jQcBPQopSHtX5";
const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);

// Specify an EOS blockchain API endpoint to connect to.

// Connect to the EOS Jungle2.0 Testnet. The testnet performs and operates
// similarly to the mainnet but with unlimited free-to-access resources.  Because
// resources are free, this network is operated on a best-effort basis.
const rpc = new JsonRpc('http://jungle2.cryptolions.io', { fetch });

// The EOS mainnet is the flagship network that rewards block miners (producers)
// with tokens that exchange for real fiat currency - so there is incentive to maintain this
// network.  However because there is real value in the tokens powering this network, 
// resources are scarce and come with a cost.  Currently this cost is too high (CPU).
// We will be using the testnet for demonstration until the EOS core group figures out a 
// solution to the CPU crunch.
//const rpc = new JsonRpc('http://eos.eoscafeblock.com', { fetch });

const api = new Api({ rpc, signatureProvider, textDecoder:new TextDecoder(), textEncoder: new TextEncoder()});

// Device geohash encoded location (lat, lon only) string.
// The application tries to look it up using an IP location resolving service.
// This WILL be highly innacurate and won't pinpoint your actual location.
var geohash = "";


function report_scan(devid, uid, time) {

  (async () => {
    const result = await api.transact({
      actions : [{
        account :  'eosiot12rfid',
        name : 'submitgh',
        authorization: [{
          actor: 'eosiot11node',
          permission : 'scan',
        }],
        data: {
          device: 'eosiot11node',
          device_id: devid,
          node_time: time,
          tag_uid : uid,
          geohash : geohash,
        },
     }]
   }, {
     blocksBehind : 3,
     expireSeconds : 30,
   });
   console.dir(result);
  })();

}

// Location IP geolocation provider.  Needs to produce latitude and longitude.
const locationLookupURL = "https://extreme-ip-lookup.com/json/";

const getLoc = async url => {
  try {
    const response = await fetch(url);
    const json = await response.json();
    console.log("Location response:");
    console.log(json);
    if (json != undefined && json.status == "success" && json.lat != undefined) {
	geohash = await ngeohash.encode(parseFloat(json.lat), parseFloat(json.lon));
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log("Device's location (geohash encoded): " + geohash);
    // Start the RFID scan loop
    startScanLoop();
  }
  
};



// Get a unique 32-bit device identifier
function getUniqueId() {
   var uniqueId = 0xCAFEBABE;
   var intfs = require('os').networkInterfaces();
   var intf = intfs["eth0"];
   if (intf == undefined) {
      intf = intfs["wlan0"];
   }
   if (intf != undefined) {
      for (var s in intf) {
         var mac = intf[s].mac;
         //console.log(mac);
         if (mac != undefined) {
            var smac = mac.split(':');
            //console.log(parseInt(smac[0],16), smac[1], smac[2], smac[3], smac[0] << 24);
            uniqueId = 
               (parseInt(smac[0],16) << 24) | 
               (parseInt(smac[1],16) << 16) |
               (parseInt(smac[2],16) << 8)  |
               (parseInt(smac[3],16));
            break;
         }
      }
   } else {
      console.log("warning: unique ID could not be generated.");
   }

   return uniqueId & 0x7FFFFFFF;
}

var UniqueId = getUniqueId();

console.log("Device ID: " + UniqueId + " (0x" + UniqueId.toString(16)+")");

//# Init WiringPi with SPI Channel 0
mfrc522.initWiringPi(0);

// Check connection with the blockchain.
async function print_chain() {
  console.log("Blockchain:");
  console.log(await rpc.get_info());
}

print_chain();

// Get the location and trigger the scan loop polling process.
getLoc(locationLookupURL);

function scanSound(type) {
  var rtttl = 'scan:d=4,o=6,b=200:';
  if (type == 0) {
     rtttl += 'g';
  } else { 
     rtttl += 'g,a';
  }
 
  piezo.play({
    pwmOutputPin: 12,
    rtttl: rtttl,
    dutyCycle : 8,
  });
}

function compare_uid(uid1, uid2) {
   if (uid1 == undefined || uid2 == undefined || uid1.length != uid2.length) {
      return false;
   }
   for (var i = 0; i < uid1.length; i++) {
      if (uid1[i] != uid2[i]) {
         return false;
      }
   }
   return true;
}

var no_card_count = 0;
const no_card_count_limit = 2; // 1 second
var last_scan_uid;

function startScanLoop() {
    //# This loop keeps checking for chips. If one is near it will get the UID and authenticate
    console.log("scanning...");
    console.log("Please put chip or keycard in the antenna inductive zone!");
    console.log("Press Ctrl-C to stop.");
    setInterval(scanLoop, 500);
}

// Main RFID scanner loop - performs one scan attempt.
// Must be called periodically, e.g. setInterval(scanLoop, 500);
function scanLoop() {

    //# reset card
    mfrc522.reset();

    //# Scan for cards
    let response = mfrc522.findCard();
    if (!response.status) {
        console.log("No Card");
        if (++no_card_count == no_card_count_limit) {
           // reset the last scanned uid to allow re-scan of the card
           last_scan_uid = undefined;
           no_card_count = 0;
        }
        return;
    }
    
    // Time of the scan in seconds UTC 
    var nowTimeSec = Math.floor(new Date().getTime() / 1000);    

    // Only scan the same tag once.  It must be removed for a period of time before
    // it can be scanned again.  New tags are scanned immediately.
    
    //# Get the UID of the card
    response = mfrc522.getUid();
    if (!response.status) {
        scanSound(1);
        console.log("UID Scan Error");
        return;
    }
    const uid = response.data;
    
    if (compare_uid(last_scan_uid, uid)) {
       console.log("Multiple scan");
       return;
    } else {
       last_scan_uid = uid;
    }

    scanSound(0);
    console.log("Card detected, CardType: " + response.bitSize);

    //# If we have the UID, continue
    console.log("Card read UID (%d): %s %s %s %s", uid.length, 
        uid[0].toString(16), uid[1].toString(16), uid[2].toString(16), uid[3].toString(16));

    //# Select the scanned card
    const memoryCapacity = mfrc522.selectCard(uid);
    console.log("Card Memory Capacity: " + memoryCapacity);

    //# This is the default key for authentication
    const key = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];

    //# Authenticate on Block 8 with key and uid
    if (!mfrc522.authenticate(8, key, uid)) {
        console.log("Authentication Error");
        return;
    }

    //# Dump Block 8
    console.log("Block: 8 Data: " + mfrc522.getDataForBlock(8));

    //# Stop
    mfrc522.stopCrypto();

    // Transact with blockchain
    report_scan(UniqueId, uid, nowTimeSec);

}
