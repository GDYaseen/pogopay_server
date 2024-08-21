import { Router } from "express"
import { authenticateDashboardToken, authenticateToken } from "../middleware.js"
import { body, param, validationResult } from "express-validator"
import bcrypt from "bcrypt"
// import Marchand from "../models/marchand.js"
import Utilisateur from "../models/utilisateur.js"
const router = Router()


// data validator for updateUser
const marchandValidator = [
  body("user").trim().notEmpty(),
  body("nomMarchand").trim().notEmpty(),
  body("RC").trim().notEmpty(),
  body("rib").trim().notEmpty(),
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

router.get('/clients/search', authenticateDashboardToken, async (req, res) => {
  try {
    const query = req.query.query || '';
  
      const matchingClients = await Utilisateur.aggregate([
        {
          $match: {
            $and:[
              { "marchandData.nomMarchant": { $exists: false} },
              { "marchandData.percent": { $exists: false} },
              { "marchandData.RC": { $exists: false} },
              { "marchandData.IF": { $exists: false} },
              { "marchandData.rib": { $exists: false} }
            ],
            $or: [
              { nom: { $regex: query, $options: 'i' } },
              { prenom: { $regex: query, $options: 'i' } },
              { telephone: { $regex: query, $options: 'i' } },
            ],
          },
        },
        {
          $project: {
            nom: 1,
            prenom: 1,
            telephone: 1,
          },
        },
      ]);
  
      res.json({ clients: matchingClients });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching clients' });
    }
  });

router.post("/addmarchand",authenticateDashboardToken,marchandValidator, async (req,res)=>{
    try{
        const {user,logo,nomMarchand,RC,rib,IF,percent} = req.body
        let u = await Utilisateur.findById(user) 
        if(u==null){
            res.send({ message: "User Id doesn't exist", status: "error" })
            return
        }
        u.photo=logo
        u.marchandData = {nomMarchand,RC,rib,IF,percent}
        await u.save()
        res.send({ message: "Merchant assigned successfully",marchand:u.marchandData, status: "success" })
    }catch(error) {
        console.error(error.message)
        res.status(500).json({ message: error.message, status: "error" })
    }
})

router.get("/list",authenticateDashboardToken,async (req,res)=>{
    try{
        const marchs = await Utilisateur.find({$or: [
          { "marchandData.nomMarchant": { $exists: true, $ne: "" } },
          { "marchandData.percent": { $exists: true, $ne: "" } },
          { "marchandData.RC": { $exists: true, $ne: "" } },
          { "marchandData.IF": { $exists: true, $ne: "" } },
          { "marchandData.rib": { $exists: true, $ne: "" } }
        ]})
        res.send(marchs)
    }catch(error) {
        console.error(error.message)
        res.status(500).json({ message: error.message, status: "error" })
    }
})


router.put("/update/:id",authenticateDashboardToken,async (req,res)=>{
    try{
        const {id} = req.params
        const {logo,nomMarchand,RC,rib,IF,percent} = req.body
        const march = await Utilisateur.findByIdAndUpdate(id,{photo:logo,marchandData:{nomMarchand,RC,IF,percent,rib}},{new:true})
        res.send(march)
    }catch(error){
        console.error(error.message)
        res.send(error.message)
    }
})
router.delete("/delete/:id",authenticateDashboardToken,async (req,res)=>{
    try{
        const {id} = req.params
        let u = await Utilisateur.findById(id)
        u.marchandData={}
        await u.save()
        res.send({ message: "Merchant deleted successfully", status: "success" })
    }catch(error){
        console.error(error.message)
        res.send(error.message)
    }
})
export default router