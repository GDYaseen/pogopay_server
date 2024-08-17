import axios from "axios"
import { Router } from "express"
import crypto from "crypto"
const router = Router()
import { config } from "dotenv"
import Utilisateur from "../models/utilisateur.js"
import { read } from "fs"

config()

router.post("/add-card/:idToUse", async (req,res)=>{
    console.log("from add-card: ",req.params.idToUse, req.body.MERCHANTSAFEKEY)
    if(!req.params.idToUse){
        res.status(400).send("Id not sent")
        return
    }
    if(req.body.ProcReturnCode=="00") {//99 if its an error, 00 if its ok. For now keep it 99
        let u = await Utilisateur.findById(req.params.idToUse);
        try{
            u.cards.push({maskedCard:req.body.maskedCreditCard,safeToken:req.body.MERCHANTSAFEKEY,cardLabel:req.body.MERCHANTSAFELABEL,nomProprietaire:req.body.cardHolderName})
            await u.save()
        }catch(e){
            res.status(500).json({message:e,status:'error'})
            console.log(e)
            return
        }
        res.send(`<body><h1>Card added Successfully! Redirecting...</h1><script>
        let cardSaved=true
        </script></body>`)
        return
    }
    res.status(500).json({message:"CMI error",status:'error'})
})

export default router