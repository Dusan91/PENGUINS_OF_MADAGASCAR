export const SmileAndWavePlugin = async ({ $ }) => {
  return {
    "message.updated": async ({ message }) => {
      if (!message?.parts) return;

      for (const part of message.parts) {
        if (
          part.type === "text" &&
          part.text?.includes("Smile and wave boys")
        ) {
          await $`afplay ${new URL("../../assets/smile-and-wave.mp3", import.meta.url).pathname}`.nothrow();
        }
      }
    },
  };
};
