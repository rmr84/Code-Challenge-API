import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import OpenAI from "openai";
const router = express.Router();

const client = new MongoClient(process.env.DB_CONNECTION);
const collection = client.db(process.env.DB_NAME).collection("entries");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanJsonString(str) {
    return str.replace(/```json\s*|```/g, '').trim();
  }
  
  async function analyzeMood(text) {
    const prompt = `Analyze the mood of the following journal entry and return a JSON object with the levels (0% to 100%) of happiness, sadness, anger, fear, love, anxiety, confusion, surprise, excitement, and calm:\n\n"${text}"\n\nRespond ONLY with JSON.`;
  
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You analyze moods in journal entries." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 150,
      });
    
      const responseTextRaw = completion.choices[0].message.content.trim();
      const responseText = cleanJsonString(responseTextRaw);
     
      return JSON.parse(responseText);
    } catch (error) {
      console.error("OpenAI mood analysis error:", error);
      return null;
    }
  }
  

router.post("/", async (req, res) => {
  const { method, body } = req;
  console.log(`requested via ${method}`);
  console.log("body: ", JSON.stringify(body));

  if (!body || !body.body) {
    return res.status(400).json({ message: "Missing 'body' in request body." });
  }

  try {
    const mood = await analyzeMood(body.body);
    const entryDoc = {
      ...body,
      mood: mood || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await collection.insertOne(entryDoc);

    const insertedEntry = await collection.findOne({
      _id: new ObjectId(insertResult.insertedId),
    });

    res.json(insertedEntry);
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).json({ message: "Failed to create entry." });
  }
});

router.get("/", async (req, res) => {
  const { userId } = req.query;

  try {
    const filter = userId ? { userId } : {};
    const results = await collection.find(filter).toArray();
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(422).json(error);
  }
});

router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { title, body } = req.body;
  
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid entry id." });
    }
  
    if (
      (title === undefined || title === "") &&
      (body === undefined || body === "")
    ) {
      return res.status(400).json({ message: "No fields to update." });
    }
  
    const updateFields = {
      updatedAt: new Date(),
    };
  
    if (title !== undefined && title !== "") {
      updateFields.title = title;
    }
  
    if (body !== undefined && body !== "") {
      updateFields.body = body;
  
      // Re-analyze mood only when body is updated
      const mood = await analyzeMood(body);
      updateFields.mood = mood || {};
    }
  
    try {
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Entry not found." });
      }
  
      const updatedEntry = await collection.findOne({ _id: new ObjectId(id) });
  
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating entry:", error);
      res.status(500).json({ message: "Failed to update entry." });
    }
  });

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid entry id." });
  }

  try {
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Entry not found." });
    }

    res.json({ message: "Entry deleted successfully." });
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ message: "Failed to delete entry." });
  }
});

export default router;
