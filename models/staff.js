import { model, Schema } from "mongoose"

const staffSchema = new Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
},{timestamps:true})

const Staff = model("Staff", staffSchema)

export default Staff
