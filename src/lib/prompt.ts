/**
 * Prompt the user with a yes/no question (responds on keypress)
 */
export async function confirm(question: string): Promise<boolean> {
  // Write the question
  process.stdout.write(`${question} (y/n): `);

  return new Promise((resolve) => {
    // Check if stdin is a TTY (interactive terminal)
    if (!process.stdin.isTTY) {
      // Fall back to reading a line for non-interactive input
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.once("data", (data) => {
        process.stdin.pause();
        const normalized = data.toString().trim().toLowerCase();
        resolve(normalized === "y" || normalized === "yes");
      });
      return;
    }

    // Enable raw mode to get immediate keypress
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onKeypress = (key: string) => {
      // Handle Ctrl+C
      if (key === "\u0003") {
        process.stdout.write("\n");
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onKeypress);
        process.exit(130);
      }

      const lower = key.toLowerCase();

      if (lower === "y") {
        process.stdout.write("y\n");
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onKeypress);
        resolve(true);
      } else if (lower === "n") {
        process.stdout.write("n\n");
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onKeypress);
        resolve(false);
      }
      // Ignore any other keys
    };

    process.stdin.on("data", onKeypress);
  });
}
