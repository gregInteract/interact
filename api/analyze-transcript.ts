import { analyzeTranscript } from "../server/geminiService";

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return response.status(405).json({ error: "Method not allowed" });
    }

    const { transcript, campaign } = request.body;

    if (!transcript || !campaign) {
      return response.status(400).json({ error: "Missing transcript or campaign" });
    }

    const result = await analyzeTranscript(transcript, campaign);

    return response.status(200).json(result);
  } catch (error: any) {
    return response.status(500).json({ error: error.message || "Server error" });
  }
}
