import ctypes
import sys
import time
from ctypes import wintypes

from PIL import Image

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004


def cursor_hwnd():
    found = None

    def callback(hwnd, _lparam):
        nonlocal found
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, length + 1)
        if buffer.value == "Cursor Agents":
            found = hwnd
        return True

    user32.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)(callback), 0)
    if not found:
        raise RuntimeError("Cursor Agents window not found")
    return found


def window_rect(hwnd):
    rect = wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    return rect.left, rect.top, rect.right, rect.bottom


def screen_point(hwnd, x, y):
    left, top, _right, _bottom = window_rect(hwnd)
    return left + x, top + y


def move(x, y):
    user32.SetCursorPos(x, y)


class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]


def click(hwnd, x, y):
    sx, sy = screen_point(hwnd, x, y)
    move(sx, sy)
    time.sleep(0.08)
    point = POINT()
    user32.GetCursorPos(ctypes.byref(point))
    under = user32.WindowFromPoint(point)
    class_name = ctypes.create_unicode_buffer(256)
    user32.GetClassNameW(under, class_name, 256)
    print(f"cursor={point.x},{point.y} class={class_name.value}")
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


def drag(hwnd, x1, y1, x2, y2):
    sx1, sy1 = screen_point(hwnd, x1, y1)
    sx2, sy2 = screen_point(hwnd, x2, y2)
    move(sx1, sy1)
    time.sleep(0.1)
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    steps = 20
    for step in range(1, steps + 1):
        x = sx1 + (sx2 - sx1) * step // steps
        y = sy1 + (sy2 - sy1) * step // steps
        move(x, y)
        time.sleep(0.02)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


def capture(hwnd, path):
    _left, _top, right, bottom = window_rect(hwnd)
    left, top, _, _ = window_rect(hwnd)
    width, height = right - left, bottom - top
    hdc = user32.GetWindowDC(hwnd)
    mem = gdi32.CreateCompatibleDC(hdc)
    bitmap = gdi32.CreateCompatibleBitmap(hdc, width, height)
    gdi32.SelectObject(mem, bitmap)
    user32.PrintWindow(hwnd, mem, 2)

    class Header(ctypes.Structure):
        _fields_ = [
            ("biSize", ctypes.c_uint32),
            ("biWidth", ctypes.c_int32),
            ("biHeight", ctypes.c_int32),
            ("biPlanes", ctypes.c_uint16),
            ("biBitCount", ctypes.c_uint16),
            ("biCompression", ctypes.c_uint32),
            ("biSizeImage", ctypes.c_uint32),
            ("biXPelsPerMeter", ctypes.c_int32),
            ("biYPelsPerMeter", ctypes.c_int32),
            ("biClrUsed", ctypes.c_uint32),
            ("biClrImportant", ctypes.c_uint32),
        ]

    header = Header()
    header.biSize = ctypes.sizeof(Header)
    header.biWidth = width
    header.biHeight = -height
    header.biPlanes = 1
    header.biBitCount = 32
    buffer = ctypes.create_string_buffer(width * height * 4)
    gdi32.GetDIBits(mem, bitmap, 0, height, buffer, ctypes.byref(header), 0)
    image = Image.frombuffer("RGBA", (width, height), buffer, "raw", "BGRA", 0, 1).convert("RGB")
    image.save(path)
    gdi32.DeleteObject(bitmap)
    gdi32.DeleteDC(mem)
    user32.ReleaseDC(hwnd, hdc)
    return image


def browser_box(image):
    pixels = image.load()
    width, height = image.size
    columns = []
    for x in range(width):
        white = 0
        for y in range(90, height - 30, 10):
            red, green, blue = pixels[x, y]
            if red > 245 and green > 245 and blue > 245:
                white += 1
        if white > 30:
            columns.append(x)
    if not columns:
        raise RuntimeError("browser pane not found")
    return columns[0], 70, columns[-1], height - 8


def main():
    action = sys.argv[1]
    hwnd = cursor_hwnd()
    if action == "widen":
        sx, sy = screen_point(hwnd, 2361, 450)
        move(sx, sy)
        time.sleep(0.4)
        drag(hwnd, 2361, 450, 1000, 450)
        time.sleep(0.4)
        capture(hwnd, r"C:\Users\carlo\AppData\Local\Temp\flow-guide-shots\after-widen.png")
        print("widened")
    elif action == "shot":
        image = capture(hwnd, sys.argv[2])
        box = browser_box(image)
        crop = image.crop(box)
        crop.save(sys.argv[3])
        print(f"box={box} crop={crop.size}")
    elif action == "click":
        click(hwnd, int(sys.argv[2]), int(sys.argv[3]))
        print("clicked")
    else:
        raise SystemExit("unknown action")


if __name__ == "__main__":
    main()
