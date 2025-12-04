import sys
import time

class MyInterceptor:
    def __init__(self, original):
        self.original = original

    def write(self, message):
        # Intercept the message
        if "ERROR" in message:
            self.original.write(f"[HOOK DETECTED] {message}")
        else:
            self.original.write(message)

    def flush(self):
        # Force the original stream to write immediately
        self.original.flush()

# Replace stderr globally
sys.stderr = MyInterceptor(sys.stderr)

# Example usage
print("This is normal output.")  # Goes to stdout
sys.stderr.write("This is an ERROR message.\n")  # Intercepted
sys.stderr.write("Another line without error.\n")  # Printed normally
sys.stderr.flush()  # Ensures everything appears immediately

# Simulate updates
for i in range(5):
    sys.stderr.write(f"Progress: {i}/5\r")  # Update same line
    sys.stderr.flush()
    time.sleep(1)
print("\nDone!")
