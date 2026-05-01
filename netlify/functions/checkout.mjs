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

    // Create Stripe Checkout Session
    var params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("customer_email", email);
    params.append("line_items[0][price]", "price_1TSJS5KPJqlOTMCOWREHvvoq");
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", "https://hintstep.com?payment=success");
    params.append("cancel_url", "https://hintstep.com?payment=cancel");
    params.append("allow_promotion_codes", "true");

    var response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(sk + ":"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    var data = await response.json();
    if (response.ok) {
      return { statusCode: 200, headers: headers, body: JSON.stringify({ url: data.url }) };
    } else {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: data.error ? data.error.message : "Stripe error" }) };
    }
  } catch (error) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "Something went wrong", details: error.message }) };
  }
}
