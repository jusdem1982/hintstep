// This function serves the Supabase config to the front-end
// The anon key is safe to expose — Row Level Security protects the data

export async function handler() {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseKey: process.env.SUPABASE_ANON_KEY || "",
    }),
  };
}
