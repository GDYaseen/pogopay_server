import { model, Schema } from "mongoose"

const cartebancaireSchema = new Schema({
  maskedCard: { type: String, required: true, unique: true, sparse: true },
  cardLabel: { type: String, required:true},
  isdefault: { type: Boolean, default: false },
  safeToken:{
    type:String,
    required:true,
    unique:true,
    // default:""
  },
  dateExperation:{ type: Date, default:Date.now},
  nomProprietaire:{type:String, default:"temporary name"}

},{timestamps:true})

const marchantSchema = new Schema({
  rib:{ type:String},
  nomMarchand: { type: String },
  RC: { type: String },
  IF: { type: String },
  percent:{ type:Number,min:0,max:100}
})

const utilisateurSchema = new Schema({
  nom: { type: String, required: true },
  photo: {type:String},
  prenom: { type: String, required: true },
  telephone: { type: Number, required: true, unique: true },
  password: { type: String, required: true },
  cards: { type: [cartebancaireSchema], default: [] },
  isBlocked:{type:Boolean, default:false},
  marchandData:{type:marchantSchema,default:{}},
},{timestamps:true})

const Utilisateur = model("Utilisateur", utilisateurSchema)

export default Utilisateur
