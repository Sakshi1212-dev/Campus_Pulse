const express = require("express");
const router = express.Router();

const User = require("../models/User");
const TeamRequest = require("../models/TeamRequest");

// =====================================
// AI TEAMMATE MATCHING (via Groq — free)
// GET /api/ai-teammates/:userId
// =====================================
//
// Scores every open teammate request against the logged-in
// user's own skills, so a student can see "this hackathon
// team is 92% aligned with what I bring." Same approach as
// the AI event recommendations — genuine meaning-based
// matching via a free Groq model, not just keyword overlap.

router.get("/:userId", async (req, res) => {

    try {

        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const mySkills = user.skills || [];

        if (mySkills.length === 0) {
            return res.status(200).json([]);
        }

        const allRequests = await TeamRequest.find()
            .populate("userId", "name college course skills role");

        // Don't match a student against their own post
        const otherRequests = allRequests.filter(request =>
            request.userId && request.userId._id.toString() !== req.params.userId
        );

        if (otherRequests.length === 0) {
            return res.status(200).json([]);
        }

        const requestsForPrompt = otherRequests.map(request => ({
            id: request._id.toString(),
            projectTitle: request.projectTitle,
            description: request.description,
            skillsNeeded: request.skillsNeeded
        }));

        const prompt = `You are a teammate-matching engine for a college events app.

This student's own skills: ${mySkills.join(", ")}

Open teammate requests posted by other students (JSON array):
${JSON.stringify(requestsForPrompt)}

For each request, judge how well this student's skills fit what that team
needs, based on genuine meaning, not just exact word overlap (e.g. "ML"
relates to "Machine Learning", "coding" relates to "Python" or "web
development").

Respond with ONLY a JSON array, no other text, no markdown code fences.
Exact format:
[{"id":"<request id>","score":<integer 0-100>,"reason":"<one short sentence, under 12 words>"}]

Only include requests with score > 0. Sort by score descending.`;

        const groqResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.3
                })
            }
        );

        if (!groqResponse.ok) {

            const errorBody = await groqResponse.text();

            console.error("Groq API error (teammates):", groqResponse.status, errorBody);

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

            console.error("AI teammate response was not valid JSON:", rawText);

            return res.status(500).json({
                message: "AI response could not be parsed"
            });

        }

        const requestMap = {};

        otherRequests.forEach(request => {
            requestMap[request._id.toString()] = request;
        });

        const results = scoredList
            .filter(item => requestMap[item.id])
            .map(item => ({
                request: requestMap[item.id],
                score: item.score,
                reason: item.reason
            }));

        res.status(200).json(results);

    } catch (error) {

        console.error("AI TEAMMATE MATCH ERROR:", error);

        res.status(500).json({
            message: "Failed to generate AI teammate matches",
            error: error.message
        });

    }

});


module.exports = router;