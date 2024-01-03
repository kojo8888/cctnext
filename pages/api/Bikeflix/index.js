import prisma from "lib/prisma";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const newBikeflixEntry = await prisma.Bikeflix.create({
        data: {
          // Define the properties of your new entry here
          // For example:
          title: "New Bikeflix Entry",
          description: "This is a new entry for Bikeflix",
          // Add other properties as needed
          id: "7",
          name: "Ultimate Garmin EDGE Map Screen Setup for Road/Gravel/MTB",
          url: "https://www.youtube.com/watch?v=uYUq3479gc4&t=30s",
          description:
            "My ultimate Garmin EDGE Cycling GPS Map Page layout that I find extremely useful on road, gravel, and out on the MTB. This video will explain the configuration and ConnectIQ add-ons I've used on both the EDGE 1040 and EDGE 1030.",
          rating: "3",
          category: "GPS",
          isFeatured: "true",
          // created_at      DateTime  @default(now())
        },
      });

      res.status(201).json(newBikeflixEntry);
    } catch (error) {
      console.error("Error creating new entry:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else if (req.method === "GET") {
    const Bikeflix = await prisma.Bikeflix.findMany();
    res.status(200).json(Bikeflix);
  } else {
    res.status(405).send({ message: "Method Not Allowed" });
  }
}
