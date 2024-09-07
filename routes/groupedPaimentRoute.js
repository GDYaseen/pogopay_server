import { Router } from "express"
import { authenticateDashboardToken, authenticateToken } from "../middleware.js"
import Utilisateur from "../models/utilisateur.js"
import Paiment from "../models/paiment.js"
import GroupedPaiment from "../models/groupedPaiments.js"
import { Types } from "mongoose"
import generateFacture from "../util/pdfGenerator.js"
import { config } from "dotenv"
import multer from "multer"

const upload = multer()
const router = Router()

config()

router.get("/facturer/:id",async (req,res)=>{
    try {
        const { id } = req.params;
        // console.log(id)
        let paiments = await GroupedPaiment.findById(id)
          .populate({
            path: "paiments",
            match: { Etat_de_la_transaction: "reussie" },
            populate: {
              path: "emeteur",
              select: ["nom", "prenom", "telephone"]
            }
          })
          .populate({
            path: "destinataire",
            select: ["nom", "prenom", "telephone", "marchandData","photo"],
          })
          .exec();
    
      const pdfBuffer = await generateFacture(paiments,id)
  
      res.setHeader('Content-Disposition', 'inline; filename="document.pdf"'); // Use inline for previewing
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error creating PDF:', error);
      res.status(500).send('Internal Server Error');
    }
})

router.get("/recuVir/:id",async (req,res)=>{
    try {
        
        const { id } = req.params;
        let paiments = await GroupedPaiment.findById(id).select("recuVirement")
        const pdfBuffer = paiments.recuVirement
  
        res.setHeader('Content-Disposition', 'inline; filename="document.pdf"'); // Use inline for previewing
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    } catch (error) {
      console.error('Error creating PDF:', error);
      res.status(500).send('Internal Server Error');
    }
})

router.get("/historique/:etat", authenticateDashboardToken,async (req, res) => {
    try {
      const { etat } = req.params;
      let statusFilter
      switch (etat) {
        case "encours":
            statusFilter = "en cours"
          break;
        case "echouee":
            statusFilter = "échouer"
          break;
        case "reussie":
            statusFilter = "reussie"
          break;
        default:
          historique = [];
          break;
      }
      let historique = await GroupedPaiment.find({status:statusFilter})
        .populate({
          path: "destinataire",
          select: ["nom", "prenom", "telephone", "marchandData"],
        })
        .exec();
      res.send(historique);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: error.message, status: "error" });
    }
  });
  
  
router.put("/etat", authenticateDashboardToken,upload.single("recuVirement"),async (req, res) => {
    try {
      const { id, etat } = req.body
      
      const recuVirement  = req.file
  
      await GroupedPaiment.findByIdAndUpdate(id, { status: etat ,recuVirement :recuVirement.buffer})
      res.send({
        message: "État du groupe de transaction est modifié avec succès",
        status: "success",
      })
    } catch (error) {
      console.error(error.message)
      res.status(500).json({ message: error.message, status: "error" })
    }
})

  
router.get("/groupdetails/:id", authenticateDashboardToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // Get the status query parameter

    // Step 1: Fetch all paiments for counting
    let allPaiments = await GroupedPaiment.findById(id)
      .populate({
        path: "paiments",
        populate: {
          path: "emeteur",
          select: ["nom", "prenom", "telephone"]
        }
      })
      .populate({
        path: "destinataire",
        select: ["nom", "prenom", "telephone", "marchandData"],
      }).lean()
      .exec();

    const reussieCount = allPaiments.paiments.filter((t) => t.Etat_de_la_transaction === "reussie").length;
    const echoueeCount = allPaiments.paiments.filter((t) => t.Etat_de_la_transaction === "echouee").length;

    let filteredPaiments = allPaiments;
    if (status) {
      filteredPaiments.paiments = allPaiments.paiments.filter((t) => t.Etat_de_la_transaction === status);
    }

    filteredPaiments.reussieCount = reussieCount;
    filteredPaiments.echoueeCount = echoueeCount;

    res.send(filteredPaiments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message, status: "error" });
  }
})

