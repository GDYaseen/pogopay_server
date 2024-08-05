import { model, Schema } from "mongoose"

const marchantSchema = new Schema({
  user: { type: Schema.Types.ObjectId,ref:"Utilisateur",unique:true,required: true },
  logo: { type:String}, //base64
  nomMarchant: { type: String },
  RC: { type: String },
  IF: { type: String },
  
},{timestamps:true})

const Marchant = model("Marchant", marchantSchema)

export default Marchant
