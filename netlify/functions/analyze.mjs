const LANG_NAMES = { en:"English", es:"Spanish", zh:"Chinese (Simplified)", vi:"Vietnamese", ar:"Arabic", ko:"Korean", tl:"Tagalog/Filipino", fr:"French", pt:"Portuguese", ht:"Haitian Creole", ru:"Russian", hi:"Hindi", ja:"Japanese", ur:"Urdu", pl:"Polish" };

const SYSTEM_PROMPT = "You are HintStep's AI. Help PARENTS guide children through homework using questions, not answers. You MUST respond with ONLY valid JSON, no markdown code blocks. Keep responses concise. JSON format: {success: true, analysis: {subject, topic, grade_level, problem_count, assignment_type, concepts, estimated_time_minutes}, coaching: {encouragement, steps: [{step_number, title, description, guiding_questions, parent_tip, if_stuck}], wrap_up: {celebration_prompt, preview_prompt}}, cheat_sheet: {quick_explanation, analogy, worked_example: {problem, steps}, common_mistakes: [{mistake, what_to_say}], vocabulary: [{term, definition}]}, video_search_query: \"a short YouTube search query for parents to find helpful tutorial videos on this exact topic and grade level, always in English\"}. Generate exactly 3 coaching steps to keep response short. NEVER include answers. Use Socratic method. Keep all text fields under 2 sentences. If not homework: {success: false, error: description}. RESPOND WITH ONLY THE JSON OBJECT.";

const STATE_STANDARDS = { AL:"Alabama Course of Study", AK:"Alaska Content Standards", AZ:"Arizona Academic Standards", AR:"Arkansas Academic Standards", CA:"California Common Core State Standards", CO:"Colorado Academic Standards", CT:"Connecticut Core Standards", DE:"Delaware Content Standards", FL:"Florida B.E.S.T. Standards", GA:"Georgia Standards of Excellence", HI:"Hawaii Common Core Standards", ID:"Idaho Content Standards", IL:"Illinois Learning Standards", IN:"Indiana Academic Standards", IA:"Iowa Core Standards", KS:"Kansas College and Career Ready Standards", KY:"Kentucky Academic Standards", LA:"Louisiana Student Standards", ME:"Maine Learning Results", MD:"Maryland College and Career-Ready Standards", MA:"Massachusetts Curriculum Frameworks", MI:"Michigan Academic Standards", MN:"Minnesota Academic Standards", MS:"Mississippi College and Career Readiness Standards", MO:"Missouri Learning Standards", MT:"Montana Content Standards", NE:"Nebraska College and Career Ready Standards", NV:"Nevada Academic Content Standards", NH:"New Hampshire College and Career Ready Standards", NJ:"New Jersey Student Learning Standards", NM:"New Mexico Common Core State Standards", NY:"New York Next Generation Learning Standards", NC:"North Carolina Standard Course of Study", ND:"North Dakota Content Standards", OH:"Ohio Learning Standards", OK:"Oklahoma Academic Standards", OR:"Oregon Content Standards", PA:"Pennsylvania Core Standards", RI:"Rhode Island Common Core State Standards", SC:"South Carolina College and Career Ready Standards", SD:"South Dakota Content Standards", TN:"Tennessee Academic Standards", TX:"Texas Essential Knowledge and Skills (TEKS)", UT:"Utah Core Standards", VT:"Vermont Common Core State Standards", VA:"Virginia Standards of Learning (SOL)", WA:"Washington State Learning Standards", WV:"West Virginia College and Career Readiness Standards", WI:"Wisconsin Academic Standards", WY:"Wyoming Content and Performance Standards", DC:"DC Common Core State Standards" };

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
    var userState = body.state || "";
    var stateStandards = STATE_STANDARDS[userState] || "";
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
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4000, system: SYSTEM_PROMPT + (stateStandards ? " This student is in " + userState + ". Align your coaching with " + stateStandards + ". Reference the specific methods and vocabulary used in these standards. Mention the standard alignment in the cheat_sheet quick_explanation." : "") + " Respond in " + langName + ". All text in your JSON response must be in " + langName + " except for JSON keys which stay in English.", messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: body.media_type || "image/jpeg", data: body.image } }, { type: "text", text: "Analyze this homework and create a coaching guide and cheat sheet. Guiding questions only, never answers." }] }] })
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
    // Find first { and last } to extract JSON even with extra text
    var firstBrace = jsonText.indexOf("{");
    var lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }
    var result = JSON.parse(jsonText);
    return { statusCode: 200, headers: headers, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "Something went wrong. Please try again.", details: error.message }) };
  }
}
