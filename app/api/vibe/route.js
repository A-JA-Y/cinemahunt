import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize the Google Generative AI client with the API key from .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
    // Get the movie plot from the incoming request
    const { plot } = await request.json();

    if (!plot) {
        return NextResponse.json({ error: "Plot summary is required." }, { status: 400 });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Analyze the following movie plot. Describe the "vibe" of the movie at the beginning, middle, and end.
      For each part (Beginning, Middle, End), provide a short "vibe" title (2-3 words, e.g., "Hopeful Start", "Dark Twist", "Action-Packed Climax") and a one-sentence description.
      Return the response ONLY as a valid JSON object with the keys "beginning", "middle", and "end". Each key should have an object with "vibe" and "description" as its properties. Do not include any other text or markdown formatting.

      Plot: "${plot}"
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json|```/g, '').trim();

        // The response from the AI is a JSON string, so we parse it
        const vibeData = JSON.parse(cleanedText);
        // const cleanedText = text.replace(/```json|```/g, '').trim();

        return NextResponse.json(vibeData);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return NextResponse.json({ error: "Failed to generate vibe from AI." }, { status: 500 });
    }
}