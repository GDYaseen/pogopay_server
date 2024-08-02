import { model, Schema } from "mongoose"

const cartebancaireSchema = new Schema({
  maskedCard: { type: String, required: true, unique: true, sparse: true },
  cardLabel: { type: String, required:true},
  isdefault: { type: Boolean, default: false },

  dateExperation:{ type: Date, default:Date.now},
  nomProprietaire:{type:String, default:"temporary name"}

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
  isBlocked:{type:Boolean, default:false}
},{timestamps:true})

const Utilisateur = model("Utilisateur", utilisateurSchema)

export default Utilisateur
