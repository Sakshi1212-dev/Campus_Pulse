const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Event = require("../models/Event");

// =====================================
// AI-POWERED RECOMMENDATIONS (via Groq — free)
// GET /api/ai-recommendations/:userId
// =====================================
//
// Sends the student's skills + every event's title/
// category/description to a free Llama model hosted on
// Groq, and asks it to score how relevant each event is
// (0-100) with a one-line reason. This understands
// meaning, not just exact keyword overlap — e.g. it can
// tell that "ML" relates to "Machine Learning Bootcamp"
// even without a shared substring.
//
// Groq's API is OpenAI-compatible, so we just use fetch()
// directly — no extra SDK package needed.

router.get("/:userId", async (req, res) => {

    try {

        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const skills = user.skills || [];

        if (skills.length === 0) {
            return res.status(200).json([]);
        }

        const events = await Event.find();

        if (events.length === 0) {
            return res.status(200).json([]);
        }

        // Only send what the model needs — keeps the prompt small
        const eventsForPrompt = events.map(event => ({
            id: event._id.toString(),
            title: event.title,
            category: event.category,
            description: event.description
        }));

        const prompt = `You are a recommendation engine for a college events app.

Student's skills: ${skills.join(", ")}

Events (JSON array):
${JSON.stringify(eventsForPrompt)}

For each event, judge how relevant it is to the student's skills based on
genuine meaning, not just exact word overlap (e.g. "ML" relates to "Machine
Learning", "coding" relates to "Python" or "web development").

Respond with ONLY a JSON array, no other text, no markdown code fences.
Exact format:
[{"id":"<event id>","score":<integer 0-100>,"reason":"<one short sentence, under 12 words>"}]

Only include events with score > 0. Sort by score descending.`;

        const groqResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.3
                })
            }
        );

        if (!groqResponse.ok) {

            const errorBody = await groqResponse.text();

            console.error("Groq API error:", groqResponse.status, errorBody);

            return res.status(502).json({
                message: "AI service returned an error"
            });

        }

        const groqData = await groqResponse.json();

        const rawText =
            groqData.choices?.[0]?.message?.content || "";

        const cleanedText = rawText
            .replace(/```json|```/g, "")
            .trim();

        let scoredList;

        try {

            scoredList = JSON.parse(cleanedText);

        } catch (parseError) {

            console.error("AI response was not valid JSON:", rawText);

            return res.status(500).json({
                message: "AI response could not be parsed"
            });

        }

        // Attach full event documents to each scored result
        const eventMap = {};

        events.forEach(event => {
            eventMap[event._id.toString()] = event;
        });

        const results = scoredList
            .filter(item => eventMap[item.id])
            .map(item => ({
                event: eventMap[item.id],
                score: item.score,
                reason: item.reason
            }));

        res.status(200).json(results);

    } catch (error) {

        console.error("AI RECOMMENDATION ERROR:", error);

        res.status(500).json({
            message: "Failed to generate AI recommendations",
            error: error.message
        });

    }

});


module.exports = router;