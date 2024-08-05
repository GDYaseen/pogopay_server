import express, { json } from "express"
import https from "https"
import fs from "fs"
import { dbConnect } from "./db.js"
import AuthRouter from "./routes/authRoute.js"
import StaffAuthRouter from "./routes/staffAuthRoute.js"
import UserRouter from "./routes/userRoute.js"
import PaimentRouter from "./routes/paimentRoute.js"
import CarteRouter from "./routes/carteRoute.js"
import CMIRouter from "./routes/cmiRoute.js"
import cors from "cors"
import MarchantRoute from "./routes/marchantRoute.js"





const app = express()
const port = 3000

app.use(cors({ origin: "*" }))

// https configuration
//  const privateKey = fs.readFileSync("localhost.decrypted.key")
//  const certificate = fs.readFileSync("localhost.crt")

// const credentials = { key: privateKey,cert: certificate }

// function ensureSecure(req, res, next) {
  // if (req.secure) {
    // Request is already secure (HTTPS)
    // return next()
  // }
  // Redirect to HTTPS version of the URL
  // res.redirect("https://" + req.hostname + req.originalUrl)
// }

// Use the middleware to enforce HTTPS
// app.use(ensureSecure)

app.use(json())
app.use("/auth", AuthRouter)
app.use("/dashboardauth", StaffAuthRouter)
app.use("/user", UserRouter)
app.use("/paiment", PaimentRouter)
app.use("/carte", CarteRouter)
app.use("/cmi", CMIRouter)
app.use("/marchant", MarchantRoute)

dbConnect()
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err))

app.get("/", (req, res) => {
  res.send("hi, the server is active")
})

// const httpsServer = https.createServer(credentials, app)
app.listen(port, () => {
// httpsServer.listen(port, () => {
  console.log(`HTTPS server running on port ${port}`)
})
