import axios from "axios"
import { Router } from "express"
import crypto from "crypto"
const router = Router()
import { config } from "dotenv"
import Utilisateur from "../models/utilisateur.js"
import { read } from "fs"

config()

router.post("/add-card", async (req,res)=>{
    console.log("addcard")
    if(req.body.ProcReturnCode=="99") {//99 if its an error, 00 if its ok. For now keep it 99
        let u = await Utilisateur.findOne({safeToken:req.body.MERCHANTSAFEKEY});
        //console.log(u)
        try{
            u.cards.push({maskedCard:req.body.maskedCreditCard,cardLabel:req.body.MERCHANTSAFELABEL})
            await u.save()
        }catch(e){
            res.status(500).json({message:e,status:'error'})
            console.log(e)
            return
        }
        res.json({message:'Card added Successfully',status:'success'})
        return
    }
    res.status(500).json({message:"CMI error",status:'error'})
})

export default router