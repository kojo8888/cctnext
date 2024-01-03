import prisma from "lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).send({ message: "Method Not Allowed" });
    return;
  }

  const Bikeflix = await prisma.Bikeflix.findMany();
  res.status(200).json(Bikeflix);
}
