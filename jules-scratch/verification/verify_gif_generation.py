from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()

    # Log messages from the browser console
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    # Navigate to the local HTML file
    file_path = "file://" + os.path.abspath("index.html")
    page.goto(file_path)

    # Mock the screen capture and manually start recording
    page.evaluate("""() => {
        const video = document.getElementById('preview');
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 100, 100);
        const mockStream = canvas.captureStream();
        video.srcObject = mockStream;
        window.stream = mockStream;
        document.getElementById('startRecordBtn').disabled = false;

        // Directly call startRecording for testing
        document.querySelector('input[value="gif"]').checked = true;
        startRecording();
    }""")

    # Wait for the stop button to be visible
    stop_record_button = page.get_by_role("button", name="Stop Record")
    expect(stop_record_button).to_be_visible()

    # Stop recording after a short delay
    page.wait_for_timeout(1000)
    stop_record_button.click()

    # Wait for the download link to be visible
    download_link = page.get_by_role("link", name="Download File")
    expect(download_link).to_be_visible(timeout=60000)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
