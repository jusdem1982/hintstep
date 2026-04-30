const LANG_NAMES = { en:"English", es:"Spanish", zh:"Chinese (Simplified)", vi:"Vietnamese", ar:"Arabic", ko:"Korean", tl:"Tagalog/Filipino", fr:"French", pt:"Portuguese", ht:"Haitian Creole", ru:"Russian", hi:"Hindi", ja:"Japanese", ur:"Urdu", pl:"Polish" };

const SYSTEM_PROMPT = "You are the AI engine for HintStep. You help PARENTS guide children through homework using questions, not answers. Analyze the photo and respond with valid JSON containing: success, analysis (subject, topic, grade_level, problem_count, assignment_type, concepts, estimated_time_minutes), coaching (encouragement, steps with step_number/title/description/guiding_questions/parent_tip/if_stuck, wrap_up with celebration_prompt/preview_prompt), and cheat_sheet (quick_explanation, analogy, worked_example, common_mistakes, vocabulary). Generate 3-5 coaching steps. NEVER include answers. Use the Socratic method. If not homework or too blurry respond with {success: false, error: description}.";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" } };
  }
  if (event.httpMethod === "POST") {
    // continue below
  } else {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  var headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  try {
    var body = JSON.parse(event.body);
    var lang = body.language || "en";
    var langName = LANG_NAMES[lang] || "English";
    if (body.image) {
      // good, continue
    } else {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: "No image provided" }) };
    }
    var apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      // good, continue
    } else {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "API key not configured." }) };
    }
    var apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, system: SYSTEM_PROMPT + " Respond in " + langName + ". All text in your JSON response must be in " + langName + " except for JSON keys which stay in English.", messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: body.media_type || "image/jpeg", data: body.image } }, { type: "text", text: "Analyze this homework and create a coaching guide and cheat sheet. Guiding questions only, never answers." }] }] })
    });
    var apiData = await apiResponse.json();
    if (apiResponse.ok) {
      // good, continue
    } else {
      return { statusCode: apiResponse.status, headers: headers, body: JSON.stringify({ error: apiData.error ? apiData.error.message : "API error" }) };
    }
    var textContent = null;
    for (var i = 0; i < apiData.content.length; i++) { if (apiData.content[i].type === "text") { textContent = apiData.content[i]; break; } }
    if (textContent) {
      // good, continue
    } else {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "No response from AI" }) };
    }
    var jsonText = textContent.text.trim();
    var codeBlockRegex = new RegExp("```(?:json)?\\s*([\\s\\S]*?)```");
    var jsonMatch = jsonText.match(codeBlockRegex);
    if (jsonMatch) { jsonText = jsonMatch[1].trim(); }
    var result = JSON.parse(jsonText);
    return { statusCode: 200, headers: headers, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "Something went wrong. Please try again.", details: error.message }) };
  }
}
