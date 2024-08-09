import axios from "axios"
import { Router } from "express"
import crypto from "crypto"
const router = Router()
import { config } from "dotenv"
import Utilisateur from "../models/utilisateur.js"

config()

router.all("/addcardgateway/:idToUse",async (req,res)=>{
    if(!req.body.idToUse && !req.params.idToUse){
        res.status(400).send("Id not sent")
        return
    }
    console.log("from addcardgateway: ",req.body.idToUse)
    const postData = {
        clientid: process.env.CLIENTID,
        amount: "1.00",
        okUrl: process.env.OKURL+`/${req.params.idToUse}`,
        failUrl: process.env.FAILURL+`/${req.params.idToUse}`,
        TranType: "PreAuth",
        callbackUrl: process.env.CALLBACKURL,
        currency: "504",
        rnd: getMicrosecondsSinceEpoch(),
        storetype: "3DPAYHOSTING",
        hashAlgorithm: "ver3",
        lang: "fr",
        encoding: "UTF-8",
        MERCHANTSAFE: "MERCHANTSAFE",
        MERCHANTSAFEKEY: "toBeRemovedLater", //rib
        MERCHANTSAFEAUTHTYPE: "3DPAYAUTH",
        MERCHANTSAFEACQUIRER: process.env.MERCHANTSAFEACQUIRER,
        MERCHANTGROUPID: process.env.MERCHANTGROUPID
      };
    
    const storeKey = process.env.STOREKEY; // Set by the merchant or delivered by the CMI Integration team
    const hash = createHashFromPostData(postData, storeKey);
    postData.HASH = hash;

    let formHtml = '<html><head><title>Redirecting...</title></head><body onload="document.forms[0].submit()">';
    formHtml += '<form method="post" action="https://testpayment.cmi.co.ma/fim/est3Dgate">';

    for (const [key, value] of Object.entries(postData)) {
        formHtml += `<input type="hidden" name="${key}" value="${value}" />\n`;
    }

    formHtml += '</form></body></html>';
    
    res.send(formHtml);
})


function createHashFromPostData(postData, storeKey) {
    const postParams = Object.keys(postData).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    let hashval = '';
    postParams.forEach(param => {
        const paramValue = postData[param].trim();
        const escapedParamValue = paramValue.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
        
        const lowerParam = param.toLowerCase();
        if (lowerParam !== 'hash' && lowerParam !== 'encoding') {
            hashval += escapedParamValue + '|';
        }
        // console.log(lowerParam,":",escapedParamValue)
    });

    const escapedStoreKey = storeKey.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
    hashval += escapedStoreKey;

    const calculatedHashValue = crypto.createHash('sha512').update(hashval, 'utf8').digest('hex');
    const hash = Buffer.from(calculatedHashValue, 'hex').toString('base64');
    
    return hash;
}

function getMicrosecondsSinceEpoch() {
    const now = new Date();
    return (now.getTime() * 1000 + now.getMilliseconds() * 1000).toString();
  }

export default router
