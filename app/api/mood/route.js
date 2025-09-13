import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  const { mood } = await request.json();

  if (!mood) {
    return NextResponse.json({ error: "Mood is required." }, { status: 400 });
  }

  try {
    // === Step 1: Ask Gemini for a movie title ===
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Suggest one single, classic, and well-known movie title that fits the mood "${mood}". Return only the movie title and nothing else.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const movieTitle = response.text().trim();

    // === Step 2: Use the title to get details from OMDb ===
    const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
    const omdbUrl = `https://www.omdbapi.com/?t=${encodeURIComponent(movieTitle)}&apikey=${apiKey}`;
    
    const omdbRes = await fetch(omdbUrl);
    const movieData = await omdbRes.json();

    if (movieData.Response === "False") {
      return NextResponse.json({ error: "Could not find details for the suggested movie." }, { status: 404 });
    }

    // === Step 3: Return the full movie data to the client ===
    return NextResponse.json(movieData);

  } catch (error) {
    console.error("Error in mood suggestion API:", error);
    return NextResponse.json({ error: "Failed to generate suggestion." }, { status: 500 });
  }
}