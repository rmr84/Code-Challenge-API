import express from "express";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const router = express.Router();

const client = new MongoClient(process.env.DB_CONNECTION);
const collection = client.db(process.env.DB_NAME).collection("users");

router.post("/", async (req, res) => {
  const { method, body } = req;

  console.log(`requested via ${method}`);
  console.log("body: ", JSON.stringify(body));

  await collection
    .insertOne({ ...body, createdAt: new Date(), updatedAt: new Date() })
    .then(async (result) => {
      await collection
        .findOne({ _id: new ObjectId(result.insertedId) })
        .then((result) => res.json(result))
        .catch((error) => res.status(422).json(error));
    })
    .catch((error) => {
      console.log("error: ", JSON.stringify(error));
      res.status(422).json(error);
    });
});

router.get("/", async (req, res) => {
  const { method, query } = req;

  console.log(`requested via ${method}`);
  console.log("query: ", JSON.stringify(query));

  await collection
  .aggregate([
    {
      $match: { token: query.fb_token },
    },
  ])
  .toArray()
  .then((results) => res.json(results[0]))
  .catch((error) => {
    console.log("error: ", JSON.stringify(error));
    res.status(422).json(error);
  });
});

router.delete("/:id", async (req, res) => {
    const { method, params } = req;
    const { id } = params;
  
    console.log(`requested via ${method}`);
    console.log("params: ", JSON.stringify(params));
  
    try {
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
  
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

export default router;
