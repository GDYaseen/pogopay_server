import { Schema, Types, model } from "mongoose"

const groupedPaimentSchema = new Schema({
  total: { type: Types.Decimal128, required: true ,default:0},
  status: { type: String, required: true ,default:"en cours"},
  codeVirement:{ type:String, default:""},
  destinataire: {
    type: Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
  paiments:{ type:[Schema.Types.ObjectId],ref:"Paiment",required:true}
//   remarque: { type: String, required: true },
},{timestamps:true,})//createdAt for first transaction in the bill, updatedat for date of latest transaction



const GroupedPaiment = model("GroupedPaiment", groupedPaimentSchema)

export default GroupedPaiment
