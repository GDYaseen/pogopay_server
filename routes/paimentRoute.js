import { Router } from "express"
import { authenticateToken } from "../middleware.js"
import { body, validationResult } from "express-validator"
import { parseStringPromise } from "xml2js"
import Utilisateur from "../models/utilisateur.js"
import Paiment from "../models/paiment.js"
import crypto from 'crypto';
import GroupedPaiment from "../models/groupedPaiments.js"
import { Types } from "mongoose"
import BigNumber from "bignumber.js"
import generateFacture from "../util/pdfGenerator.js"

const router = Router()

router.get("/facturer/:id",async (req,res)=>{
  try {
      const { id } = req.params;
      
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
          select: ["nom", "prenom", "telephone", "safeToken"],
        })
        .exec();
  
    const pdfBuffer = generateFacture(paiments)

    // res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    res.setHeader('Content-Type', 'application/pdf').send(pdfBuffer);

  } catch (error) {
    console.error('Error creating PDF:', error);
    res.status(500).send('Internal Server Error');
  }
})


// paiment validator
const paimentValidator = [
  body("amount").trim().notEmpty().isNumeric(),
  body("user_id").trim().notEmpty(),
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
    const { amount, user_id: recepteur_id } = req.body
    const { id: emeteur_id } = req.user

    // recuperatoin des informations nécessaire
    const emeteur = await Utilisateur.findById(emeteur_id)
    // .select(
    //   "cards"
    // )
    const recepteur = await Utilisateur.findById(recepteur_id)
    // .select(
    //   "cards"
    // )
    if (!emeteur || !recepteur) {
      return res
        .status(404)
        .json({ message: "Utilisateur introuvable", status: "error" })
    }

    if (emeteur_id == recepteur_id) {
      return res
        .status(400)
        .json({ message: "Paiment impossible", status: "error" })
    }

    // recuperation de la carte
    // if (
    //   emeteur.cards.length == 0 ||
    //   recepteur.cards.length == 0
    // ) {
    //   return res
    //     .status(404)
    //     .json({ message: "aucun carte bancaire trouvé", status: "error" })
    // }

    const emeteurToken = emeteur.safeToken
    const recepteurToken = recepteur.safeToken
    if (!emeteurToken || !recepteurToken) {
      return res.status(404).json({ message: "Rib non trouvée" })
    }

    // formatage de la date d'expiration
    // const expirationDate = new Date(dateExperation)
    // const month = String(expirationDate.getMonth() + 1).padStart(2, "0") // Adding 1 as getMonth() returns 0-indexed month
    // const year = expirationDate.getFullYear()

    // const formattedExpirationDate = `${month}/${year}`

    // const cmi_api = "https://testpayment.cmi.co.ma/fim/api"

    // // Preauthorization
    // const preRequestPayload = `
    //   <CC5Request>
    //     <Name>pogo_api</Name>
    //     <Password>Pogo_api2022</Password>
    //     <ClientId>600003404</ClientId>
    //     <Type>PreAuth</Type>
    //     <Total>${amount}</Total>
    //     <Currency>504</Currency>
    //     <Number>${numCarte}</Number>
    //     <Expires>${formattedExpirationDate}</Expires>
    //     <Cvv2Val>${cvv}</Cvv2Val>
    //   </CC5Request>
    // `
    // const preRequestResponse = await fetch(cmi_api, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/xml",
    //   },
    //   body: preRequestPayload,
    // })

    // const preRequestResponseText = await preRequestResponse.text()

    // const { CC5Response: preResponse } = await parseStringPromise(
    //   preRequestResponseText,
    //   {
    //     explicitArray: false,
    //   }
    // )

    // if (preResponse.Response == "Declined" || preResponse.Response == "Error") {
    //   await new Paiment({
    //     emeteur: emeteur_id,
    //     destinataire: recepteur_id,
    //     cartebancaireEmeteur: emeteurCarte.id,
    //     cartebancaireDestinataire: recepteurCarte.id,
    //     montant: amount,
    //     dateOperation: new Date(),
    //     Etat_de_la_transaction: "échouer",
    //     remarque: preResponse.ErrMsg,
    //   }).save()

    //   return res
    //     .status(400)
    //     .json({ message: preResponse.ErrMsg, status: preResponse.Response })
    // }

    // Postauthorization
    // const postRequestPayload = `
    //   <CC5Request>
    //     <Name>pogo_api</Name>
    //     <Password>Pogo_api2022</Password>
    //     <ClientId>600003404</ClientId>
    //     <Type>PostAuth</Type>
    //     <OrderId>${preResponse.OrderId}</OrderId>
    //   </CC5Request>
    // `
    // const postRequestResponse = await fetch(cmi_api, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/xml",
    //   },
    //   body: preRequestPayload,
    // })
    // const postRequestResponseText = await postRequestResponse.text()

    // const { CC5Response: postResponse } = await parseStringPromise(
    //   postRequestResponseText,
    //   {
    //     explicitArray: false,
    //   }
    // )

    // if (
    //   postResponse.Response == "Declined" ||
    //   postResponse.Response == "Error"
    // ) {
    //   await new Paiment({
    //     emeteur: emeteur_id,
    //     destinataire: recepteur_id,
    //     cartebancaireEmeteur: emeteurCarte.id,
    //     cartebancaireDestinataire: recepteurCarte.id,
    //     montant: amount,
    //     dateOperation: new Date(),
    //     Etat_de_la_transaction: "échouer",
    //     remarque: postResponse.ErrMsg,
    //   }).save()
    //   return res
    //     .status(400)
    //     .json({ message: postResponse.ErrMsg, status: postResponse.Response })
    // }

    // transaction reussite
    const paiment = await new Paiment({
      emeteur: emeteur_id,
      destinataire: recepteur_id,
      montant: amount,
      dateOperation: new Date(),
      Etat_de_la_transaction: "reussie",
    }).save()

    if(paiment){
      let group = await GroupedPaiment.find({status:"en cours",destinataire:recepteur_id})
      if(group.length==0)
        await new GroupedPaiment({
          total:paiment.Etat_de_la_transaction=="reussie"?paiment.montant:0,
          destinataire:recepteur_id,
          paiments:[paiment]
        }).save()
      else{
        const montantBig = new BigNumber(paiment.montant.toString());
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
    const historique = await Paiment.find({ emeteur: id })
      .populate({
        path: "destinataire",
        select: ["nom", "prenom", "telephone", "marchandData"],
      })
      .exec()
    res.status(200).json({ historique })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})
router.get("/groupdetails/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // Get the status query parameter

    // Build the filter based on the status parameter
    let paimentFilter = {};
    if (status) {
      paimentFilter = { "Etat_de_la_transaction": status };
    }
    let paiments = await GroupedPaiment.findById(id)
      .populate({
        path: "paiments",
        match:paimentFilter,
        populate: {
          path: "emeteur",
          select: ["nom", "prenom", "telephone"]
        }
      })
      .populate({
        path: "destinataire",
        select: ["nom", "prenom", "telephone", "marchandData"],
      })
      .exec();

    res.send(paiments);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message, status: "error" });
  }
});
router.get("/historique/:etat", async (req, res) => {
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


router.put("/etat", async (req, res) => {
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
        <form id="pay_form" name="pay_form" method="post" action="https://testpayment.cmi.co.ma/fim/est3Dgate">
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
