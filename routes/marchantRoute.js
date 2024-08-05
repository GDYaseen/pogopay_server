import { Router } from "express"
import { authenticateToken } from "../middleware.js"
import { body, param, validationResult } from "express-validator"
import bcrypt from "bcrypt"
import Marchant from "../models/marchant.js"
import Utilisateur from "../models/utilisateur.js"
const router = Router()


// data validator for updateUser
const marchantValidator = [
  body("user").trim().notEmpty(),
  body("nomMarchant").trim().notEmpty(),
  body("RC").trim().notEmpty(),
  body("IF").trim().notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errors.array() })
    }
    next()
  },
]

router.get('/clients/search', async (req, res) => {
    try {
      const query = req.query.query || '';
  
      const matchingClients = await Utilisateur.aggregate([
        {
          $lookup: {
            from: 'marchants',          // Name of the Marchant collection
            localField: '_id',          // Field from the Utilisateur collection
            foreignField: 'user',       // Field from the Marchant collection
            as: 'merchantInfo',         // Output array field
          },
        },
        {
          $match: {
            'merchantInfo': { $eq: [] },
            $or: [
              { nom: { $regex: query, $options: 'i' } },
              { prenom: { $regex: query, $options: 'i' } },
              { telephone: { $regex: query, $options: 'i' } },
              { safeToken: { $regex: query, $options: 'i' } },
            ],
          },
        },
        {
          $project: {
            nom: 1,
            prenom: 1,
            telephone: 1,
            safeToken:1,
          },
        },
      ]);
  
      res.json({ clients: matchingClients });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching clients' });
    }
  });

router.post("/addmarchant",marchantValidator, async (req,res)=>{
    try{
        const {user,logo,nomMarchant,RC,IF} = req.body
        if(await Utilisateur.findById(user)==null){
            res.send({ message: "User Id doesn't exist", status: "error" })
            return
        }

        const march = new Marchant({user,logo,nomMarchant,RC,IF})
        await march.save()
        res.send({ message: "Merchant assigned successfully",marchant:march, status: "success" })
    }catch(error) {
        console.error(error.message)
        res.status(500).json({ message: error.message, status: "error" })
    }
})

router.get("/list",async (req,res)=>{
    try{
        const marchs = await Marchant.find().populate({
            path: "user",
            select: ["safeToken"],
          }).exec()
        res.send(marchs)
    }catch(error) {
        console.error(error.message)
        res.status(500).json({ message: error.message, status: "error" })
    }
})

router.get("/:id",async (req,res)=>{
    try{
        const {id} = req.params
        const march = await Marchant.findById(id).populate({
            path: "user",
            select: ["safeToken"],
          }).exec()
        res.send(march)
    }catch(error){
        console.error(error.message)
        res.send(error.message)
    }
})

router.put("/update/:id",async (req,res)=>{
    try{
        const {id} = req.params
        const {logo,nomMarchant,RC,IF} = req.body

        const march = await Marchant.findByIdAndUpdate(id,{
            logo:logo,
            nomMarchant:nomMarchant,
            RC:RC,
            IF:IF
        },{new:true}).populate({
            path: "user",
            select: ["safeToken"],
          }).exec()
        res.send(march)
    }catch(error){
        console.error(error.message)
        res.send(error.message)
    }
})
router.delete("/delete/:id",async (req,res)=>{
    try{
        const {id} = req.params
        
        await Marchant.findByIdAndDelete(id)
        res.send({ message: "Merchant deleted successfully", status: "success" })
    }catch(error){
        console.error(error.message)
        res.send(error.message)
    }
})
export default router