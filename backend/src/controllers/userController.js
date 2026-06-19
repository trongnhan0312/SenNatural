const prisma = require("../prismaClient");
const bcrypt = require("bcrypt");

const list = async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ data: users });
};

const getOne = async (req, res) => {
  const id = Number(req.params.id);
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  });
  if (!u) return res.status(404).json({ message: "Not found" });
  res.json(u);
};

const create = async (req, res) => {
  const { username, password, fullName, email, phone, role } = req.body;
  const hash = await bcrypt.hash(password || "123456", 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hash,
      fullName,
      email,
      phone,
      role: role || "STAFF",
    },
  });
  res.json({ id: user.id, username: user.username });
};

const update = async (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  const u = await prisma.user.update({ where: { id }, data });
  res.json({ id: u.id, username: u.username });
};

const remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  res.json({ success: true });
};

module.exports = { list, getOne, create, update, remove };
