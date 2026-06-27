import { useState } from "react";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { connectMongo, Announcement } from "../db.mongo.server.js";

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const text = formData.get("announcementText");

  // Step 1: Get the real numeric Shop ID from Shopify
  const shopResponse = await admin.graphql(
    `#graphql
    query {
      shop {
        id
      }
    }`
  );
  const shopData = await shopResponse.json();
  const shopGid = shopData.data.shop.id; // e.g. "gid://shopify/Shop/12345678"

  // Step 2: Save to Shopify Metafield using the real shop GID
  const response = await admin.graphql(
    `#graphql
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            namespace: "my_app",
            key: "announcement",
            value: text,
            type: "single_line_text_field",
            ownerId: shopGid,
          },
        ],
      },
    }
  );

  const responseData = await response.json();
  const errors = responseData.data?.metafieldsSet?.userErrors;

  if (errors && errors.length > 0) {
    return { success: false, error: errors[0].message };
  }
  // Save to MongoDB
    await connectMongo();
    await Announcement.create({
      shop: session.shop,
      text: text,
    });

  return { success: true, text };
  
}

export default function Index() {
  const fetcher = useFetcher();
  const [announcementText, setAnnouncementText] = useState("");

  const isLoading = fetcher.state === "submitting";
  const result = fetcher.data;

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>
        Announcement Manager
      </h1>

      {result?.success && (
        <div style={{
          background: "#d4edda", border: "1px solid #c3e6cb",
          borderRadius: "6px", padding: "12px", marginBottom: "16px", color: "#155724"
        }}>
          ✅ Saved! Your announcement: "{result.text}"
        </div>
      )}

      {result?.error && (
        <div style={{
          background: "#f8d7da", border: "1px solid #f5c6cb",
          borderRadius: "6px", padding: "12px", marginBottom: "16px", color: "#721c24"
        }}>
          ❌ Error: {result.error}
        </div>
      )}

      <div style={{
        background: "white", border: "1px solid #ddd",
        borderRadius: "8px", padding: "24px"
      }}>
        <fetcher.Form method="post">
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>
              Announcement Text
            </label>
            <input
              name="announcementText"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. Sale 50% Off this weekend!"
              style={{
                width: "100%", padding: "10px 12px", fontSize: "14px",
                border: "1px solid #ccc", borderRadius: "6px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: "#008060", color: "white", border: "none",
              padding: "10px 20px", borderRadius: "6px", fontSize: "14px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? "Saving..." : "Save Announcement"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}