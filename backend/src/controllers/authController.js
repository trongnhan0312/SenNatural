const prisma = require("../prismaClient");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const register = async (req, res) => {
  const { username, password, fullName, email, phone, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "username and password required" });
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(400).json({ message: "Username exists" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hash,
      fullName: fullName || username,
      email,
      phone,
      role: role || "STAFF",
    },
  });
  res.json({ id: user.id, username: user.username });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "change_this_secret",
    { expiresIn: "8h" },
  );
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  });
};

const me = async (req, res) => {
  const u = req.user;
  res.json({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
  });
};

module.exports = { register, login, me };
