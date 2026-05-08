import { copyTextToClipboard } from "@/src/utils/clipboard";

describe("copyTextToClipboard", () => {
  it("falls back to execCommand when clipboard.writeText rejects", async () => {
    const writeText = jest
      .fn<Promise<void>, [string]>()
      .mockRejectedValue(new DOMException("NotAllowed", "NotAllowedError"));
    const execCommand = jest.fn<boolean, [string]>().mockReturnValue(true);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    await copyTextToClipboard("pk-lf-test");

    expect(writeText).toHaveBeenCalledWith("pk-lf-test");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });
});