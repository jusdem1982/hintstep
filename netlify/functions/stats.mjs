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

    // Simple password protection
    if (body.key !== process.env.DASHBOARD_KEY) {
      return { statusCode: 401, headers: headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    var sk = process.env.STRIPE_SECRET_KEY;
    var authHeader = "Basic " + btoa(sk + ":");

    // Get Stripe customers
    var custResponse = await fetch("https://api.stripe.com/v1/customers?limit=100", {
      headers: { "Authorization": authHeader }
    });
    var custData = await custResponse.json();
    var totalCustomers = custData.data ? custData.data.length : 0;

    // Get active subscriptions
    var subResponse = await fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=100", {
      headers: { "Authorization": authHeader }
    });
    var subData = await subResponse.json();
    var activeSubscriptions = subData.data ? subData.data.length : 0;

    // Calculate MRR
    var mrr = 0;
    if (subData.data) {
      subData.data.forEach(function(sub) {
        if (sub.items && sub.items.data) {
          sub.items.data.forEach(function(item) {
            if (item.price && item.price.unit_amount) {
              mrr += item.price.unit_amount;
            }
          });
        }
      });
    }
    mrr = mrr / 100; // Convert cents to dollars

    // Get recent charges (last 30 days)
    var thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    var chargeResponse = await fetch("https://api.stripe.com/v1/charges?limit=100&created[gte]=" + thirtyDaysAgo, {
      headers: { "Authorization": authHeader }
    });
    var chargeData = await chargeResponse.json();
    var totalRevenue = 0;
    var chargeCount = 0;
    if (chargeData.data) {
      chargeData.data.forEach(function(charge) {
        if (charge.paid && charge.status === "succeeded") {
          totalRevenue += charge.amount;
          chargeCount++;
        }
      });
    }
    totalRevenue = totalRevenue / 100;

    // Get recent events for activity feed
    var eventsResponse = await fetch("https://api.stripe.com/v1/events?limit=20&type=customer.subscription.created", {
      headers: { "Authorization": authHeader }
    });
    var eventsData = await eventsResponse.json();
    var recentEvents = [];
    if (eventsData.data) {
      eventsData.data.forEach(function(ev) {
        recentEvents.push({
          type: ev.type,
          created: ev.created,
          email: ev.data && ev.data.object && ev.data.object.customer ? ev.data.object.customer : ""
        });
      });
    }

    // Get Supabase stats
    var supabaseUrl = process.env.SUPABASE_URL || "";
    var supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";
    var totalUsers = 0;
    var totalSessions = 0;
    var todaySessions = 0;

    if (supabaseUrl && supabaseKey) {
      // Count sessions
      var sessResponse = await fetch(supabaseUrl + "/rest/v1/sessions?select=id,created_at", {
        headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey }
      });
      if (sessResponse.ok) {
        var sessData = await sessResponse.json();
        totalSessions = sessData.length;
        var today = new Date().toISOString().split('T')[0];
        sessData.forEach(function(s) {
          if (s.created_at && s.created_at.startsWith(today)) {
            todaySessions++;
          }
        });
      }
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        stripe: {
          customers: totalCustomers,
          active_subscriptions: activeSubscriptions,
          mrr: mrr,
          revenue_30d: totalRevenue,
          charges_30d: chargeCount
        },
        supabase: {
          total_sessions: totalSessions,
          today_sessions: todaySessions
        },
        recent_events: recentEvents,
        updated_at: new Date().toISOString()
      })
    };
  } catch (error) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: "Something went wrong", details: error.message }) };
  }
}
