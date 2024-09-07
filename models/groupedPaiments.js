import { Schema, Types, model } from "mongoose"
import mongooseFieldEncryption from "mongoose-field-encryption"
import { config } from "dotenv"

config()

const groupedPaimentSchema = new Schema({
  total: { type: Types.Decimal128, required: true ,default:0},
  status: { type: String, required: true ,default:"en cours"},
  codeVirement:{ type:String, default:""},//I'll remove when its safe
  recuVirement: { type: Buffer, default: null },
  destinataire: {
    type: Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true,
  },
  paiments:{ type:[Schema.Types.ObjectId],ref:"Paiment",required:true}
//   remarque: { type: String, required: true },
},{timestamps:true,})//createdAt for first transaction in the bill, updatedat for date of latest transaction

// Apply encryption plugin
groupedPaimentSchema.plugin(mongooseFieldEncryption.fieldEncryption, {
  fields: ["recuVirement"],
  secret: process.env.MONGODB_SECRET_ENCRYPTION_KEY,
  saltGenerator: function (secret) {
    return process.env.MONGODB_SECRET_SALT
  },
})

const GroupedPaiment = model("GroupedPaiment", groupedPaimentSchema)

export default GroupedPaiment
