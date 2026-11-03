use std::collections::HashMap;
use std::ffi::c_void;
use std::os::windows::ffi::OsStrExt;
use std::sync::Mutex;
use windows_sys::Win32::Foundation::{CloseHandle, BOOL, HWND, INVALID_HANDLE_VALUE, LPARAM, RECT};
use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS};
use windows_sys::Win32::UI::Shell::ExtractIconExW;
use windows_sys::Win32::UI::WindowsAndMessaging::*;

struct Embedded {
    window: usize,
    style: isize,
}

static EMBEDDED: Mutex<Option<HashMap<String, Embedded>>> = Mutex::new(None);

pub fn apply_exe_icon(window: usize) {
    let Ok(exe) = std::env::current_exe() else { return };
    let path: Vec<u16> = exe.as_os_str().encode_wide().chain(Some(0)).collect();
    let (mut large, mut small) = (std::ptr::null_mut(), std::ptr::null_mut());
    unsafe {
        if ExtractIconExW(path.as_ptr(), 0, &mut large, &mut small, 1) == 0 {
            return;
        }
        if !large.is_null() {
            SendMessageW(window as HWND, WM_SETICON, ICON_BIG as usize, large as isize);
        }
        if !small.is_null() {
            SendMessageW(window as HWND, WM_SETICON, ICON_SMALL as usize, small as isize);
        }
    }
}

pub fn same_exe(found: &str, wanted: &str) -> bool {
    found.eq_ignore_ascii_case(wanted)
}

pub fn is_helper_title(title: &str) -> bool {
    title.is_empty() || title.ends_with("-siw")
}

fn process_ids(exe: &str) -> Vec<u32> {
    let mut ids = Vec::new();
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return ids;
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        let mut more = Process32FirstW(snapshot, &mut entry);
        while more != 0 {
            let end = entry.szExeFile.iter().position(|c| *c == 0).unwrap_or(entry.szExeFile.len());
            if same_exe(&String::from_utf16_lossy(&entry.szExeFile[..end]), exe) {
                ids.push(entry.th32ProcessID);
            }
            more = Process32NextW(snapshot, &mut entry);
        }
        CloseHandle(snapshot);
    }
    ids
}

struct Search {
    ids: Vec<u32>,
    best: Option<(i64, usize)>,
}

unsafe extern "system" fn visit(window: HWND, data: LPARAM) -> BOOL {
    let search = &mut *(data as *mut Search);
    let mut id = 0;
    GetWindowThreadProcessId(window, &mut id);
    if !search.ids.contains(&id) || !GetWindow(window, GW_OWNER).is_null() {
        return 1;
    }
    let mut title = [0u16; 256];
    let length = GetWindowTextW(window, title.as_mut_ptr(), 256).max(0) as usize;
    if is_helper_title(&String::from_utf16_lossy(&title[..length])) {
        return 1;
    }
    let mut rect: RECT = std::mem::zeroed();
    GetWindowRect(window, &mut rect);
    let area = i64::from(rect.right - rect.left) * i64::from(rect.bottom - rect.top);
    if search.best.is_none_or(|(best, _)| area > best) {
        search.best = Some((area, window as usize));
    }
    1
}

pub fn find_window(exe: &str) -> Option<usize> {
    let ids = process_ids(exe);
    if ids.is_empty() {
        return None;
    }
    let mut search = Search { ids, best: None };
    unsafe { EnumWindows(Some(visit), &mut search as *mut Search as LPARAM) };
    search.best.map(|(_, window)| window)
}

const WINDOW_FRAME: isize = (WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU) as isize;

pub fn attach(id: &str, window: usize, parent: usize, x: i32, y: i32, width: i32, height: i32) {
    let handle = window as HWND;
    unsafe {
        let style = GetWindowLongPtrW(handle, GWL_STYLE);
        let mut embedded = EMBEDDED.lock().unwrap();
        let table = embedded.get_or_insert_with(HashMap::new);
        let original = table.get(id).map_or(style, |old| if old.window == window { old.style } else { style });
        table.insert(id.to_string(), Embedded { window, style: original });
        ShowWindow(handle, SW_RESTORE);
        SetWindowLongPtrW(handle, GWL_STYLE, (original & !WINDOW_FRAME) | (WS_CHILD | WS_VISIBLE) as isize);
        SetParent(handle, parent as *mut c_void);
        SetWindowPos(handle, HWND_TOP, x, y, width, height, SWP_FRAMECHANGED | SWP_SHOWWINDOW);
    }
}

fn window_of(id: &str) -> Option<usize> {
    EMBEDDED.lock().unwrap().as_ref()?.get(id).map(|item| item.window)
}

pub fn resize(id: &str, x: i32, y: i32, width: i32, height: i32) {
    if let Some(window) = window_of(id) {
        unsafe { SetWindowPos(window as HWND, HWND_TOP, x, y, width, height, SWP_SHOWWINDOW) };
    }
}

pub fn reopen(id: &str, x: i32, y: i32, width: i32, height: i32) -> bool {
    if !alive(id) {
        return false;
    }
    resize(id, x, y, width, height);
    true
}

pub fn hide(id: &str) {
    if let Some(window) = window_of(id) {
        unsafe { ShowWindow(window as HWND, SW_HIDE) };
    }
}

pub fn alive(id: &str) -> bool {
    let Some(window) = window_of(id) else { return false };
    unsafe {
        let handle = window as HWND;
        if IsWindow(handle) == 0 {
            EMBEDDED.lock().unwrap().as_mut().map(|table| table.remove(id));
            return false;
        }
        if IsIconic(handle) != 0 {
            ShowWindow(handle, SW_RESTORE);
        }
    }
    true
}

pub fn detach(id: &str) {
    let Some(item) = EMBEDDED.lock().unwrap().as_mut().and_then(|table| table.remove(id)) else { return };
    let handle = item.window as HWND;
    unsafe {
        if IsWindow(handle) == 0 {
            return;
        }
        SetParent(handle, std::ptr::null_mut());
        SetWindowLongPtrW(handle, GWL_STYLE, item.style);
        SetWindowPos(handle, HWND_TOP, 120, 120, 1320, 860, SWP_FRAMECHANGED | SWP_SHOWWINDOW);
        ShowWindow(handle, SW_SHOW);
        SetForegroundWindow(handle);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exe_names_ignore_case() {
        assert!(same_exe("Ethra.EXE", "ethra.exe"));
        assert!(!same_exe("ethra2.exe", "ethra.exe"));
    }

    #[test]
    fn helper_windows_are_skipped() {
        assert!(is_helper_title("dev.ethone.hdv-siw"));
        assert!(is_helper_title(""));
        assert!(!is_helper_title("HDV Tracker"));
    }
}
