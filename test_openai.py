import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Clear any proxy settings
for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
    if key in os.environ:
        print(f"Removing {key}: {os.environ[key]}")
        del os.environ[key]

print("Testing OpenAI client initialization...")

try:
    from openai import OpenAI
    api_key = os.environ.get('OPENAI_API_KEY')
    print(f"API Key found: {'Yes' if api_key else 'No'}")
    print(f"API Key length: {len(api_key) if api_key else 0}")
    
    client = OpenAI(api_key=api_key)
    print("✓ Client created successfully!")
    
    # Try a simple test
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Say 'test successful'"}],
        max_tokens=10
    )
    print(f"✓ API call successful: {response.choices[0].message.content}")
    
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()