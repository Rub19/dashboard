use windows_sys::Win32::Foundation::{GlobalFree, HANDLE};
use windows_sys::Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, GetClipboardData, GetClipboardSequenceNumber, IsClipboardFormatAvailable, OpenClipboard, RegisterClipboardFormatW, SetClipboardData};
use windows_sys::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

const CF_UNICODETEXT: u32 = 13;

pub fn set(text: &str) -> Result<(), String> {
    let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        if OpenClipboard(std::ptr::null_mut()) == 0 {
            return Err("clipboard".into());
        }
        EmptyClipboard();
        let memory = GlobalAlloc(GMEM_MOVEABLE, wide.len() * 2);
        if memory.is_null() {
            CloseClipboard();
            return Err("clipboard".into());
        }
        let target = GlobalLock(memory) as *mut u16;
        if target.is_null() {
            GlobalFree(memory);
            CloseClipboard();
            return Err("clipboard".into());
        }
        std::ptr::copy_nonoverlapping(wide.as_ptr(), target, wide.len());
        GlobalUnlock(memory);
        let placed = SetClipboardData(CF_UNICODETEXT, memory as HANDLE);
        if placed.is_null() {
            GlobalFree(memory);
        }
        CloseClipboard();
        if placed.is_null() { Err("clipboard".into()) } else { Ok(()) }
    }
}

pub fn sequence() -> u32 {
    unsafe { GetClipboardSequenceNumber() }
}

fn private_format(name: &str) -> bool {
    let wide: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        let format = RegisterClipboardFormatW(wide.as_ptr());
        format != 0 && IsClipboardFormatAvailable(format) != 0
    }
}

pub fn shareable_text() -> Option<String> {
    unsafe {
        if IsClipboardFormatAvailable(CF_UNICODETEXT) == 0 || OpenClipboard(std::ptr::null_mut()) == 0 {
            return None;
        }
        let text = if private_format("ExcludeClipboardContentFromMonitorProcessing") || private_format("Clipboard Viewer Ignore") {
            None
        } else {
            let handle = GetClipboardData(CF_UNICODETEXT);
            let source = if handle.is_null() { std::ptr::null_mut() } else { GlobalLock(handle) as *const u16 };
            if source.is_null() {
                None
            } else {
                let mut len = 0;
                while *source.add(len) != 0 && len < 20_000 {
                    len += 1;
                }
                let text = String::from_utf16_lossy(std::slice::from_raw_parts(source, len));
                GlobalUnlock(handle);
                Some(text)
            }
        };
        CloseClipboard();
        text
    }
}
