import fetch from "node-fetch";
import fs from "fs";

const POST_URL =
  "https://wan-ai-wan2-2-animate.hf.space/gradio_api/call/predict";

const IMAGE_URL =
  "https://raw.githubusercontent.com/Pa1mekala37/rawCont/main/pari.jpeg";

const VIDEO_URL =
  "https://raw.githubusercontent.com/Pa1mekala37/rawCont/main/Video-995.mp4";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 15000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runOnce(attempt) {
  console.log(`\n🚀 Attempt ${attempt}`);

  const postRes = await fetch(POST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        { path: IMAGE_URL, meta: { _type: "gradio.FileData" } },
        { path: VIDEO_URL, meta: { _type: "gradio.FileData" } },
        "wan2.2-animate-move",
        "wan-pro"
      ]
    })
  });

  const postText = await postRes.text();
  const match = postText.match(/"event_id":"([^"]+)"/);

  if (!match) throw new Error("No EVENT_ID returned");

  const EVENT_ID = match[1];
  console.log("✅ EVENT_ID:", EVENT_ID);

  const streamRes = await fetch(`${POST_URL}/${EVENT_ID}`);
  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const events = chunk.split("\n\n").filter(Boolean);

    for (const e of events) {
      if (e.includes("event: error")) {
        throw new Error("Gradio error event");
      }

      if (e.includes("event: data") && e.includes("path")) {
        console.log("\n🎉 SUCCESS:");
        console.log(e);

        fs.writeFileSync("result.txt", e);
        return e;
      }
    }
  }

  throw new Error("Stream ended without success");
}

async function runWithRetry() {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      const result = await runOnce(i);
      console.log("\n✅ Job completed successfully");
      return result;
    } catch (err) {
      console.error(`❌ Attempt ${i} failed:`, err.message);

      if (i === MAX_RETRIES) {
        console.error("\n🛑 Max retries reached");
        process.exit(1);
      }

      console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...\n`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

runWithRetry();
