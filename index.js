import express, { json } from "express"
import https from "https"
import fs from "fs"
import { dbConnect } from "./db.js"
import AuthRouter from "./routes/authRoute.js"
import UserRouter from "./routes/userRoute.js"
import PaimentRouter from "./routes/paimentRoute.js"
import CarteRouter from "./routes/carteRoute.js"
import cors from "cors"

const app = express()
const port = 3000

app.use(cors({ origin: "*" }))

// https configuration
// const privateKey = fs.readFileSync("localhost-key.pem", "utf8")
// const certificate = fs.readFileSync("localhost.pem", "utf8")

// const passphrase = "gaurav"
// const credentials = { key: privateKey, passphrase, cert: certificate }

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
app.use("/user", UserRouter)
app.use("/paiment", PaimentRouter)
app.use("/carte", CarteRouter)

dbConnect()
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err))

app.get("/", async (req, res) => {
  res.send("hi, the server is active")
})

// const httpsServer = https.createServer(credentials, app)
app.listen(port, () => {
  console.log(`HTTP server running on port ${port}`)
})
