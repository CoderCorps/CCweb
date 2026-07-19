import asyncio
import websockets
from websockets.exceptions import ConnectionClosed

async def test():
    try:
        async with websockets.connect("ws://localhost:8000/ws/rooms/1?token=faketoken") as ws:
            print("Connected!")
            await ws.recv() # wait for message or close
    except ConnectionClosed as e:
        print(f"Closed: code={e.code}, reason={e.reason}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test())
