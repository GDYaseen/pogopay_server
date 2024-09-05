import { Router } from "express"
import { authenticateDashboardToken, authenticateToken } from "../middleware.js"
import { body, validationResult } from "express-validator"
import { parseStringPromise } from "xml2js"
import Utilisateur from "../models/utilisateur.js"
import Paiment from "../models/paiment.js"
import crypto from 'crypto';
import GroupedPaiment from "../models/groupedPaiments.js"
import { Types } from "mongoose"
import BigNumber from "bignumber.js"
import generateFacture from "../util/pdfGenerator.js"
import { config } from "dotenv"

const router = Router()

config()

router.get("/facturer/:id",async (req,res)=>{
  try {
      const { id } = req.params;
      console.log(id)
      let paiments = await GroupedPaiment.findById(id)
        .populate({
          path: "paiments",
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


// paiment validator
const paimentValidator = [
  body("amount").trim().notEmpty().isNumeric(),
  body("target_rib").trim().notEmpty(),
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

router.post("/", authenticateToken, paimentValidator, async (req, res) => {
  try {
    const { amount, target_rib} = req.body
    const { id: emeteur_id } = req.user
    // console.log(amount,target_rib,emeteur_id)
    // recuperatoin des informations nécessaire
    const emeteur = await Utilisateur.findById(emeteur_id)
    // .select(
    //   "cards"
    // )
    const recepteur = await Utilisateur.find({ "marchandData.rib": target_rib})
    // .select(
    //   "cards"
    // )
    if (!emeteur || recepteur.length!=1) {
      return res
        .status(404)
        .json({ message: "Utilisateur introuvable", status: "error" })
    }

    if (emeteur_id == recepteur[0]._id) {
      return res
        .status(400)
        .json({ message: "Paiment impossible", status: "error" })
    }

    const carteNumber = emeteur.cards.length
    if (carteNumber == 0) {
      console.log({ message: "ajouter une carte bancaire", status: "error"})
      return res
        .status(404)
        .json({ message: "ajouter une carte bancaire", status: "error" })
    }

    const defaultCard = emeteur.cards.find(
      (carte) => carte.isdefault
    )
    if (!defaultCard) {
      console.log({ message: "Carte bancaire non trouvée" })
      return res.status(404).json({ message: "Carte bancaire non trouvée" })
    }

    let paiment
    let error = null

// #region CMI PREAUTH, POSTAUTH and ORDERSTATUS


    // // Preauthorization
    const preRequestPayload = `
      <CC5Request>
        <Name>${process.env.CMI_API_NAME}</Name>
        <Password>${process.env.CMI_API_PASS}</Password>
        <ClientId>${process.env.CLIENTID2}</ClientId>
        <Type>PreAuth</Type>
        <Total>${amount}</Total>
        <Currency>504</Currency>
        <Extra>
				<G${process.env.MERCHANTGROUPID}>${defaultCard.safeToken}</G${process.env.MERCHANTGROUPID}>
                <MERCHANTSAFELABEL>${defaultCard.cardLabel}</MERCHANTSAFELABEL>
			  </Extra>
      </CC5Request>
    `
    const preRequestResponse = await fetch(process.env.CMIURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: preRequestPayload,
    })

    const preRequestResponseText = await preRequestResponse.text()

    const { CC5Response: preResponse } = await parseStringPromise(
      preRequestResponseText,
      {
        explicitArray: false,
      }
    )
    

    if (preResponse.Response == "Declined" || preResponse.Response == "Error") {
      const pretrxDate = `${preResponse.Extra.TRXDATE.substring(0, 4)}-${preResponse.Extra.TRXDATE.substring(4, 6)}-${preResponse.Extra.TRXDATE.substring(6, 8)} ${preResponse.Extra.TRXDATE.substring(9)}`
        paiment = await new Paiment({
          emeteur: emeteur_id,
          destinataire: recepteur[0]._id,
          montant: amount,
          dateOperation: new Date(pretrxDate),
          Etat_de_la_transaction: "echouee",
        }).save()

      error={ message: preResponse.ErrMsg, status: preResponse.Response }
    }else{
          // Postauthorization
                const postRequestPayload = `
                  <CC5Request>
                    <Name>${process.env.CMI_API_NAME}</Name>
                    <Password>${process.env.CMI_API_PASS}</Password>
                    <ClientId>${process.env.CLIENTID2}</ClientId>
                    <Type>PostAuth</Type>
                    <OrderId>${preResponse.OrderId}</OrderId>
                  </CC5Request>
                `
                const postRequestResponse = await fetch(process.env.CMIURL, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/xml",
                  },
                  body: postRequestPayload,
                })
                const postRequestResponseText = await postRequestResponse.text()
              
                const { CC5Response: postResponse } = await parseStringPromise(
                  postRequestResponseText,
                  {
                    explicitArray: false,
                  }
                )
              
                // console.log(postResponse)
              
                if (postResponse.Response == "Declined" || postResponse.Response == "Error") {
                  const trxDate = `${postResponse.Extra.TRXDATE.substring(0, 4)}-${postResponse.Extra.TRXDATE.substring(4, 6)}-${postResponse.Extra.TRXDATE.substring(6, 8)} ${postResponse.Extra.TRXDATE.substring(9)}`
                  paiment = await new Paiment({
                    emeteur: emeteur_id,
                    destinataire: recepteur[0]._id,
                    montant: amount,
                    dateOperation: new Date(trxDate),
                    Etat_de_la_transaction: "echouee",
                  }).save()
                    error={ message: postResponse.ErrMsg, status: postResponse.Response }
                }else{  
                            const statusRequestPayload = `
                                   <CC5Request>
                                   <Name>${process.env.CMI_API_NAME}</Name>
                                   <Password>${process.env.CMI_API_PASS}</Password>
                                   <ClientId>${process.env.CLIENTID2}</ClientId>
                                   <OrderId>${preResponse.OrderId}</OrderId>
                                   <Extra>
                                   <ORDERSTATUS>QUERY</ORDERSTATUS>
                               	    </Extra>
                                     </CC5Request>
                                     `
                                     const statusRequestResponse = await fetch(process.env.CMIURL, {
                                       method: "POST",
                                       headers: {
                                         "Content-Type": "application/xml",
                                        },
                                   body: statusRequestPayload,
                                  })
                                 const statusRequestResponseText = await statusRequestResponse.text()
                                
                                 const { CC5Response: statusResponse } = await parseStringPromise(
                                   statusRequestResponseText,
                                   {
                                     explicitArray: false,
                                    }
                                  )

                                  // console.log(statusResponse)
                                  if (statusResponse.Response == "Declined" || statusResponse.Response == "Error") {
                                    paiment = await new Paiment({
                                      emeteur: emeteur_id,
                                      destinataire: recepteur[0]._id,
                                      montant: amount,
                                      dateOperation: new Date(statusResponse.Extra.AUTH_DTTM),
                                      Etat_de_la_transaction: "echouee",
                                    }).save()
                                    error= { message: postResponse.ErrMsg, status: postResponse.Response }
                                  }else{
                                    ////////////////////////////////////////////
                                    // transaction reussite
                                              paiment = await new Paiment({
                                                emeteur: emeteur_id,
                                                destinataire: recepteur[0]._id,
                                                montant: amount,
                                                dateOperation: new Date(statusResponse.Extra.AUTH_DTTM),
                                                Etat_de_la_transaction: "reussie",
                                              }).save()
                                  }
                      }
          }
    // #endregion
    

//temporary
// paiment = await new Paiment({
//   emeteur: emeteur_id,
//   destinataire: recepteur[0]._id,
//   montant: amount,
//   dateOperation: new Date(),
//   Etat_de_la_transaction: "reussie",
// }).save()


    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if(paiment){
          let group = await GroupedPaiment.find({status:"en cours",destinataire:recepteur[0]._id,createdAt: { $gt: startOfToday }})
          if(group.length==0)
            await new GroupedPaiment({
          total:paiment.Etat_de_la_transaction=="reussie"?(paiment.montant*100/(100+5)):0,//ask about the percent later
          destinataire:recepteur[0]._id,
          paiments:[paiment]
        }).save()
        else{
          const montantBig = new BigNumber((paiment.montant*100/(100+5)).toString());
          const totalBig = new BigNumber(group[0].total.toString());
          
          // Add the BigNumber values
          const sumBig = montantBig.plus(totalBig);
          
          // Convert the result back to Decimal128
          const sumDecimal = Types.Decimal128.fromString(sumBig.toString());
          
          paiment.Etat_de_la_transaction=="reussie"?group[0].total = sumDecimal:null;
        group[0].paiments.push(paiment)
        await group[0].save()
      }
    }
    if(error) throw error
    return res.status(200).json({ message: "Paiment success" })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})










// historique
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
            codeVirement: { $first: "$codeVirement" },
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
            codeVirement: 1,
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












router.get("/groupdetails/:id"/*, authenticateDashboardToken*/, async (req, res) => {
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
});

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


router.put("/etat", authenticateDashboardToken,async (req, res) => {
  try {
    const { id, etat , codeVirement} = req.body
    await GroupedPaiment.findByIdAndUpdate(id, { status: etat ,codeVirement:codeVirement})
    res.send({
      message: "État du groupe de transaction est modifié avec succès",
      status: "success",
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

router.post('/add-card', authenticateToken, async (req, res) => {
  const storeKey = "TEST1234"; // Your store key

    // Extract and sort POST parameters
    let postParams = Object.keys(req.body);
    postParams.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    // Construct hash value
    let hashval = '';
    postParams.forEach(param => {
        if (param.toLowerCase() !== 'hash' && param.toLowerCase() !== 'encoding') {
            hashval += req.body[param].trim() + '|';
        }
    });
    hashval += storeKey;
    // Calculate hash
    const calculatedHashValue = crypto.createHash('sha512').update(hashval).digest('base64');
    // Render the form with calculated hash
    res.send(`
        <form id="pay_form" name="pay_form" method="post" action="https://payment.cmi.co.ma/fim/est3Dgate">
            ${postParams.map(param => `<input type="hidden" name="${param}" value="${req.body[param]}" />`).join('\n')}
            <input type="hidden" name="HASH" value="${calculatedHashValue}" /> here i am
        </form>
        <script>
            window.onload = function() {
                document.getElementById('pay_form').submit();
            }
        </script>
    `);
});

export default router
