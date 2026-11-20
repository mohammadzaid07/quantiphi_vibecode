import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if not api_key:
    raise ValueError("OpenAI API key missing in .env")

try:
    client = OpenAI(api_key=api_key)

    response = client.responses.create(
        model=model,
        input="Reply: OpenAI API connected successfully!"
    )

    print(response.output_text)

except Exception as error:
    print("OpenAI connection failed:", error)