router.get("/paymentsinday/:groupid", authenticateToken, async (req, res) => {
  try {
    const { groupid } = req.params;
    const { id } = req.user
      // const isEmeteur = req.query.isEmeteur;
      const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
      const limit = parseInt(req.query.limit) || 20; // Default to 20 documents per page
      const skip = (page - 1) * limit; // Calculate the number of documents to skip

    // Step 1: Fetch all paiments for counting
    const historique = await GroupedPaiment.aggregate([
      {
        $match: { _id: new Types.ObjectId(groupid)},
      },{
        $lookup: {
          from: "paiments", // The collection name for Utilisateur model
          localField: "paiments",
          foreignField: "_id",
          as: "paimentsList",
        },
      },
      {
        $unwind: "$paimentsList", // Unwind paimentsList to work with each paiment individually
      },
      {
        $lookup: {
          from: "utilisateurs", // Lookup the emeteur details for each paiment
          localField: "paimentsList.emeteur",
          foreignField: "_id",
          as: "paimentsList.emeteurDetails",
        },
      },
      {
        $unwind: "$paimentsList.emeteurDetails", // Unwind emeteurDetails to ensure it's a single object
      },
      {
        $sort: { "paimentsList.dateOperation": -1 }, // Sort by dateOperation in descending order
      },
      {
        $skip: skip, // Skip the first (page - 1) * limit documents
      },
      {
        $limit: limit, // Limit the results to `limit` documents per page
      }, {
        $group: {
          _id: "$_id",
          total: { $first: "$total" },
          status: { $first: "$status" },
          hasRecuVirement: { $first: { $cond: [{ $ifNull: ["$recuVirement", false] }, true, false] } },
          createdAt: { $first: "$createdAt" },
          destinataire: { $first: "$destinataire" },
          paimentsList: {
            $push: {
              _id: "$paimentsList._id",
              dateOperation: "$paimentsList.dateOperation",
              montant: "$paimentsList.montant",
              Etat_de_la_transaction: "$paimentsList.Etat_de_la_transaction",
              emeteurDetails: "$paimentsList.emeteurDetails",
            },
          },
        },
      },
      {
        $project: {
          "paimentsList._id": 1,
          "paimentsList.dateOperation": 1,
          "paimentsList.montant": 1,
          "paimentsList.Etat_de_la_transaction": 1,
          "paimentsList.emeteurDetails.nom": 1,
          "paimentsList.emeteurDetails.prenom": 1,
          "paimentsList.emeteurDetails.telephone": 1,
          "paimentsList.emeteurDetails.marchandData": 1,
          createdAt: 1,
          total: 1,
          hasRecuVirement: 1,
          status: 1,
        },
      },
      
    ])

    res.status(200).json(historique[0])
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message, status: "error" });
  }
});

