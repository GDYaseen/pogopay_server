import { model, Schema } from "mongoose"

const cartebancaireSchema = new Schema({
  maskedCard: { type: String, required: true, unique: true, sparse: true },
  cardLabel: { type: String, required:true},
  isdefault: { type: Boolean, default: false },

},{timestamps:true})

const utilisateurSchema = new Schema({
  nom: { type: String, required: true },
  photo: String,
  prenom: { type: String, required: true },
  telephone: { type: Number, required: true, unique: true },
  password: { type: String, required: true },
  safeToken:{//rib
      type:String,
      required:true,
      unique:true
  },
  cards: { type: [cartebancaireSchema], default: [] },
  
},{timestamps:true})

const Utilisateur = model("Utilisateur", utilisateurSchema)

export default Utilisateur
