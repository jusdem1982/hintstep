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
    var email = body.email;
    if (email) {
      // good
    } else {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: "Email required" }) };
    }

    var sk = process.env.STRIPE_SECRET_KEY;
    if (sk) {
      // good
    } else {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "Stripe not configured" }) };
    }

    var authHeader = "Basic " + btoa(sk + ":");

    // Look up customer by email
    var custResponse = await fetch("https://api.stripe.com/v1/customers?email=" + encodeURIComponent(email) + "&limit=1", {
      headers: { "Authorization": authHeader }
    });
    var custData = await custResponse.json();

    if (custData.data && custData.data.length > 0) {
      var customerId = custData.data[0].id;

      // Check for active subscriptions
      var subResponse = await fetch("https://api.stripe.com/v1/subscriptions?customer=" + customerId + "&status=active&limit=1", {
        headers: { "Authorization": authHeader }
      });
      var subData = await subResponse.json();

      if (subData.data && subData.data.length > 0) {
        return { statusCode: 200, headers: headers, body: JSON.stringify({ subscribed: true }) };
      }
    }

    return { statusCode: 200, headers: headers, body: JSON.stringify({ subscribed: false }) };
  } catch (error) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "Something went wrong", details: error.message }) };
  }
}
