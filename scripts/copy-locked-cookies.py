import ctypes
import os

kernel32 = ctypes.windll.kernel32
GENERIC_READ = 0x80000000
SHARE = 0x1 | 0x2 | 0x4
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

src = r"C:\Users\carlo\AppData\Roaming\Cursor\Partitions\cursor-browser\Network\Cookies"
dst = r"C:\Users\carlo\AppData\Local\Temp\cursor-cookies-copy"
handle = kernel32.CreateFileW(src, GENERIC_READ, SHARE, None, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, None)
if handle == ctypes.c_void_p(-1).value or handle == -1:
    raise SystemExit(f"open failed {kernel32.GetLastError()}")

size = os.path.getsize(src)
buffer = ctypes.create_string_buffer(size)
read = ctypes.c_ulong(0)
ok = kernel32.ReadFile(handle, buffer, size, ctypes.byref(read), None)
kernel32.CloseHandle(handle)
if not ok:
    raise SystemExit(f"read failed {kernel32.GetLastError()}")
with open(dst, "wb") as output:
    output.write(buffer.raw[: read.value])
print(f"copied={read.value}")
