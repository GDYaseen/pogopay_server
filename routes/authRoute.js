import { Router } from "express"
import Utilisateur from "../models/utilisateur.js"
import { generateAccessToken } from "../middleware.js"
import bcrypt, { compare } from "bcrypt"
import { body, validationResult } from "express-validator"
import Staff from "../models/staff.js"

const router = Router()


// data validator for login(mobile app)
const loginValidator = [
  body("login").trim().notEmpty(),
  body("password").trim().notEmpty().isLength({ min: 8 }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errors.array() })
    }
    next()
  },
]







// login for mobile app 

router.post("/login", loginValidator, async (req, res) => {
  try {
    const { login, password } = req.body
    const user = await Utilisateur.findOne({ telephone: login }).select(
      "-cards"
    )
    if (!user) {
      return res.status(400).send({ message: "User not found", status: "error" })
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).send({ message: "password incorrect", status: "error" })
    }
    if (!user.marchandData.nomMarchand && !user.marchandData.IF && !user.marchandData.RC && !user.marchandData.percent && !user.marchandData.rib)
      user.marchandData = undefined

    if (user.isBlocked) {
      console.log(`User ${user.id} is blocked`)
      res.status(400).json({
        message: `Error: This account is blocked`,
        status: "error",
      })
      return
    }
    const token = generateAccessToken(user.id)
    
    res.json({
      message: "User logged in successfully",
      status: "success",
      data: {
        token,
        user,
      },
    })
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ message: error.message, status: "error" })
  }
})

// data validator for register

const registreValidator = [
  body("nom").trim().notEmpty(),
  body("prenom").trim().notEmpty(),
  body("telephone").trim().notEmpty().isLength({ min: 10 }),
  body("password").trim().notEmpty().isLength({ min: 8 }),
  body("confirmePassword")
    .trim()
    .notEmpty()
    .isLength({ min: 8 })
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password")
      }
      return true
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errors.array() })
    }
    next()
  },
]

// register

router.post("/registre", registreValidator, async (req, res) => {
  try {
    // console.log(req.body)
    const { nom, prenom, telephone, password} = req.body
    const cryptedPassword = await bcrypt.hash(password, 10)
    const user = await new Utilisateur({
      nom,
      prenom,
      telephone,
      password: cryptedPassword,
      // safeToken:rib
    }).save()
    res.send({ message: "User created successfully", idToUse:user._id ,status: "success" })
  } catch (error) {
    res.status(500).json({ message: error.message, status: "error" })
    console.error(error)
  }
})

// phone validation
// router.post("/phoneValidation", async (req, res) => {

// })

export default router
