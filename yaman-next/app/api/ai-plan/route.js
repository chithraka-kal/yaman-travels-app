import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { from, destination, days, budget, interests, model } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ message: "API Key is missing on server." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Default to Flash if no model provided, otherwise use the user's choice
    const selectedModelName = model || "gemini-2.0-flash";

    const aiModel = genAI.getGenerativeModel({ 
      model: selectedModelName, 
      generationConfig: { responseMimeType: "application/json" } 
    });

    const prompt = `
      You are an expert travel planner for Sri Lanka.
      Plan a ${days}-day trip to ${destination} starting from ${from}.
      Budget Level: ${budget}
      Interests: ${interests}
      
      Structure your response strictly as this JSON:
      {
        "tripTitle": "Catchy Trip Name",
        "summary": "2 sentence summary",
        "routeInfo": { 
           "distance": "approx distance", 
           "travelTime": "approx time",
           "startCoordinates": [lat, lng],
           "endCoordinates": [lat, lng]
        },
        "itinerary": [
          {
            "day": 1,
            "theme": "Day Theme",
            "activities": [
              { "time": "Morning", "title": "Place", "description": "Short info", "coordinates": [lat, lng] }
            ]
          }
        ],
        "suggestions": [
           { "title": "Activity", "rating": 4.8, "price": "$50", "image": "placeholder", "description": "..." }
        ]
      }
    `;

    // Generate Content
    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    
    // Parse the text
    const text = response.text();
    let plan;
    try {
        plan = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        return NextResponse.json({ message: "AI returned invalid JSON. Try again." }, { status: 500 });
    }

    // GET REAL TOKEN COUNT (Input + Output)
    // response.usageMetadata contains { promptTokenCount, candidatesTokenCount, totalTokenCount }
    const usage = response.usageMetadata;
    const totalTokens = usage ? usage.totalTokenCount : 0;

    console.log(`Model: ${selectedModelName} | Usage: ${totalTokens} Tokens`);

    return NextResponse.json({ 
        ...plan, 
        tokenUsage: totalTokens, // This is the REAL usage
        usedModel: selectedModelName 
    });

  } catch (error) {
    console.error("AI Plan Error:", error);
    // Return the specific error message to display on frontend
    return NextResponse.json({ message: error.message || "Failed to generate plan." }, { status: 500 });
  }
}