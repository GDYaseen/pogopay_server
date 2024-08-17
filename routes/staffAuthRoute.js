import { Router } from "express"
import Staff from "../models/staff.js"
import { generateDashboardAccessToken } from "../middleware.js"
import bcrypt from "bcrypt"
import { body, validationResult } from "express-validator"

const router = Router()

// data validator for login
const loginValidator = [
  body("username").trim().notEmpty(),
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

// login

router.post("/login", loginValidator, async (req, res) => {
  try {
    const { username, password } = req.body
    const staff = await Staff.findOne({ username: username })
    if (!staff) {
      return res.status(400).send({ message: "staff not found", status: "error" })
    }
    if (!bcrypt.compareSync(password, staff.password)) {
      return res.status(400).send({ message: "password incorrect", status: "error" })
    }

    const token = generateDashboardAccessToken(staff.id)
    
    res.send({
      message: "Staff logged in successfully",
      status: "success",
      data: {
        token:token,
        staff,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message, status: "error" })
  }
})

// data validator for register

// const registreValidator = [
//   body("nom").trim().notEmpty(),
//   body("prenom").trim().notEmpty(),
//   body("username").trim().notEmpty().isLength({ min: 5 }),
//   body("password").trim().notEmpty().isLength({ min: 8 }),
//   body("confirmePassword")
//     .trim()
//     .notEmpty()
//     .isLength({ min: 8 })
//     .custom((value, { req }) => {
//       if (value !== req.body.password) {
//         throw new Error("Password confirmation does not match password")
//       }
//       return true
//     }),
//   (req, res, next) => {
//     const errors = validationResult(req)
//     if (!errors.isEmpty()) {
//       return res
//         .status(400)
//         .json({ message: "Validation failed", errors: errors.array() })
//     }
//     next()
//   },
// ]

// // register

// router.post("/register", registreValidator, async (req, res) => {
//   try {
//     const { nom, prenom, username, password} = req.body
//     const cryptedPassword = await bcrypt.hash(password, 10)
//     const staff = new Staff({
//       fullName:`${prenom} ${nom}`,
//       username,
//       password: cryptedPassword,
//     })
//     await staff.save()
//     res.send({ message: "Staff created successfully", status: "success" })
//   } catch (error) {
//     res.status(500).json({ message: error.message, status: "error" })
//     console.error(error)
//   }
// })

export default router
