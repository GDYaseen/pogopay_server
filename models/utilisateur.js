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

})

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

utilisateurSchema.pre('save', function (next) {
  const utilisateur = this;

  // If no card is marked as default and at least one card exists, set the first card to default
  if (utilisateur.cards.length > 0 && !utilisateur.cards.some(card => card.isdefault)) {
    utilisateur.cards[0].isdefault = true;
  }

  next();
});

const Utilisateur = model("Utilisateur", utilisateurSchema)

export default Utilisateur