router.get("/historique", authenticateToken, async (req, res) => {
    try {
      const { id } = req.user
      const isEmeteur = req.query.isEmeteur;
      const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
      const limit = parseInt(req.query.limit) || 20; // Default to 30 documents per page
      const skip = (page - 1) * limit; // Calculate the number of documents to skip
  
      if(isEmeteur=='false' && isEmeteur!=undefined){
        const historique = await GroupedPaiment.aggregate([
          {
            $match: { destinataire: new Types.ObjectId(id)},
          },{
            $lookup: {
              from: "paiments", // The collection name for Utilisateur model
              localField: "paiments",
              foreignField: "_id",
              as: "paimentsList",
            },
          },
          {
            $unwind: "$paimentsList", // Unwind paimentsList to work with each paiment individually
          },
          {
            $lookup: {
              from: "utilisateurs", // Lookup the emeteur details for each paiment
              localField: "paimentsList.emeteur",
              foreignField: "_id",
              as: "paimentsList.emeteurDetails",
            },
          },
          {
            $unwind: "$paimentsList.emeteurDetails", // Unwind emeteurDetails to ensure it's a single object
          }, {
            $group: {
              _id: "$_id",
              total: { $first: "$total" },
              status: { $first: "$status" },
              hasRecuVirement: { $first: { $cond: [{ $ifNull: ["$recuVirement", false] }, true, false] } },
              createdAt: { $first: "$createdAt" },
              destinataire: { $first: "$destinataire" },
              paimentsList: {
                $push: {
                  _id: "$paimentsList._id",
                  dateOperation: "$paimentsList.dateOperation",
                  montant: "$paimentsList.montant",
                  Etat_de_la_transaction: "$paimentsList.Etat_de_la_transaction",
                  emeteurDetails: "$paimentsList.emeteurDetails",
                },
              },
            },
          },
          {
            $project: {
              "paimentsList._id": 1,
              "paimentsList.dateOperation": 1,
              "paimentsList.montant": 1,
              "paimentsList.Etat_de_la_transaction": 1,
              "paimentsList.emeteurDetails.nom": 1,
              "paimentsList.emeteurDetails.prenom": 1,
              "paimentsList.emeteurDetails.telephone": 1,
              "paimentsList.emeteurDetails.marchandData": 1,
              createdAt: 1,
              total: 1,
              hasRecuVirement: 1,
              status: 1,
            },
          },
          {
            $sort: { createdAt: -1 }, // Sort by dateOperation in descending order
          },
          {
            $skip: skip, // Skip the first (page - 1) * limit documents
          },
          {
            $limit: limit, // Limit the results to `limit` documents per page
          },
        ])
        const destinataire = await Utilisateur.findById(id)
        res.status(200).json({isEmeteur:false,destinataire,historique})
        return
      }
  
      const historique = await Paiment.aggregate([
        {
          $match: isEmeteur==undefined?
            {$or:[{ emeteur: new Types.ObjectId(id) },{ destinataire: new Types.ObjectId(id) }],Etat_de_la_transaction:"reussie"}:
            isEmeteur=="true"?{ emeteur: new Types.ObjectId(id) ,Etat_de_la_transaction:"reussie"}:{ destinataire: new Types.ObjectId(id) ,Etat_de_la_transaction:"reussie"},
        },
        {
          $lookup: {
            from: "utilisateurs", // The collection name for Utilisateur model
            localField: "emeteur",
            foreignField: "_id",
            as: "emeteurDetails",
          },
        },
        {
          $lookup: {
            from: "utilisateurs", // The collection name for Utilisateur model
            localField: "destinataire",
            foreignField: "_id",
            as: "destinataireDetails",
          },
        },
        {
          $addFields: {
            isEmeteur: { $eq: ["$emeteur", new Types.ObjectId(id)] },
          },
        },
        {
          $unwind: "$emeteurDetails",
        },
        {
          $unwind: "$destinataireDetails",
        },
        {
          $project: {
            "emeteurDetails.nom": 1,
            "emeteurDetails.prenom": 1,
            "emeteurDetails.telephone": 1,
            "emeteurDetails.marchandData": 1,
            "destinataireDetails.nom": 1,
            "destinataireDetails.prenom": 1,
            "destinataireDetails.telephone": 1,
            "destinataireDetails.marchandData": 1,
            dateOperation: 1,
            montant: 1,
            Etat_de_la_transaction: 1,
          },
        },
        {
          $sort: { dateOperation: -1 }, // Sort by dateOperation in descending order
        },
        {
          $skip: skip, // Skip the first (page - 1) * limit documents
        },
        {
          $limit: limit, // Limit the results to `limit` documents per page
        },
      ]);
      // if(limit==1) console.log("have been requested",historique)
      res.status(200).json({ historique })
    } catch (error) {
      console.error(error.message)
      res.status(500).json({ message: error.message, status: "error" })
    }
  })

export default router
  